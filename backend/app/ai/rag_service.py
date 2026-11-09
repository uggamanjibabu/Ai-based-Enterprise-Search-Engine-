import os
import re
import json
import logging
import requests
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.entities import Document, DocumentChunk
from app.ai.vector_store import VectorStore
from app.ai.keyword_search import tokenize

logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self):
        self.vector_store = VectorStore()

    def answer_question(
        self,
        db: Session,
        question: str,
        user_role: str,
        document_id: Optional[int] = None,
        conversation_history: Optional[List[dict]] = None
    ) -> Dict[str, Any]:
        """
        Executes RAG workflow:
        1. Query Embedding
        2. FAISS Retrieval
        3. Relevant Chunks Selection
        4. Answer Generation (OpenAI / Gemini / Local Extractive Fallback)
        5. Source Citations & Follow-up Questions
        """
        # Step 1: Document filtering by role & document_id
        doc_query = db.query(Document).filter(Document.status == "indexed")
        if user_role == "employee":
            doc_query = doc_query.filter(Document.access_level.in_(["public", "internal"]))
        elif user_role == "manager":
            doc_query = doc_query.filter(Document.access_level.in_(["public", "internal", "restricted"]))

        if document_id:
            doc_query = doc_query.filter(Document.id == document_id)

        accessible_docs = doc_query.all()
        doc_map = {d.id: d for d in accessible_docs}
        allowed_doc_ids = list(doc_map.keys())

        if not allowed_doc_ids:
            return {
                "question": question,
                "answer": "No accessible documents found matching this query or document ID.",
                "provider_used": "system_guard",
                "confidence_score": 0.0,
                "citations": [],
                "suggested_followups": []
            }

        # Step 2: Retrieve top relevant chunks from FAISS
        retrieved_chunks = self.vector_store.search_semantic(
            query=question,
            top_k=5,
            doc_ids=allowed_doc_ids
        )

        if not retrieved_chunks or retrieved_chunks[0]["semantic_score"] < 0.25:
            return {
                "question": question,
                "answer": f"I could not find sufficient information in the accessible enterprise documents to answer '{question}' with high confidence.",
                "provider_used": "extractive_synthesizer",
                "confidence_score": 0.1,
                "citations": [],
                "suggested_followups": [
                    "Can you rephrase your question?",
                    "What documents are available in this department?",
                    "What are the main company guidelines?"
                ]
            }

        # Format citations
        citations = []
        for rc in retrieved_chunks:
            doc = doc_map.get(rc["document_id"])
            if not doc:
                continue
            citations.append({
                "document_id": doc.id,
                "document_title": doc.title,
                "chunk_index": rc["chunk_index"],
                "passage": rc["content"],
                "relevance_score": rc["semantic_score"]
            })

        # Step 3: Try LLM APIs if keys are set, otherwise use local extractive synthesizer
        if settings.GEMINI_API_KEY:
            try:
                answer = self._generate_gemini_answer(question, citations)
                if answer:
                    return {
                        "question": question,
                        "answer": answer,
                        "provider_used": "Gemini API",
                        "confidence_score": citations[0]["relevance_score"],
                        "citations": citations[:3],
                        "suggested_followups": self._generate_followups(question, citations)
                    }
            except Exception as e:
                logger.warning(f"Gemini API call failed, falling back to extractive: {e}")

        if settings.OPENAI_API_KEY:
            try:
                answer = self._generate_openai_answer(question, citations)
                if answer:
                    return {
                        "question": question,
                        "answer": answer,
                        "provider_used": "OpenAI API",
                        "confidence_score": citations[0]["relevance_score"],
                        "citations": citations[:3],
                        "suggested_followups": self._generate_followups(question, citations)
                    }
            except Exception as e:
                logger.warning(f"OpenAI API call failed, falling back to extractive: {e}")

        # Step 4: Local High-Precision Extractive Synthesizer (Works 100% offline without any paid keys)
        extractive_answer = self._synthesize_extractive_answer(question, citations)
        
        return {
            "question": question,
            "answer": extractive_answer,
            "provider_used": "Extractive Synthesizer (Local Offline Engine)",
            "confidence_score": citations[0]["relevance_score"],
            "citations": citations[:3],
            "suggested_followups": self._generate_followups(question, citations)
        }

    def _synthesize_extractive_answer(self, question: str, citations: List[Dict[str, Any]]) -> str:
        """
        Synthesizes an answer using the most relevant sentences from the top retrieved passages.
        Strictly preserves factual accuracy without hallucinating.
        """
        q_tokens = set(tokenize(question))
        candidate_sentences = []

        for citation in citations[:3]:
            doc_title = citation["document_title"]
            passage = citation["passage"]
            # Split into sentences
            sentences = re.split(r"(?<=[.!?])\s+", passage)
            for s in sentences:
                s_clean = s.strip()
                if len(s_clean) < 25:
                    continue
                s_tokens = set(tokenize(s_clean))
                overlap = len(q_tokens.intersection(s_tokens))
                score = overlap / (len(q_tokens) + 1e-5)
                candidate_sentences.append({
                    "sentence": s_clean,
                    "overlap": overlap,
                    "score": score,
                    "source": doc_title
                })

        # Sort candidate sentences by token overlap and score
        candidate_sentences.sort(key=lambda x: (x["overlap"], x["score"]), reverse=True)

        selected = []
        seen = set()
        for cand in candidate_sentences:
            low = cand["sentence"].lower()
            if low not in seen and cand["overlap"] > 0:
                seen.add(low)
                selected.append(cand)
            if len(selected) >= 3:
                break

        if not selected:
            # Fall back to the top passage lead paragraph
            top_passage = citations[0]["passage"]
            lead = top_passage.split("\n\n")[0].strip()
            return f"According to **{citations[0]['document_title']}**:\n\n\"{lead}\""

        # Format into clean synthesis
        primary_source = citations[0]["document_title"]
        answer_parts = [f"Based on the enterprise records in **{primary_source}**:"]
        
        for item in selected:
            answer_parts.append(f"• {item['sentence']}")

        answer_parts.append(f"\n*(Extracted directly from verified document passages; confidence: {int(citations[0]['relevance_score'] * 100)}%)*")
        return "\n".join(answer_parts)

    def _generate_gemini_answer(self, question: str, citations: List[Dict[str, Any]]) -> Optional[str]:
        context = "\n\n".join([f"Source [{c['document_title']}]: {c['passage']}" for c in citations[:3]])
        prompt = f"""You are NEXUS AI Enterprise Search Assistant.
Answer the user's question accurately using ONLY the provided document context.
Do not invent information. If the answer cannot be fully found in the text, state that clearly.
Always cite the source document.

Context:
{context}

Question: {question}

Answer:"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        resp = requests.post(url, json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        return None

    def _generate_openai_answer(self, question: str, citations: List[Dict[str, Any]]) -> Optional[str]:
        context = "\n\n".join([f"Source [{c['document_title']}]: {c['passage']}" for c in citations[:3]])
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "system",
                    "content": "You are NEXUS AI, an enterprise knowledge search assistant. Answer questions truthfully and concisely using only the given context. Cite document names."
                },
                {
                    "role": "user",
                    "content": f"Context:\n{context}\n\nQuestion: {question}"
                }
            ],
            "temperature": 0.2
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
        return None

    def _generate_followups(self, question: str, citations: List[Dict[str, Any]]) -> List[str]:
        doc_titles = list(set([c["document_title"] for c in citations]))
        followups = [
            f"What other regulations are specified in {doc_titles[0]}?",
            f"Who is responsible for compliance in {doc_titles[0]}?",
            "What are the key policy deadlines or requirements?"
        ]
        return followups[:3]


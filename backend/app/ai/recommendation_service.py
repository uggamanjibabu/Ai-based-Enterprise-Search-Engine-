import logging
import numpy as np
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import Document
from app.ai.vector_store import VectorStore
from app.ai.keyword_search import tokenize

logger = logging.getLogger(__name__)

class RecommendationService:
    def __init__(self):
        self.vector_store = VectorStore()

    def get_recommendations(
        self,
        db: Session,
        document_id: int,
        user_role: str,
        limit: int = 5
    ) -> Dict[str, Any]:
        """
        Recommends documents similar to the target document.
        Uses document mean embedding vector similarity + keyword overlap.
        """
        target_doc = db.query(Document).filter(Document.id == document_id).first()
        if not target_doc:
            return {"source_document_id": document_id, "source_title": "Unknown", "recommendations": []}

        target_vec = self.vector_store.get_document_vector(document_id)
        
        # Filter accessible documents
        query = db.query(Document).filter(Document.status == "indexed", Document.id != document_id)
        if user_role == "employee":
            query = query.filter(Document.access_level.in_(["public", "internal"]))
        elif user_role == "manager":
            query = query.filter(Document.access_level.in_(["public", "internal", "restricted"]))

        accessible_docs = query.all()
        if not accessible_docs:
            return {"source_document_id": document_id, "source_title": target_doc.title, "recommendations": []}

        target_tokens = set(tokenize(f"{target_doc.title} {target_doc.summary or ''}"))

        scored_candidates = []
        for doc in accessible_docs:
            sim_score = 0.0
            if target_vec is not None:
                doc_vec = self.vector_store.get_document_vector(doc.id)
                if doc_vec is not None:
                    # Dot product of normalized vectors
                    raw_sim = float(np.dot(target_vec, doc_vec.T)[0][0])
                    sim_score = max(0.0, min(1.0, (raw_sim + 1.0) / 2.0))

            # Common topics/terms
            doc_tokens = set(tokenize(f"{doc.title} {doc.summary or ''}"))
            common_words = list(target_tokens.intersection(doc_tokens))[:4]

            # Boost slightly if same category
            if doc.category_id and target_doc.category_id and doc.category_id == target_doc.category_id:
                sim_score = min(1.0, sim_score + 0.1)

            scored_candidates.append({
                "document_id": doc.id,
                "title": doc.title,
                "original_filename": doc.original_filename,
                "file_type": doc.file_type,
                "category_name": doc.category.name if doc.category else "General",
                "similarity_score": round(sim_score, 4),
                "common_topics": common_words,
                "summary": doc.summary[:200] if doc.summary else "",
            })

        scored_candidates.sort(key=lambda x: x["similarity_score"], reverse=True)

        return {
            "source_document_id": document_id,
            "source_title": target_doc.title,
            "recommendations": scored_candidates[:limit]
        }


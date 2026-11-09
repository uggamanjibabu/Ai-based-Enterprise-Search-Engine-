import re
import logging
from typing import List, Dict, Any, Optional
from rank_bm25 import BM25Okapi

logger = logging.getLogger(__name__)

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", 
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", 
    "by", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", 
    "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him", 
    "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me", 
    "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only", 
    "or", "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she", "should", 
    "so", "some", "such", "t", "than", "that", "the", "their", "theirs", "them", "themselves", 
    "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until", 
    "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", 
    "why", "will", "with", "you", "your", "yours", "yourself", "yourselves"
}

def tokenize(text: str) -> List[str]:
    words = re.findall(r"\b[a-zA-Z0-9_\-\.]{2,}\b", text.lower())
    return [w for w in words if w not in STOPWORDS]

class KeywordSearchEngine:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(KeywordSearchEngine, cls).__new__(cls)
            cls._instance.bm25 = None
            cls._instance.corpus_chunks = []
        return cls._instance

    def rebuild_index(self, chunks: List[Dict[str, Any]]):
        """
        Takes list of chunks: [{document_id, chunk_id, chunk_index, content}]
        Builds BM25Okapi index.
        """
        self.corpus_chunks = chunks
        if not chunks:
            self.bm25 = None
            return

        tokenized_corpus = [tokenize(c["content"]) for c in chunks]
        # Avoid empty token lists for BM25
        valid_corpus = [tokens if tokens else ["empty_placeholder"] for tokens in tokenized_corpus]
        self.bm25 = BM25Okapi(valid_corpus)
        logger.info(f"Built BM25 index with {len(chunks)} chunks.")

    def search(self, query: str, top_k: int = 15, doc_ids: Optional[List[int]] = None) -> List[Dict[str, Any]]:
        if not self.bm25 or not self.corpus_chunks:
            return []

        query_tokens = tokenize(query)
        if not query_tokens:
            return []

        raw_scores = self.bm25.get_scores(query_tokens)
        max_score = float(max(raw_scores)) if len(raw_scores) > 0 and max(raw_scores) > 0 else 1.0

        scored_results = []
        for i, score in enumerate(raw_scores):
            if score <= 0.01:
                continue
            chunk = self.corpus_chunks[i]
            if doc_ids is not None and chunk["document_id"] not in doc_ids:
                continue

            # Normalize to 0.0 - 1.0
            norm_score = min(1.0, float(score / max_score))

            scored_results.append({
                "document_id": chunk["document_id"],
                "chunk_id": chunk.get("chunk_id"),
                "chunk_index": chunk.get("chunk_index"),
                "content": chunk["content"],
                "keyword_score": round(norm_score, 4),
            })

        scored_results.sort(key=lambda x: x["keyword_score"], reverse=True)
        return scored_results[:top_k]

    @staticmethod
    def extract_highlights(query: str, text: str, max_highlights: int = 3) -> List[str]:
        query_terms = [t for t in tokenize(query) if len(t) > 2]
        if not query_terms:
            return [text[:160] + "..."] if len(text) > 160 else [text]

        sentences = re.split(r"(?<=[.!?])\s+", text)
        highlighted = []

        for sent in sentences:
            sent_lower = sent.lower()
            if any(term in sent_lower for term in query_terms):
                # Highlight matching terms
                formatted = sent
                for term in query_terms:
                    pattern = re.compile(rf"\b({re.escape(term)})\b", re.IGNORECASE)
                    formatted = pattern.sub(r"<mark class='bg-electric-500/20 text-electric-400 font-semibold px-1 rounded'>\1</mark>", formatted)
                highlighted.append(formatted.strip())
                if len(highlighted) >= max_highlights:
                    break

        if not highlighted:
            return [text[:160] + "..."] if len(text) > 160 else [text]

        return highlighted


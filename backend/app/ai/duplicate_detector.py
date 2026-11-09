import logging
import numpy as np
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.entities import Document
from app.ai.vector_store import VectorStore

logger = logging.getLogger(__name__)

class DuplicateDetector:
    def __init__(self):
        self.vector_store = VectorStore()

    def check_exact_duplicate(self, db: Session, file_hash: str) -> Optional[Document]:
        """
        Detects if an identical file exists using SHA-256 hash.
        """
        return db.query(Document).filter(
            Document.file_hash_sha256 == file_hash,
            Document.status != "failed"
        ).first()

    def check_semantic_duplicate(
        self,
        db: Session,
        new_doc_chunks: List[str],
        similarity_threshold: float = 0.88
    ) -> Optional[Dict[str, Any]]:
        """
        Checks if the content is semantically near-identical to an existing document.
        Computes mean embedding and compares against existing documents.
        """
        if not new_doc_chunks:
            return None

        # Compute average embedding of new document
        embeddings = self.vector_store.embed_texts(new_doc_chunks[:10])
        new_mean = np.mean(embeddings, axis=0, keepdims=True)

        indexed_docs = db.query(Document).filter(Document.status == "indexed").all()
        for doc in indexed_docs:
            doc_vec = self.vector_store.get_document_vector(doc.id)
            if doc_vec is not None:
                # Cosine similarity between normalized vectors is dot product
                sim = float(np.dot(new_mean, doc_vec.T)[0][0])
                if sim >= similarity_threshold:
                    return {
                        "is_duplicate": True,
                        "similar_document_id": doc.id,
                        "similar_document_title": doc.title,
                        "similarity_score": round(sim, 4),
                    }

        return None


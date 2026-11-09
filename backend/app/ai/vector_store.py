import os
import json
import logging
import numpy as np
import faiss
from typing import List, Dict, Any, Tuple, Optional
from sentence_transformers import SentenceTransformer
from app.core.config import settings

logger = logging.getLogger(__name__)

class VectorStore:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(VectorStore, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        self.index_path = os.path.join(settings.VECTOR_STORE_DIR, "nexus_faiss.index")
        self.metadata_path = os.path.join(settings.VECTOR_STORE_DIR, "chunk_metadata.json")
        self.model_name = settings.EMBEDDING_MODEL_NAME
        self.dimension = 384  # all-MiniLM-L6-v2 dimension
        
        logger.info(f"Loading embedding model: {self.model_name}")
        # Allow offline mode if model is cached locally
        try:
            self.model = SentenceTransformer(self.model_name, local_files_only=True)
        except Exception:
            self.model = SentenceTransformer(self.model_name)
        
        # metadata maps faiss_id (int) -> dict(document_id, chunk_id, chunk_index, content)
        self.metadata: Dict[int, Dict[str, Any]] = {}
        self.index = None
        self._load_or_create_index()
        self._initialized = True

    def _load_or_create_index(self):
        if os.path.exists(self.index_path) and os.path.exists(self.metadata_path):
            try:
                self.index = faiss.read_index(self.index_path)
                with open(self.metadata_path, "r", encoding="utf-8") as f:
                    # JSON keys are strings, convert back to int
                    raw_meta = json.load(f)
                    self.metadata = {int(k): v for k, v in raw_meta.items()}
                logger.info(f"Loaded existing FAISS index with {self.index.ntotal} vectors.")
                return
            except Exception as e:
                logger.error(f"Failed to load FAISS index from disk: {e}. Creating new index.")

        # Create Cosine Similarity index using Inner Product with normalized vectors
        self.index = faiss.IndexFlatIP(self.dimension)
        self.metadata = {}
        self._save_index()

    def _save_index(self):
        try:
            faiss.write_index(self.index, self.index_path)
            with open(self.metadata_path, "w", encoding="utf-8") as f:
                json.dump(self.metadata, f, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to save FAISS index: {e}")

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.empty((0, self.dimension), dtype=np.float32)
        embeddings = self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        # Normalize for Inner Product (cosine similarity)
        faiss.normalize_L2(embeddings)
        return embeddings.astype(np.float32)

    def embed_query(self, query: str) -> np.ndarray:
        embedding = self.model.encode([query], convert_to_numpy=True, show_progress_bar=False)
        faiss.normalize_L2(embedding)
        return embedding.astype(np.float32)

    def add_chunks(self, document_id: int, chunks: List[Dict[str, Any]]) -> List[int]:
        """
        Takes chunks = [{'chunk_id': int, 'chunk_index': int, 'content': str}]
        Generates embeddings and adds to FAISS. Returns assigned vector ids.
        """
        if not chunks:
            return []

        texts = [c["content"] for c in chunks]
        embeddings = self.embed_texts(texts)

        start_id = self.index.ntotal
        self.index.add(embeddings)

        assigned_ids = []
        for i, chunk in enumerate(chunks):
            v_id = start_id + i
            assigned_ids.append(v_id)
            self.metadata[v_id] = {
                "document_id": document_id,
                "chunk_id": chunk.get("chunk_id"),
                "chunk_index": chunk.get("chunk_index"),
                "content": chunk["content"],
            }

        self._save_index()
        return assigned_ids

    def search_semantic(self, query: str, top_k: int = 15, doc_ids: Optional[List[int]] = None) -> List[Dict[str, Any]]:
        """
        Performs semantic vector search with FAISS.
        Returns list of {document_id, chunk_id, chunk_index, content, semantic_score}
        """
        if self.index.ntotal == 0:
            return []

        query_vec = self.embed_query(query)
        # Search more candidates to allow document-level filtering
        k_search = min(max(top_k * 3, 20), self.index.ntotal)
        scores, indices = self.index.search(query_vec, k_search)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:
                continue
            meta = self.metadata.get(int(idx))
            if not meta:
                continue
            
            if doc_ids is not None and meta["document_id"] not in doc_ids:
                continue

            # Inner Product on normalized vectors is cosine similarity [-1.0, 1.0]
            # Convert to [0.0, 1.0] scale
            norm_score = max(0.0, min(1.0, float((score + 1.0) / 2.0)))

            results.append({
                "faiss_id": int(idx),
                "document_id": meta["document_id"],
                "chunk_id": meta.get("chunk_id"),
                "chunk_index": meta.get("chunk_index"),
                "content": meta["content"],
                "semantic_score": round(norm_score, 4)
            })

            if len(results) >= top_k:
                break

        return results

    def remove_document(self, document_id: int):
        """
        Rebuilds FAISS index excluding the deleted document's vectors.
        """
        remaining_items = [
            (v_id, meta) for v_id, meta in self.metadata.items()
            if meta["document_id"] != document_id
        ]

        # If empty or index reset needed
        new_index = faiss.IndexFlatIP(self.dimension)
        new_meta = {}

        if remaining_items:
            texts = [item[1]["content"] for item in remaining_items]
            embeddings = self.embed_texts(texts)
            new_index.add(embeddings)
            for new_id, (_, meta) in enumerate(remaining_items):
                new_meta[new_id] = meta

        self.index = new_index
        self.metadata = new_meta
        self._save_index()

    def get_document_vector(self, document_id: int) -> Optional[np.ndarray]:
        """
        Returns average embedding vector for a document across its chunks.
        """
        doc_meta = [meta for meta in self.metadata.values() if meta["document_id"] == document_id]
        if not doc_meta:
            return None
        texts = [m["content"] for m in doc_meta]
        embeddings = self.embed_texts(texts)
        mean_vec = np.mean(embeddings, axis=0, keepdims=True)
        faiss.normalize_L2(mean_vec)
        return mean_vec

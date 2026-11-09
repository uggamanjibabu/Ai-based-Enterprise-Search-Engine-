import time
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.entities import Document, DocumentCategory, SearchHistory, SearchAnalytics
from app.ai.vector_store import VectorStore
from app.ai.keyword_search import KeywordSearchEngine

logger = logging.getLogger(__name__)

class HybridSearchEngine:
    def __init__(self):
        self.vector_store = VectorStore()
        self.keyword_engine = KeywordSearchEngine()

    def search(
        self,
        db: Session,
        query: str,
        user_id: int,
        user_role: str,
        search_type: str = "hybrid",
        file_type: Optional[str] = None,
        category_id: Optional[int] = None,
        access_level: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 10,
        offset: int = 0,
        keyword_weight: float = 0.4,
        semantic_weight: float = 0.6,
    ) -> Dict[str, Any]:
        start_time = time.time()

        # Step 1: Filter accessible documents according to user role and request filters
        query_doc = db.query(Document).filter(Document.status == "indexed")
        
        # Role-based access control filtering:
        # admin can see all
        # manager can see public, internal, restricted
        # employee can see public, internal
        if user_role == "employee":
            query_doc = query_doc.filter(Document.access_level.in_(["public", "internal"]))
        elif user_role == "manager":
            query_doc = query_doc.filter(Document.access_level.in_(["public", "internal", "restricted"]))

        if file_type:
            query_doc = query_doc.filter(Document.file_type == file_type.lower())
        if category_id:
            query_doc = query_doc.filter(Document.category_id == category_id)
        if access_level:
            query_doc = query_doc.filter(Document.access_level == access_level.lower())
        if date_from:
            query_doc = query_doc.filter(Document.created_at >= date_from)
        if date_to:
            query_doc = query_doc.filter(Document.created_at <= date_to)

        accessible_docs = query_doc.all()
        doc_map = {d.id: d for d in accessible_docs}
        allowed_doc_ids = list(doc_map.keys())

        if not allowed_doc_ids:
            exec_time = round((time.time() - start_time) * 1000, 2)
            self._record_search(db, user_id, query, search_type, 0, exec_time, is_gap=True)
            return {
                "query": query,
                "search_type": search_type,
                "total_results": 0,
                "execution_time_ms": exec_time,
                "results": [],
                "is_knowledge_gap": True,
            }

        # Step 2: Perform keyword & semantic searches
        k_results = []
        s_results = []

        if search_type in ("keyword", "hybrid"):
            k_results = self.keyword_engine.search(query, top_k=50, doc_ids=allowed_doc_ids)

        if search_type in ("semantic", "hybrid"):
            s_results = self.vector_store.search_semantic(query, top_k=50, doc_ids=allowed_doc_ids)

        # Step 3: Combine scores at chunk level
        # Key: (document_id, chunk_index)
        combined_chunks: Dict[tuple, Dict[str, Any]] = {}

        for k in k_results:
            key = (k["document_id"], k["chunk_index"])
            combined_chunks[key] = {
                "document_id": k["document_id"],
                "chunk_id": k["chunk_id"],
                "chunk_index": k["chunk_index"],
                "content": k["content"],
                "keyword_score": k["keyword_score"],
                "semantic_score": 0.0,
            }

        for s in s_results:
            key = (s["document_id"], s["chunk_index"])
            if key in combined_chunks:
                combined_chunks[key]["semantic_score"] = s["semantic_score"]
            else:
                combined_chunks[key] = {
                    "document_id": s["document_id"],
                    "chunk_id": s.get("chunk_id"),
                    "chunk_index": s["chunk_index"],
                    "content": s["content"],
                    "keyword_score": 0.0,
                    "semantic_score": s["semantic_score"],
                }

        # Calculate final combined scores
        scored_chunks = []
        for key, item in combined_chunks.items():
            k_score = item["keyword_score"]
            s_score = item["semantic_score"]

            if search_type == "keyword":
                relevance = k_score
            elif search_type == "semantic":
                relevance = s_score
            else:
                # Normalize weights
                total_w = keyword_weight + semantic_weight
                w_k = (keyword_weight / total_w) if total_w > 0 else 0.4
                w_s = (semantic_weight / total_w) if total_w > 0 else 0.6
                relevance = (w_k * k_score) + (w_s * s_score)

            relevance = round(min(1.0, max(0.0, relevance)), 4)
            item["relevance_score"] = relevance
            scored_chunks.append(item)

        scored_chunks.sort(key=lambda x: x["relevance_score"], reverse=True)

        # Step 4: Group by document to present best chunk per document
        seen_docs = set()
        doc_level_results = []

        for item in scored_chunks:
            doc_id = item["document_id"]
            if doc_id not in seen_docs:
                doc = doc_map.get(doc_id)
                if not doc:
                    continue
                seen_docs.add(doc_id)

                highlights = KeywordSearchEngine.extract_highlights(query, item["content"])

                doc_level_results.append({
                    "document_id": doc.id,
                    "title": doc.title,
                    "filename": doc.filename,
                    "file_type": doc.file_type,
                    "category_name": doc.category.name if doc.category else "Uncategorized",
                    "category_color": doc.category.color if doc.category else "#64748b",
                    "snippet": item["content"][:320] + ("..." if len(item["content"]) > 320 else ""),
                    "chunk_index": item["chunk_index"],
                    "relevance_score": item["relevance_score"],
                    "keyword_score": item["keyword_score"],
                    "semantic_score": item["semantic_score"],
                    "match_highlights": highlights,
                    "created_at": doc.created_at,
                    "access_level": doc.access_level,
                })

        total_results = len(doc_level_results)
        paged_results = doc_level_results[offset : offset + limit]

        exec_time = round((time.time() - start_time) * 1000, 2)
        top_score = doc_level_results[0]["relevance_score"] if doc_level_results else 0.0
        is_knowledge_gap = total_results == 0 or top_score < 0.20

        # Record search history & analytics
        self._record_search(
            db, user_id, query, search_type, total_results, exec_time, is_gap=is_knowledge_gap,
            top_doc_id=doc_level_results[0]["document_id"] if doc_level_results else None
        )

        return {
            "query": query,
            "search_type": search_type,
            "total_results": total_results,
            "execution_time_ms": exec_time,
            "results": paged_results,
            "is_knowledge_gap": is_knowledge_gap,
        }

    def _record_search(
        self,
        db: Session,
        user_id: int,
        query: str,
        search_type: str,
        total_results: int,
        exec_time: float,
        is_gap: bool,
        top_doc_id: Optional[int] = None
    ):
        try:
            history = SearchHistory(
                user_id=user_id,
                query=query,
                search_type=search_type,
                total_results=total_results,
                execution_time_ms=exec_time,
            )
            db.add(history)

            analytics = SearchAnalytics(
                query=query,
                user_id=user_id,
                results_count=total_results,
                top_document_id=top_doc_id,
                is_knowledge_gap=is_gap,
                search_latency_ms=exec_time,
            )
            db.add(analytics)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Error recording search history: {e}")


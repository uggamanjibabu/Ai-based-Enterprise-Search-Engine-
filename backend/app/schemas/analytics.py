from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class CategoryStat(BaseModel):
    category_id: Optional[int]
    name: str
    color: str
    count: int

class SearchTrendItem(BaseModel):
    date: str
    count: int
    avg_latency_ms: float

class KnowledgeGapItem(BaseModel):
    query: str
    frequency: int
    last_searched: datetime
    suggested_action: str

class TopDocumentStat(BaseModel):
    id: int
    title: str
    file_type: str
    views: int
    downloads: int

class DashboardStatsResponse(BaseModel):
    total_documents: int
    total_searches: int
    average_response_time_ms: float
    total_users: int
    indexed_documents_count: int
    failed_documents_count: int
    processing_documents_count: int
    recent_searches: List[str]
    top_searched_topics: List[dict]
    categories: List[CategoryStat]
    search_activity_weekly: List[SearchTrendItem]
    knowledge_gap_count: int


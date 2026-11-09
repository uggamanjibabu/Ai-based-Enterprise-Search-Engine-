from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class SearchFilters(BaseModel):
    file_type: Optional[str] = None
    category_id: Optional[int] = None
    access_level: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Search query string")
    search_type: str = Field("hybrid", description="keyword | semantic | hybrid")
    filters: Optional[SearchFilters] = None
    limit: int = Field(10, ge=1, le=50)
    offset: int = Field(0, ge=0)
    keyword_weight: Optional[float] = Field(0.4, ge=0.0, le=1.0)
    semantic_weight: Optional[float] = Field(0.6, ge=0.0, le=1.0)

class SearchResultItem(BaseModel):
    document_id: int
    title: str
    filename: str
    file_type: str
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    snippet: str
    chunk_index: int
    relevance_score: float  # Normalized combined score (0.0 to 1.0 or percentage)
    keyword_score: float
    semantic_score: float
    match_highlights: List[str] = []
    created_at: datetime
    access_level: str

class SearchResponse(BaseModel):
    query: str
    search_type: str
    total_results: int
    execution_time_ms: float
    results: List[SearchResultItem]
    is_knowledge_gap: bool = False

class SearchHistoryResponse(BaseModel):
    id: int
    query: str
    search_type: str
    total_results: int
    execution_time_ms: float
    applied_filters: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


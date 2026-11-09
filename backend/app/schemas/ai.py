from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class SourceCitation(BaseModel):
    document_id: int
    document_title: str
    chunk_index: int
    passage: str
    relevance_score: float

class AskQuestionRequest(BaseModel):
    document_id: Optional[int] = Field(None, description="Specific document ID or None for all accessible documents")
    question: str = Field(..., min_length=2)
    conversation_history: Optional[List[dict]] = None  # [{role: 'user'|'assistant', content: str}]

class AskQuestionResponse(BaseModel):
    question: str
    answer: str
    provider_used: str  # "extractive_synthesizer", "gemini", "openai"
    confidence_score: float
    citations: List[SourceCitation]
    suggested_followups: List[str] = []

class RecommendationItem(BaseModel):
    document_id: int
    title: str
    original_filename: str
    file_type: str
    category_name: Optional[str] = None
    similarity_score: float
    common_topics: List[str] = []
    summary: Optional[str] = None

class RecommendationResponse(BaseModel):
    source_document_id: int
    source_title: str
    recommendations: List[RecommendationItem]


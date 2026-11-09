from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import get_current_user
from app.models.entities import User
from app.schemas.ai import AskQuestionRequest, AskQuestionResponse, RecommendationResponse
from app.ai.rag_service import RAGService
from app.ai.recommendation_service import RecommendationService

router = APIRouter(prefix="/ai", tags=["AI Engine"])

rag_service = RAGService()
recommendation_service = RecommendationService()

@router.post("/ask", response_model=AskQuestionResponse)
def ask_document_question(
    req: AskQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = rag_service.answer_question(
        db=db,
        question=req.question.strip(),
        user_role=current_user.role,
        document_id=req.document_id,
        conversation_history=req.conversation_history
    )
    return result

@router.get("/recommendations/{document_id}", response_model=RecommendationResponse)
def get_similar_recommendations(
    document_id: int,
    limit: int = Query(5, ge=1, le=10),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = recommendation_service.get_recommendations(
        db=db,
        document_id=document_id,
        user_role=current_user.role,
        limit=limit
    )
    return result


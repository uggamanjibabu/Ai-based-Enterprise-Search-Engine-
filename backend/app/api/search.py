from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import get_current_user
from app.models.entities import User, SearchHistory
from app.schemas.search import SearchRequest, SearchResponse, SearchHistoryResponse
from app.ai.hybrid_search import HybridSearchEngine

router = APIRouter(prefix="/search", tags=["Search"])

hybrid_engine = HybridSearchEngine()

@router.post("", response_model=SearchResponse)
def execute_search(
    req: SearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query_text = req.query.strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    filters = req.filters
    file_type = filters.file_type if filters else None
    category_id = filters.category_id if filters else None
    access_level = filters.access_level if filters else None
    date_from = filters.date_from if filters else None
    date_to = filters.date_to if filters else None

    result = hybrid_engine.search(
        db=db,
        query=query_text,
        user_id=current_user.id,
        user_role=current_user.role,
        search_type=req.search_type,
        file_type=file_type,
        category_id=category_id,
        access_level=access_level,
        date_from=date_from,
        date_to=date_to,
        limit=req.limit,
        offset=req.offset,
        keyword_weight=req.keyword_weight or 0.4,
        semantic_weight=req.semantic_weight or 0.6,
    )

    return result

@router.get("/history", response_model=List[SearchHistoryResponse])
def get_user_search_history(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    history = db.query(SearchHistory).filter(
        SearchHistory.user_id == current_user.id
    ).order_by(SearchHistory.created_at.desc()).limit(limit).all()
    return history

@router.delete("/history")
def clear_user_search_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(SearchHistory).filter(SearchHistory.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Search history cleared successfully"}

@router.delete("/history/{id}")
def delete_search_history_item(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(SearchHistory).filter(
        SearchHistory.id == id,
        SearchHistory.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Search history item not found")
    
    db.delete(item)
    db.commit()
    return {"message": "Search history item removed"}


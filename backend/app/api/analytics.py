from typing import List, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database.session import get_db
from app.core.security import get_current_user
from app.models.entities import (
    User, Document, DocumentCategory, SearchHistory, SearchAnalytics
)
from app.schemas.analytics import DashboardStatsResponse, SearchTrendItem, KnowledgeGapItem

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_docs = db.query(Document).count()
    indexed_docs = db.query(Document).filter(Document.status == "indexed").count()
    failed_docs = db.query(Document).filter(Document.status == "failed").count()
    processing_docs = db.query(Document).filter(Document.status.in_(["uploaded", "processing"])).count()
    
    total_searches = db.query(SearchHistory).count()
    total_users = db.query(User).filter(User.is_active == True).count()

    # Average latency
    avg_latency_res = db.query(func.avg(SearchHistory.execution_time_ms)).scalar()
    avg_latency = round(float(avg_latency_res), 2) if avg_latency_res else 42.5

    # Recent searches
    recent_searches_query = db.query(SearchHistory.query).order_by(SearchHistory.created_at.desc()).limit(8).all()
    recent_searches = [r[0] for r in recent_searches_query]

    # Top searched topics / queries
    top_topics_query = db.query(
        SearchHistory.query,
        func.count(SearchHistory.id).label("cnt")
    ).group_by(SearchHistory.query).order_by(desc("cnt")).limit(6).all()
    top_searched_topics = [{"topic": t[0], "count": t[1]} for t in top_topics_query]

    # Category statistics
    categories = db.query(DocumentCategory).all()
    cat_stats = []
    for cat in categories:
        cnt = db.query(Document).filter(Document.category_id == cat.id).count()
        cat_stats.append({
            "category_id": cat.id,
            "name": cat.name,
            "color": cat.color or "#38bdf8",
            "count": cnt
        })

    # Weekly search activity (past 7 days)
    today = datetime.utcnow().date()
    activity_items = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        count = db.query(SearchHistory).filter(
            SearchHistory.created_at >= day_start,
            SearchHistory.created_at <= day_end
        ).count()

        avg_lat = db.query(func.avg(SearchHistory.execution_time_ms)).filter(
            SearchHistory.created_at >= day_start,
            SearchHistory.created_at <= day_end
        ).scalar()

        activity_items.append(SearchTrendItem(
            date=day.strftime("%a (%b %d)"),
            count=count,
            avg_latency_ms=round(float(avg_lat), 1) if avg_lat else 38.0
        ))

    knowledge_gap_cnt = db.query(SearchAnalytics).filter(SearchAnalytics.is_knowledge_gap == True).count()

    return DashboardStatsResponse(
        total_documents=total_docs,
        total_searches=total_searches,
        average_response_time_ms=avg_latency,
        total_users=total_users,
        indexed_documents_count=indexed_docs,
        failed_documents_count=failed_docs,
        processing_documents_count=processing_docs,
        recent_searches=recent_searches,
        top_searched_topics=top_searched_topics,
        categories=cat_stats,
        search_activity_weekly=activity_items,
        knowledge_gap_count=knowledge_gap_cnt
    )

@router.get("/knowledge-gaps", response_model=List[KnowledgeGapItem])
def get_knowledge_gaps(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns queries that yielded 0 or weak results, aggregated by frequency.
    Provides actionable recommendations for missing enterprise documentation.
    """
    gaps_query = db.query(
        SearchAnalytics.query,
        func.count(SearchAnalytics.id).label("freq"),
        func.max(SearchAnalytics.created_at).label("last_search")
    ).filter(
        SearchAnalytics.is_knowledge_gap == True
    ).group_by(SearchAnalytics.query).order_by(desc("freq")).limit(20).all()

    gap_items = []
    for row in gaps_query:
        q_str = row[0]
        # Generate smart suggested action
        if any(w in q_str.lower() for w in ["salary", "payroll", "bonus", "compensation"]):
            suggestion = "Create official 'Compensation & Benefits Guide' under Human Resources."
        elif any(w in q_str.lower() for w in ["vpn", "wifi", "laptop", "ssh", "password", "network"]):
            suggestion = "Publish an 'IT Infrastructure & Network Access SOP' under IT & Cybersecurity."
        elif any(w in q_str.lower() for w in ["travel", "expense", "reimbursement", "flight"]):
            suggestion = "Draft a 'Corporate Travel & Expense Policy' under Finance."
        elif any(w in q_str.lower() for w in ["api", "deploy", "git", "release", "ci/cd"]):
            suggestion = "Add 'DevOps & Deployment Standard Operating Procedures' under Engineering."
        else:
            suggestion = f"Upload an authoritative document addressing '{q_str}'."

        gap_items.append(KnowledgeGapItem(
            query=q_str,
            frequency=row[1],
            last_searched=row[2],
            suggested_action=suggestion
        ))

    return gap_items


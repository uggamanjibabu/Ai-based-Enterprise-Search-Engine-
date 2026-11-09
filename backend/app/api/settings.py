from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import get_current_user, require_admin
from app.models.entities import User, SystemSetting
from pydantic import BaseModel

router = APIRouter(prefix="/settings", tags=["Settings"])

class SettingItem(BaseModel):
    key: str
    value: str
    description: str

class UpdateSettingsPayload(BaseModel):
    settings: Dict[str, str]

DEFAULT_SETTINGS = [
    {"key": "keyword_weight", "value": "0.4", "description": "Default BM25/keyword search weight (0.0 to 1.0)"},
    {"key": "semantic_weight", "value": "0.6", "description": "Default FAISS vector semantic search weight (0.0 to 1.0)"},
    {"key": "max_upload_size_mb", "value": "50", "description": "Maximum document upload size in megabytes"},
    {"key": "enable_near_duplicate_warning", "value": "true", "description": "Alert users if uploaded document is semantically similar to an existing one"},
    {"key": "default_access_level", "value": "internal", "description": "Default access level for new document uploads"},
    {"key": "rag_max_citations", "value": "3", "description": "Number of source passages returned per RAG answer"}
]

@router.get("")
def get_all_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Ensure defaults exist
    for d in DEFAULT_SETTINGS:
        exists = db.query(SystemSetting).filter(SystemSetting.key == d["key"]).first()
        if not exists:
            db.add(SystemSetting(key=d["key"], value=d["value"], description=d["description"]))
    db.commit()

    all_settings = db.query(SystemSetting).all()
    return {s.key: {"value": s.value, "description": s.description, "updated_at": s.updated_at} for s in all_settings}

@router.put("")
def update_settings(
    payload: UpdateSettingsPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    for k, v in payload.settings.items():
        item = db.query(SystemSetting).filter(SystemSetting.key == k).first()
        if item:
            item.value = str(v)
        else:
            db.add(SystemSetting(key=k, value=str(v), description="Custom enterprise configuration"))
    db.commit()
    return {"message": "Settings updated successfully."}


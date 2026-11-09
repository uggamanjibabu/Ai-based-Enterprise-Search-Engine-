import os
import shutil
import uuid
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.config import settings
from app.core.security import get_current_user, require_manager_or_admin, require_admin
from app.models.entities import (
    User, Document, DocumentChunk, DocumentCategory, DocumentTag,
    DocumentVersion, Notification, document_tags_association
)
from app.schemas.document import (
    DocumentResponse, DocumentDetailResponse, CategoryResponse, TagResponse, DocumentUpdate
)
from app.services.document_processor import DocumentProcessor, DocumentProcessingError
from app.ai.vector_store import VectorStore
from app.ai.keyword_search import KeywordSearchEngine
from app.ai.duplicate_detector import DuplicateDetector

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["Documents"])

def _sync_keyword_index(db: Session):
    """Refreshes the in-memory BM25 index with all currently indexed chunks."""
    chunks = db.query(DocumentChunk).join(Document).filter(Document.status == "indexed").all()
    chunk_list = [
        {
            "document_id": c.document_id,
            "chunk_id": c.id,
            "chunk_index": c.chunk_index,
            "content": c.content
        } for c in chunks
    ]
    KeywordSearchEngine().rebuild_index(chunk_list)

@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(DocumentCategory).all()

@router.post("/categories", response_model=CategoryResponse)
def create_category(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    color: Optional[str] = Form("#38bdf8"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    existing = db.query(DocumentCategory).filter(DocumentCategory.name == name.strip()).first()
    if existing:
        return existing
    cat = DocumentCategory(name=name.strip(), description=description, color=color)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.get("/tags", response_model=List[TagResponse])
def get_tags(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(DocumentTag).all()

@router.get("", response_model=List[DocumentResponse])
def list_documents(
    category_id: Optional[int] = Query(None),
    file_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    access_level: Optional[str] = Query(None),
    search_query: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Document)

    # Role-based visibility
    if current_user.role == "employee":
        query = query.filter(Document.access_level.in_(["public", "internal"]))
    elif current_user.role == "manager":
        query = query.filter(Document.access_level.in_(["public", "internal", "restricted"]))

    if category_id:
        query = query.filter(Document.category_id == category_id)
    if file_type:
        query = query.filter(Document.file_type == file_type.lower())
    if status_filter:
        query = query.filter(Document.status == status_filter)
    if access_level:
        query = query.filter(Document.access_level == access_level)
    if search_query:
        query = query.filter(Document.title.ilike(f"%{search_query}%"))

    docs = query.order_by(Document.created_at.desc()).all()
    
    # Format with uploader_name
    result = []
    for d in docs:
        resp = DocumentResponse.model_validate(d)
        resp.uploader_name = d.uploader.full_name if d.uploader else "System"
        result.append(resp)
    return result

@router.get("/{id}", response_model=DocumentDetailResponse)
def get_document(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Access check
    if current_user.role == "employee" and doc.access_level in ["restricted", "confidential"]:
        raise HTTPException(status_code=403, detail="Access denied for this confidentiality level")
    if current_user.role == "manager" and doc.access_level == "confidential":
        raise HTTPException(status_code=403, detail="Confidential documents can only be viewed by Administrators")

    doc.view_count += 1
    db.commit()

    resp = DocumentDetailResponse.model_validate(doc)
    resp.uploader_name = doc.uploader.full_name if doc.uploader else "System"
    return resp

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    access_level: Optional[str] = Form("internal"),
    tags: Optional[str] = Form(None),  # Comma-separated tags
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.permissions or not current_user.permissions.can_upload:
        if current_user.role not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="You do not have permission to upload documents.")

    original_filename = file.filename or "untitled"
    # Read file content
    contents = await file.read()
    file_size = len(contents)

    try:
        file_type = DocumentProcessor.validate_file(original_filename, file_size)
    except DocumentProcessingError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Compute SHA-256 hash for duplicate detection
    import hashlib
    hasher = hashlib.sha256()
    hasher.update(contents)
    file_hash = hasher.hexdigest()

    # Check for exact duplicate
    detector = DuplicateDetector()
    exact_duplicate = detector.check_exact_duplicate(db, file_hash)
    if exact_duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"Duplicate file detected! An identical file '{exact_duplicate.title}' ({exact_duplicate.original_filename}) has already been uploaded."
        )

    # Save to disk
    stored_filename = f"{uuid.uuid4().hex}_{original_filename}"
    saved_path = os.path.join(settings.UPLOAD_DIR, stored_filename)
    with open(saved_path, "wb") as f:
        f.write(contents)

    doc_title = title.strip() if title and title.strip() else original_filename.rsplit(".", 1)[0].replace("_", " ").title()

    # Create initial document record with status "uploaded"
    doc = Document(
        title=doc_title,
        filename=stored_filename,
        original_filename=original_filename,
        file_path=saved_path,
        file_type=file_type,
        file_size=file_size,
        file_hash_sha256=file_hash,
        category_id=category_id,
        uploader_id=current_user.id,
        status="processing",
        access_level=access_level or "internal",
        version=1,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Handle tags
    if tags:
        tag_names = [t.strip() for t in tags.split(",") if t.strip()]
        for t_name in tag_names:
            tag_obj = db.query(DocumentTag).filter(DocumentTag.name == t_name).first()
            if not tag_obj:
                tag_obj = DocumentTag(name=t_name)
                db.add(tag_obj)
                db.commit()
                db.refresh(tag_obj)
            doc.tags.append(tag_obj)
        db.commit()

    # Record Version 1
    version_rec = DocumentVersion(
        document_id=doc.id,
        version_number=1,
        file_path=saved_path,
        file_size=file_size,
        file_hash=file_hash,
        change_summary="Initial upload",
        created_by_id=current_user.id
    )
    db.add(version_rec)
    db.commit()

    # Start text extraction, chunking, and FAISS indexing
    try:
        raw_text = DocumentProcessor.extract_text(saved_path, file_type)
        cleaned_text = DocumentProcessor.clean_text(raw_text)
        
        if not cleaned_text:
            raise DocumentProcessingError("No extractable text could be found in the uploaded file.")

        chunks_data = DocumentProcessor.chunk_text(cleaned_text, chunk_size=500, overlap=100)
        summary = DocumentProcessor.generate_summary(cleaned_text)
        word_count = len(cleaned_text.split())

        # Save chunks in database
        db_chunks = []
        for c in chunks_data:
            chunk_rec = DocumentChunk(
                document_id=doc.id,
                chunk_index=c["chunk_index"],
                content=c["content"],
                token_count=c["token_count"]
            )
            db.add(chunk_rec)
            db_chunks.append(chunk_rec)
        db.commit()

        # Prepare for FAISS vector indexing
        vector_store = VectorStore()
        chunks_for_faiss = [
            {"chunk_id": rec.id, "chunk_index": rec.chunk_index, "content": rec.content}
            for rec in db_chunks
        ]
        assigned_ids = vector_store.add_chunks(doc.id, chunks_for_faiss)

        # Update embedding IDs on chunks
        for rec, v_id in zip(db_chunks, assigned_ids):
            rec.embedding_id = v_id

        # Update document to "indexed"
        doc.status = "indexed"
        doc.summary = summary
        doc.chunk_count = len(db_chunks)
        doc.word_count = word_count
        db.commit()

        # Sync keyword search engine with newly indexed chunks
        _sync_keyword_index(db)

        # Add Notification
        notif = Notification(
            user_id=current_user.id,
            title="Document Indexed Successfully",
            message=f"'{doc.title}' ({doc.original_filename}) has been processed and indexed into the vector store.",
            type="success",
            related_document_id=doc.id
        )
        db.add(notif)
        db.commit()

    except Exception as e:
        logger.error(f"Failed to process and index document {doc.id}: {e}", exc_info=True)
        doc.status = "failed"
        doc.error_message = str(e)
        db.commit()

        notif = Notification(
            user_id=current_user.id,
            title="Document Indexing Failed",
            message=f"Processing failed for '{doc.title}': {str(e)}",
            type="error",
            related_document_id=doc.id
        )
        db.add(notif)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Document indexing failed: {str(e)}")

    db.refresh(doc)
    resp = DocumentResponse.model_validate(doc)
    resp.uploader_name = current_user.full_name
    return resp

@router.get("/{id}/download")
def download_document(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Physical file missing from storage")

    doc.download_count += 1
    db.commit()
    return FileResponse(path=doc.file_path, filename=doc.original_filename)

@router.get("/{id}/preview")
def preview_document(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == id).order_by(DocumentChunk.chunk_index.asc()).all()
    preview_text = "\n\n".join([c.content for c in chunks[:5]])
    return {
        "document_id": doc.id,
        "title": doc.title,
        "preview_text": preview_text[:3000] if preview_text else "No content available for preview."
    }

@router.delete("/{id}")
def delete_document(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Permission check: Admins or the original uploader (if manager)
    if current_user.role != "admin" and not (current_user.role == "manager" and doc.uploader_id == current_user.id):
        raise HTTPException(status_code=403, detail="Permission denied. Only admins or document owner managers can delete documents.")

    # Remove from FAISS
    try:
        VectorStore().remove_document(doc.id)
    except Exception as e:
        logger.error(f"Error removing document vectors from FAISS: {e}")

    # Remove physical file
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            logger.error(f"Error deleting physical file: {e}")

    db.delete(doc)
    db.commit()

    # Rebuild keyword index
    _sync_keyword_index(db)

    # Notification
    notif = Notification(
        user_id=current_user.id,
        title="Document Deleted",
        message=f"Document '{doc.title}' was successfully deleted.",
        type="info"
    )
    db.add(notif)
    db.commit()

    return {"message": f"Document '{doc.title}' deleted successfully."}


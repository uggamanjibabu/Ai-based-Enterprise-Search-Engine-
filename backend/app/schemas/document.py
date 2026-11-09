from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#38bdf8"

class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class TagBase(BaseModel):
    name: str

class TagResponse(TagBase):
    id: int

    class Config:
        from_attributes = True

class DocumentChunkResponse(BaseModel):
    id: int
    chunk_index: int
    content: str
    token_count: int

    class Config:
        from_attributes = True

class DocumentVersionResponse(BaseModel):
    id: int
    version_number: int
    file_size: int
    file_hash: str
    change_summary: str
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentBase(BaseModel):
    title: str
    category_id: Optional[int] = None
    access_level: Optional[str] = "internal"

class DocumentResponse(BaseModel):
    id: int
    title: str
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    file_hash_sha256: str
    status: str
    error_message: Optional[str] = None
    version: int
    access_level: str
    summary: Optional[str] = None
    chunk_count: int
    word_count: int
    view_count: int
    download_count: int
    category: Optional[CategoryResponse] = None
    tags: List[TagResponse] = []
    uploader_name: Optional[str] = None
    uploader_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DocumentDetailResponse(DocumentResponse):
    chunks: List[DocumentChunkResponse] = []
    versions: List[DocumentVersionResponse] = []

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    category_id: Optional[int] = None
    access_level: Optional[str] = None
    tags: Optional[List[str]] = None


from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Optional[str] = "employee"
    department: Optional[str] = "General"

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str

class PermissionResponse(BaseModel):
    can_upload: bool
    can_delete: bool
    can_view_all_analytics: bool
    can_manage_users: bool
    can_manage_settings: bool

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    permissions: Optional[PermissionResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True

Token.model_rebuild()


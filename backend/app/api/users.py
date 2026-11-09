from typing import List, Optional
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import get_current_user, require_admin, get_password_hash
from app.models.entities import User, UserPermission
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/users", tags=["User Management"])

class UserUpdateSchema(BaseModel):
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None
    full_name: Optional[str] = None

class UserCreateAdminSchema(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "employee"
    department: Optional[str] = "General"

@router.get("", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Permission denied. Requires admin or manager role.")
    return db.query(User).all()

@router.post("", response_model=UserResponse)
def create_user_admin(
    req: UserCreateAdminSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = User(
        email=req.email.lower(),
        full_name=req.full_name,
        hashed_password=get_password_hash(req.password),
        role=req.role if req.role in ["admin", "manager", "employee"] else "employee",
        department=req.department or "General",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    permissions = UserPermission(
        user_id=new_user.id,
        can_upload=True,
        can_delete=(new_user.role == "admin"),
        can_view_all_analytics=(new_user.role in ["admin", "manager"]),
        can_manage_users=(new_user.role == "admin"),
        can_manage_settings=(new_user.role == "admin")
    )
    db.add(permissions)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{id}", response_model=UserResponse)
def update_user(
    id: int,
    req: UserUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.role and req.role in ["admin", "manager", "employee"]:
        user.role = req.role
        # update permissions
        if user.permissions:
            user.permissions.can_delete = (req.role == "admin")
            user.permissions.can_view_all_analytics = (req.role in ["admin", "manager"])
            user.permissions.can_manage_users = (req.role == "admin")
            user.permissions.can_manage_settings = (req.role == "admin")

    if req.department is not None:
        user.department = req.department
    if req.is_active is not None:
        user.is_active = req.is_active
    if req.full_name is not None:
        user.full_name = req.full_name

    db.commit()
    db.refresh(user)
    return user

@router.delete("/{id}")
def delete_user(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if current_user.id == id:
        raise HTTPException(status_code=400, detail="Administrators cannot delete their own active account.")

    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully."}


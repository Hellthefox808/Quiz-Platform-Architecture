from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr
from backend.app.models.user import UserRole, UserStatus


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: UserRole
    status: UserStatus
    created_at: datetime
    last_login_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserAdminResponse(UserResponse):
    total_attempts: int = 0
    passed_attempts: int = 0
    average_score: float = 0.0


class UserUpdateStatusRequest(BaseModel):
    status: UserStatus

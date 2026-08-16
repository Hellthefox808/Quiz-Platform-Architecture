import enum
from typing import Any, Dict, Optional
from sqlalchemy import Enum, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import BaseModel


class AuditAction(str, enum.Enum):
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILURE = "LOGIN_FAILURE"
    LOGOUT = "LOGOUT"
    REGISTER = "REGISTER"
    PASSWORD_RESET_REQUEST = "PASSWORD_RESET_REQUEST"
    PASSWORD_RESET_SUCCESS = "PASSWORD_RESET_SUCCESS"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"
    USER_ACTIVATED = "USER_ACTIVATED"
    USER_SUSPENDED = "USER_SUSPENDED"
    CATEGORY_CREATED = "CATEGORY_CREATED"
    CATEGORY_UPDATED = "CATEGORY_UPDATED"
    CATEGORY_DELETED = "CATEGORY_DELETED"
    QUIZ_CREATED = "QUIZ_CREATED"
    QUIZ_UPDATED = "QUIZ_UPDATED"
    QUIZ_PUBLISHED = "QUIZ_PUBLISHED"
    QUIZ_UNPUBLISHED = "QUIZ_UNPUBLISHED"
    QUESTION_CREATED = "QUESTION_CREATED"
    QUESTION_UPDATED = "QUESTION_UPDATED"
    QUESTION_DELETED = "QUESTION_DELETED"
    ATTEMPT_STARTED = "ATTEMPT_STARTED"
    ANSWER_SAVED = "ANSWER_SAVED"
    ATTEMPT_SUBMITTED = "ATTEMPT_SUBMITTED"
    ATTEMPT_AUTO_SUBMITTED = "ATTEMPT_AUTO_SUBMITTED"
    CERTIFICATE_ISSUED = "CERTIFICATE_ISSUED"


class AuditLog(BaseModel):
    __tablename__ = "audit_logs"

    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action: Mapped[AuditAction] = mapped_column(
        Enum(AuditAction, native_enum=False),
        nullable=False,
        index=True
    )
    resource_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    user: Mapped[Optional["User"]] = relationship("User")

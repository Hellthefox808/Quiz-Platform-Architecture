import enum
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import BaseModel


class QuizStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    PUBLISHED = "PUBLISHED"
    PAUSED = "PAUSED"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"


class Quiz(BaseModel):
    __tablename__ = "quizzes"

    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    status: Mapped[QuizStatus] = mapped_column(
        Enum(QuizStatus, native_enum=False),
        default=QuizStatus.DRAFT,
        nullable=False,
        index=True
    )
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    category: Mapped["Category"] = relationship("Category", back_populates="quizzes")
    versions: Mapped[List["QuizVersion"]] = relationship(
        "QuizVersion", back_populates="quiz", cascade="all, delete-orphan", order_by="QuizVersion.version_number.desc()"
    )
    attempts: Mapped[List["AssessmentAttempt"]] = relationship(
        "AssessmentAttempt", back_populates="quiz", cascade="all, delete-orphan"
    )


class QuizVersion(BaseModel):
    __tablename__ = "quiz_versions"

    quiz_id: Mapped[str] = mapped_column(String(36), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    
    # Configuration Rules
    duration_seconds: Mapped[int] = mapped_column(Integer, default=1800, nullable=False)  # 30 mins
    passing_percentage: Mapped[float] = mapped_column(Float, default=60.0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    
    # Security & Assessment Behavior
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    shuffle_options: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    negative_marking_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    negative_mark_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    # Review & Feedback Settings
    show_result_immediately: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_correct_answers: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_explanations: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_review: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_resume: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Scheduling
    available_from: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    available_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    quiz: Mapped["Quiz"] = relationship("Quiz", back_populates="versions")
    questions: Mapped[List["Question"]] = relationship(
        "Question", back_populates="quiz_version", cascade="all, delete-orphan", order_by="Question.position.asc()"
    )
    attempts: Mapped[List["AssessmentAttempt"]] = relationship(
        "AssessmentAttempt", back_populates="quiz_version"
    )

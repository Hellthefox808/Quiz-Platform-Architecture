import enum
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import BaseModel


class AttemptStatus(str, enum.Enum):
    CREATED = "CREATED"
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTING = "SUBMITTING"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class AssessmentAttempt(BaseModel):
    __tablename__ = "assessment_attempts"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    quiz_id: Mapped[str] = mapped_column(String(36), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    quiz_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("quiz_versions.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    status: Mapped[AttemptStatus] = mapped_column(
        Enum(AttemptStatus, native_enum=False),
        default=AttemptStatus.IN_PROGRESS,
        nullable=False,
        index=True
    )
    
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    auto_submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Scoring summary
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    correct_answers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    incorrect_answers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unanswered: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_marks: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    obtained_marks: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    time_taken_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="attempts")
    quiz: Mapped["Quiz"] = relationship("Quiz", back_populates="attempts")
    quiz_version: Mapped["QuizVersion"] = relationship("QuizVersion", back_populates="attempts")
    attempt_questions: Mapped[List["AttemptQuestion"]] = relationship(
        "AttemptQuestion", back_populates="attempt", cascade="all, delete-orphan", order_by="AttemptQuestion.question_order.asc()"
    )
    answers: Mapped[List["Answer"]] = relationship(
        "Answer", back_populates="attempt", cascade="all, delete-orphan"
    )
    result: Mapped[Optional["Result"]] = relationship("Result", back_populates="attempt", uselist=False, cascade="all, delete-orphan")


class AttemptQuestion(BaseModel):
    __tablename__ = "attempt_questions"

    attempt_id: Mapped[str] = mapped_column(String(36), ForeignKey("assessment_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("questions.id", ondelete="RESTRICT"), nullable=False, index=True)
    question_order: Mapped[int] = mapped_column(Integer, nullable=False)
    marks: Mapped[float] = mapped_column(Float, nullable=False)
    question_snapshot: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)

    attempt: Mapped["AssessmentAttempt"] = relationship("AssessmentAttempt", back_populates="attempt_questions")
    answers: Mapped[List["Answer"]] = relationship("Answer", back_populates="attempt_question", cascade="all, delete-orphan")


class Answer(BaseModel):
    __tablename__ = "answers"

    attempt_id: Mapped[str] = mapped_column(String(36), ForeignKey("assessment_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_question_id: Mapped[str] = mapped_column(String(36), ForeignKey("attempt_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    selected_option_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    is_correct: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    marks_awarded: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    answered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    attempt: Mapped["AssessmentAttempt"] = relationship("AssessmentAttempt", back_populates="answers")
    attempt_question: Mapped["AttemptQuestion"] = relationship("AttemptQuestion", back_populates="answers")

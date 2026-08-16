import enum
from typing import List, Optional
from sqlalchemy import Boolean, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import BaseModel


class QuestionType(str, enum.Enum):
    MCQ_SINGLE = "MCQ_SINGLE"


class DifficultyLevel(str, enum.Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class Question(BaseModel):
    __tablename__ = "questions"

    quiz_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("quiz_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[QuestionType] = mapped_column(
        Enum(QuestionType, native_enum=False),
        default=QuestionType.MCQ_SINGLE,
        nullable=False
    )
    marks: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    difficulty: Mapped[DifficultyLevel] = mapped_column(
        Enum(DifficultyLevel, native_enum=False),
        default=DifficultyLevel.MEDIUM,
        nullable=False
    )
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    quiz_version: Mapped["QuizVersion"] = relationship("QuizVersion", back_populates="questions")
    options: Mapped[List["QuestionOption"]] = relationship(
        "QuestionOption", back_populates="question", cascade="all, delete-orphan", order_by="QuestionOption.position.asc()"
    )


class QuestionOption(BaseModel):
    __tablename__ = "question_options"

    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    option_text: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    question: Mapped["Question"] = relationship("Question", back_populates="options")

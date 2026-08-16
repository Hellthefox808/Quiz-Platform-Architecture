from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from backend.app.models.quiz import QuizStatus
from backend.app.schemas.category import CategoryResponse
from backend.app.schemas.question import QuestionAdminResponse


class QuizVersionConfig(BaseModel):
    duration_seconds: int = Field(1800, gt=0, le=86400)
    passing_percentage: float = Field(60.0, ge=0.0, le=100.0)
    max_attempts: int = Field(1, ge=1, le=100)
    shuffle_questions: bool = False
    shuffle_options: bool = False
    negative_marking_enabled: bool = False
    negative_mark_value: float = Field(0.0, ge=0.0)
    show_result_immediately: bool = True
    show_correct_answers: bool = True
    show_explanations: bool = True
    allow_review: bool = True
    allow_resume: bool = True
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None


class QuizCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    category_id: str
    thumbnail_url: Optional[str] = None
    config: Optional[QuizVersionConfig] = None


class QuizUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    category_id: Optional[str] = None
    thumbnail_url: Optional[str] = None
    status: Optional[QuizStatus] = None


class QuizVersionResponse(BaseModel):
    id: str
    quiz_id: str
    version_number: int
    duration_seconds: int
    passing_percentage: float
    max_attempts: int
    shuffle_questions: bool
    shuffle_options: bool
    negative_marking_enabled: bool
    negative_mark_value: float
    show_result_immediately: bool
    show_correct_answers: bool
    show_explanations: bool
    allow_review: bool
    allow_resume: bool
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None
    published_at: Optional[datetime] = None
    question_count: int = 0
    questions: List[QuestionAdminResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuizAdminResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category_id: str
    category: Optional[CategoryResponse] = None
    status: QuizStatus
    thumbnail_url: Optional[str] = None
    created_by: Optional[str] = None
    current_version: Optional[QuizVersionResponse] = None
    versions_count: int = 1
    total_attempts: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuizStudentSummaryResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category_name: str
    category_slug: str
    thumbnail_url: Optional[str] = None
    duration_seconds: int
    passing_percentage: float
    max_attempts: int
    question_count: int
    total_marks: float
    user_attempts_count: int = 0
    user_best_score: Optional[float] = None
    user_has_passed: bool = False
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None


class QuizStudentDetailResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category_name: str
    category_slug: str
    thumbnail_url: Optional[str] = None
    duration_seconds: int
    passing_percentage: float
    max_attempts: int
    negative_marking_enabled: bool
    negative_mark_value: float
    allow_review: bool
    allow_resume: bool
    question_count: int
    total_marks: float
    user_attempts_count: int = 0
    user_can_attempt: bool = True
    active_attempt_id: Optional[str] = None
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None


class QuizPublishChecklistResponse(BaseModel):
    is_publishable: bool
    quiz_id: str
    quiz_title: str
    checks: List[dict]
    blocking_issues: List[str]

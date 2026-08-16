from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from backend.app.models.question import DifficultyLevel, QuestionType


class QuestionOptionCreate(BaseModel):
    id: Optional[str] = None
    option_text: str = Field(..., min_length=1)
    position: int = 0
    is_correct: bool = False


class QuestionOptionAdminResponse(BaseModel):
    id: str
    question_id: str
    option_text: str
    position: int
    is_correct: bool

    model_config = ConfigDict(from_attributes=True)


class QuestionOptionStudentResponse(BaseModel):
    id: str
    option_text: str
    position: int

    model_config = ConfigDict(from_attributes=True)


class QuestionCreate(BaseModel):
    question_text: str = Field(..., min_length=3)
    question_type: QuestionType = QuestionType.MCQ_SINGLE
    marks: float = Field(1.0, gt=0)
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    explanation: Optional[str] = None
    position: int = 0
    options: List[QuestionOptionCreate] = Field(..., min_length=2)


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = Field(None, min_length=3)
    question_type: Optional[QuestionType] = None
    marks: Optional[float] = Field(None, gt=0)
    difficulty: Optional[DifficultyLevel] = None
    explanation: Optional[str] = None
    position: Optional[int] = None
    options: Optional[List[QuestionOptionCreate]] = None


class QuestionAdminResponse(BaseModel):
    id: str
    quiz_version_id: str
    question_text: str
    question_type: QuestionType
    marks: float
    difficulty: DifficultyLevel
    explanation: Optional[str] = None
    position: int
    options: List[QuestionOptionAdminResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuestionStudentResponse(BaseModel):
    id: str
    question_text: str
    question_type: QuestionType
    marks: float
    difficulty: DifficultyLevel
    position: int
    options: List[QuestionOptionStudentResponse] = []

    model_config = ConfigDict(from_attributes=True)


class BulkQuestionItem(BaseModel):
    question_text: str
    options: List[str]
    correct_option_index: int
    marks: float = 1.0
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    explanation: Optional[str] = None


class BulkQuestionImportRequest(BaseModel):
    questions: List[BulkQuestionItem]


class BulkImportError(BaseModel):
    row: int
    error: str


class BulkQuestionImportResponse(BaseModel):
    total_processed: int
    imported_count: int
    failed_count: int
    errors: List[BulkImportError] = []

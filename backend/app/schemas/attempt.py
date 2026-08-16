from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from backend.app.models.attempt import AttemptStatus
from backend.app.schemas.question import QuestionOptionStudentResponse


class StartAttemptRequest(BaseModel):
    pass


class SaveAnswerRequest(BaseModel):
    attempt_question_id: str
    selected_option_id: Optional[str] = None


class SaveAnswerResponse(BaseModel):
    attempt_id: str
    attempt_question_id: str
    selected_option_id: Optional[str] = None
    saved_at: datetime
    status: str = "SAVED"


class AttemptQuestionStudentView(BaseModel):
    attempt_question_id: str
    question_order: int
    marks: float
    question_text: str
    options: List[QuestionOptionStudentResponse]
    selected_option_id: Optional[str] = None


class AttemptStudentResponse(BaseModel):
    id: str
    quiz_id: str
    quiz_title: str
    quiz_version_id: str
    status: AttemptStatus
    started_at: datetime
    expires_at: datetime
    server_time: datetime
    duration_seconds: int
    questions: List[AttemptQuestionStudentView] = []
    total_questions: int = 0
    answered_count: int = 0


class AttemptAdminResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    quiz_id: str
    quiz_title: str
    quiz_version_id: str
    status: AttemptStatus
    started_at: datetime
    expires_at: datetime
    submitted_at: Optional[datetime] = None
    score: float
    percentage: float
    passed: bool
    correct_answers: int
    incorrect_answers: int
    unanswered: int
    total_marks: float
    obtained_marks: float
    time_taken_seconds: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

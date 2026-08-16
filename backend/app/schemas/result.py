from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class OptionReviewResponse(BaseModel):
    id: str
    option_text: str
    is_selected: bool = False
    is_correct: Optional[bool] = None  # None if show_correct_answers is false


class QuestionReviewResponse(BaseModel):
    question_order: int
    question_text: str
    marks: float
    marks_awarded: float
    difficulty: str
    options: List[OptionReviewResponse]
    selected_option_id: Optional[str] = None
    is_correct: Optional[bool] = None
    explanation: Optional[str] = None  # None if show_explanations is false


class ResultResponse(BaseModel):
    id: str
    attempt_id: str
    user_id: str
    quiz_id: str
    quiz_title: str
    final_score: float
    percentage: float
    passed: bool
    passing_percentage: float
    total_marks: float
    obtained_marks: float
    correct_count: int
    incorrect_count: int
    unanswered_count: int
    time_taken_seconds: int
    submitted_at: datetime
    
    allow_review: bool
    show_correct_answers: bool
    show_explanations: bool
    certificate_code: Optional[str] = None
    
    questions_review: Optional[List[QuestionReviewResponse]] = None

    model_config = ConfigDict(from_attributes=True)

from typing import Dict, List, Optional
from pydantic import BaseModel


class MetricCard(BaseModel):
    title: str
    value: float
    formatted_value: str
    change_percentage: Optional[float] = None
    description: Optional[str] = None


class TimeSeriesPoint(BaseModel):
    date: str
    count: int
    passed_count: int = 0
    average_score: float = 0.0


class ScoreDistributionBucket(BaseModel):
    range_label: str
    count: int
    percentage: float


class QuizPerformanceSummary(BaseModel):
    quiz_id: str
    title: str
    category_name: str
    total_attempts: int
    average_score: float
    pass_rate: float


class QuestionMetric(BaseModel):
    question_id: str
    question_text: str
    quiz_title: str
    difficulty: str
    total_attempts: int
    correct_count: int
    incorrect_count: int
    unanswered_count: int
    correct_percentage: float
    difficulty_index: float  # incorrect / total


class AdminAnalyticsResponse(BaseModel):
    total_users: int
    active_users: int
    total_quizzes: int
    published_quizzes: int
    total_questions: int
    total_attempts: int
    completed_attempts: int
    average_score: float
    overall_pass_rate: float
    attempts_trend: List[TimeSeriesPoint]
    score_distribution: List[ScoreDistributionBucket]
    popular_quizzes: List[QuizPerformanceSummary]
    recent_attempts_count: int


class StudentAnalyticsResponse(BaseModel):
    total_attempts: int
    passed_attempts: int
    failed_attempts: int
    pass_rate: float
    average_score: float
    highest_score: float
    total_time_spent_seconds: int
    category_breakdown: List[Dict[str, str | float | int]]
    recent_performance: List[TimeSeriesPoint]

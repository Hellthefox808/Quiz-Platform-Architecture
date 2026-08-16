from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class LeaderboardEntryResponse(BaseModel):
    rank: int
    user_id: str
    user_name: str
    quizzes_taken: int
    quizzes_passed: int
    total_score: float
    average_percentage: float
    total_time_seconds: int

    model_config = ConfigDict(from_attributes=True)


class LeaderboardResponse(BaseModel):
    timeframe: str
    category_id: Optional[str] = None
    category_name: Optional[str] = "All Categories"
    total_participants: int
    user_entry: Optional[LeaderboardEntryResponse] = None
    rankings: List[LeaderboardEntryResponse]

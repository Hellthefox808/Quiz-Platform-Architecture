from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.deps import get_current_user_optional
from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.schemas.leaderboard import LeaderboardResponse
from backend.app.services.leaderboard_service import LeaderboardService

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


@router.get("", response_model=LeaderboardResponse)
async def get_leaderboard(
    category_id: Optional[str] = None,
    timeframe: str = Query("all", pattern="^(all|monthly|weekly)$"),
    user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    current_user_id = user.id if user else None
    return await LeaderboardService.get_leaderboard(
        db=db,
        current_user_id=current_user_id,
        category_id=category_id,
        timeframe=timeframe,
    )

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.deps import get_current_user, require_admin
from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.schemas.analytics import AdminAnalyticsResponse, QuestionMetric, StudentAnalyticsResponse
from backend.app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/admin", response_model=AdminAnalyticsResponse)
async def get_admin_analytics(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService.get_admin_analytics(db=db)


@router.get("/admin/questions", response_model=List[QuestionMetric])
async def get_question_analytics(
    quiz_id: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService.get_question_analytics(db=db, quiz_id=quiz_id)


@router.get("/student", response_model=StudentAnalyticsResponse)
async def get_student_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService.get_student_analytics(db=db, user_id=current_user.id)

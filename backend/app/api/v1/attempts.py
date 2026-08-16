from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from slowapi import Limiter
from slowapi.util import get_remote_address
from backend.app.api.deps import get_current_user, limiter, require_admin
from backend.app.core.database import get_db
from backend.app.models.attempt import AssessmentAttempt, AttemptStatus
from backend.app.models.quiz import Quiz
from backend.app.models.user import User
from backend.app.schemas.attempt import (
    AttemptAdminResponse,
    AttemptStudentResponse,
    SaveAnswerRequest,
    SaveAnswerResponse,
    StartAttemptRequest,
)
from backend.app.schemas.common import PaginatedResponse
from backend.app.schemas.result import ResultResponse
from backend.app.services.assessment_service import AssessmentService

router = APIRouter(prefix="/attempts", tags=["Assessment Attempts"])


@router.post("/quizzes/{quiz_id}/start", response_model=AttemptStudentResponse)
@limiter.limit("20/minute")
async def start_quiz_attempt(
    quiz_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ip_address = request.client.host if request.client else None
    attempt = await AssessmentService.start_attempt(
        db=db,
        quiz_id=quiz_id,
        user=current_user,
        ip_address=ip_address,
    )
    return await AssessmentService.get_student_attempt_view(db=db, attempt_id=attempt.id, user=current_user)


@router.get("/{attempt_id}", response_model=AttemptStudentResponse)
async def get_attempt(
    attempt_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AssessmentService.get_student_attempt_view(
        db=db,
        attempt_id=attempt_id,
        user=current_user
    )


@router.patch("/{attempt_id}/answers", response_model=SaveAnswerResponse)
@limiter.limit("60/minute")
async def save_answer(
    attempt_id: str,
    request: Request,
    data: SaveAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AssessmentService.save_answer(
        db=db,
        attempt_id=attempt_id,
        data=data,
        user=current_user,
    )


@router.post("/{attempt_id}/submit", response_model=ResultResponse)
@limiter.limit("15/minute")
async def submit_attempt(
    attempt_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AssessmentService.submit_attempt(
        db=db,
        attempt_id=attempt_id,
        user=current_user,
        auto_submitted=False,
    )


@router.get("/results/{result_id}", response_model=ResultResponse)
async def get_result(
    result_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AssessmentService.get_result(
        db=db,
        result_id=result_id,
        user=current_user,
    )


@router.get("/history/my", response_model=PaginatedResponse[AttemptAdminResponse])
async def get_my_attempt_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AssessmentAttempt)
        .where(AssessmentAttempt.user_id == current_user.id)
        .options(
            selectinload(AssessmentAttempt.quiz),
            selectinload(AssessmentAttempt.user),
        )
    )

    count_stmt = (
        select(func.count(AssessmentAttempt.id))
        .where(AssessmentAttempt.user_id == current_user.id)
    )
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(AssessmentAttempt.started_at.desc()).offset((page - 1) * page_size).limit(page_size)
    attempts = list((await db.execute(stmt)).scalars().all())

    items = [
        AttemptAdminResponse(
            id=a.id,
            user_id=a.user_id,
            user_name=current_user.name,
            user_email=current_user.email,
            quiz_id=a.quiz_id,
            quiz_title=a.quiz.title if a.quiz else "Quiz",
            quiz_version_id=a.quiz_version_id,
            status=a.status,
            started_at=a.started_at,
            expires_at=a.expires_at,
            submitted_at=a.submitted_at or a.auto_submitted_at,
            score=a.score,
            percentage=a.percentage,
            passed=a.passed,
            correct_answers=a.correct_answers,
            incorrect_answers=a.incorrect_answers,
            unanswered=a.unanswered,
            total_marks=a.total_marks,
            obtained_marks=a.obtained_marks,
            time_taken_seconds=a.time_taken_seconds,
            created_at=a.created_at,
        )
        for a in attempts
    ]

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedResponse[AttemptAdminResponse](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/admin/all", response_model=PaginatedResponse[AttemptAdminResponse])
async def list_attempts_admin(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    quiz_id: Optional[str] = None,
    user_id: Optional[str] = None,
    status: Optional[AttemptStatus] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AssessmentAttempt).options(
        selectinload(AssessmentAttempt.quiz),
        selectinload(AssessmentAttempt.user),
    )
    if quiz_id:
        stmt = stmt.where(AssessmentAttempt.quiz_id == quiz_id)
    if user_id:
        stmt = stmt.where(AssessmentAttempt.user_id == user_id)
    if status:
        stmt = stmt.where(AssessmentAttempt.status == status)

    count_stmt = select(func.count(AssessmentAttempt.id))
    if quiz_id:
        count_stmt = count_stmt.where(AssessmentAttempt.quiz_id == quiz_id)
    if user_id:
        count_stmt = count_stmt.where(AssessmentAttempt.user_id == user_id)
    if status:
        count_stmt = count_stmt.where(AssessmentAttempt.status == status)

    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(AssessmentAttempt.started_at.desc()).offset((page - 1) * page_size).limit(page_size)
    attempts = list((await db.execute(stmt)).scalars().all())

    items = [
        AttemptAdminResponse(
            id=a.id,
            user_id=a.user_id,
            user_name=a.user.name if a.user else "User",
            user_email=a.user.email if a.user else "",
            quiz_id=a.quiz_id,
            quiz_title=a.quiz.title if a.quiz else "Quiz",
            quiz_version_id=a.quiz_version_id,
            status=a.status,
            started_at=a.started_at,
            expires_at=a.expires_at,
            submitted_at=a.submitted_at or a.auto_submitted_at,
            score=a.score,
            percentage=a.percentage,
            passed=a.passed,
            correct_answers=a.correct_answers,
            incorrect_answers=a.incorrect_answers,
            unanswered=a.unanswered,
            total_marks=a.total_marks,
            obtained_marks=a.obtained_marks,
            time_taken_seconds=a.time_taken_seconds,
            created_at=a.created_at,
        )
        for a in attempts
    ]

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedResponse[AttemptAdminResponse](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.deps import get_current_user, require_admin
from backend.app.core.database import get_db
from backend.app.models.quiz import QuizStatus
from backend.app.models.user import User
from backend.app.schemas.common import PaginatedResponse
from backend.app.schemas.quiz import (
    QuizAdminResponse,
    QuizCreate,
    QuizPublishChecklistResponse,
    QuizStudentDetailResponse,
    QuizStudentSummaryResponse,
    QuizUpdate,
    QuizVersionResponse,
)
from backend.app.services.quiz_service import QuizService

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


# --- Student Endpoints ---

@router.get("", response_model=PaginatedResponse[QuizStudentSummaryResponse])
async def list_student_quizzes(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await QuizService.list_student_quizzes(
        db=db,
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        search=search,
        category_id=category_id,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedResponse[QuizStudentSummaryResponse](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/details/{quiz_id}", response_model=QuizStudentDetailResponse)
async def get_student_quiz_detail(
    quiz_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await QuizService.get_quiz_student_detail(
        db=db,
        quiz_id=quiz_id,
        user_id=current_user.id
    )


# --- Admin Endpoints ---

@router.post("", response_model=QuizAdminResponse, status_code=201)
async def create_quiz(
    data: QuizCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    quiz = await QuizService.create_quiz(db=db, data=data, created_by_user_id=admin.id)
    return await QuizService.get_quiz_admin(db=db, quiz_id=quiz.id)


@router.get("/admin", response_model=PaginatedResponse[QuizAdminResponse])
async def list_quizzes_admin(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    status: Optional[QuizStatus] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    quizzes, total = await QuizService.list_quizzes_admin(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        category_id=category_id,
        status=status,
    )
    
    items = []
    for q in quizzes:
        latest_ver = q.versions[0] if q.versions else None
        ver_resp = None
        if latest_ver:
            ver_resp = QuizVersionResponse(
                id=latest_ver.id,
                quiz_id=latest_ver.quiz_id,
                version_number=latest_ver.version_number,
                duration_seconds=latest_ver.duration_seconds,
                passing_percentage=latest_ver.passing_percentage,
                max_attempts=latest_ver.max_attempts,
                shuffle_questions=latest_ver.shuffle_questions,
                shuffle_options=latest_ver.shuffle_options,
                negative_marking_enabled=latest_ver.negative_marking_enabled,
                negative_mark_value=latest_ver.negative_mark_value,
                show_result_immediately=latest_ver.show_result_immediately,
                show_correct_answers=latest_ver.show_correct_answers,
                show_explanations=latest_ver.show_explanations,
                allow_review=latest_ver.allow_review,
                allow_resume=latest_ver.allow_resume,
                available_from=latest_ver.available_from,
                available_until=latest_ver.available_until,
                published_at=latest_ver.published_at,
                question_count=len(latest_ver.questions),
                questions=[],
                created_at=latest_ver.created_at,
            )

        items.append(
            QuizAdminResponse(
                id=q.id,
                title=q.title,
                description=q.description,
                category_id=q.category_id,
                category=q.category,
                status=q.status,
                thumbnail_url=q.thumbnail_url,
                created_by=q.created_by,
                current_version=ver_resp,
                versions_count=len(q.versions),
                total_attempts=len(q.attempts),
                created_at=q.created_at,
                updated_at=q.updated_at,
            )
        )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedResponse[QuizAdminResponse](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/admin/{quiz_id}", response_model=QuizAdminResponse)
async def get_quiz_admin(
    quiz_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    q = await QuizService.get_quiz_admin(db=db, quiz_id=quiz_id)
    latest_ver = q.versions[0] if q.versions else None
    ver_resp = None
    if latest_ver:
        ver_resp = QuizVersionResponse(
            id=latest_ver.id,
            quiz_id=latest_ver.quiz_id,
            version_number=latest_ver.version_number,
            duration_seconds=latest_ver.duration_seconds,
            passing_percentage=latest_ver.passing_percentage,
            max_attempts=latest_ver.max_attempts,
            shuffle_questions=latest_ver.shuffle_questions,
            shuffle_options=latest_ver.shuffle_options,
            negative_marking_enabled=latest_ver.negative_marking_enabled,
            negative_mark_value=latest_ver.negative_mark_value,
            show_result_immediately=latest_ver.show_result_immediately,
            show_correct_answers=latest_ver.show_correct_answers,
            show_explanations=latest_ver.show_explanations,
            allow_review=latest_ver.allow_review,
            allow_resume=latest_ver.allow_resume,
            available_from=latest_ver.available_from,
            available_until=latest_ver.available_until,
            published_at=latest_ver.published_at,
            question_count=len(latest_ver.questions),
            questions=latest_ver.questions,
            created_at=latest_ver.created_at,
        )

    return QuizAdminResponse(
        id=q.id,
        title=q.title,
        description=q.description,
        category_id=q.category_id,
        category=q.category,
        status=q.status,
        thumbnail_url=q.thumbnail_url,
        created_by=q.created_by,
        current_version=ver_resp,
        versions_count=len(q.versions),
        total_attempts=len(q.attempts),
        created_at=q.created_at,
        updated_at=q.updated_at,
    )


@router.put("/{quiz_id}", response_model=QuizAdminResponse)
async def update_quiz(
    quiz_id: str,
    data: QuizUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await QuizService.update_quiz(db=db, quiz_id=quiz_id, data=data, user_id=admin.id)
    return await QuizService.get_quiz_admin(db=db, quiz_id=quiz_id)


@router.get("/{quiz_id}/publish-checklist", response_model=QuizPublishChecklistResponse)
async def get_publish_checklist(
    quiz_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await QuizService.validate_publish_checklist(db=db, quiz_id=quiz_id)


@router.post("/{quiz_id}/publish", response_model=QuizAdminResponse)
async def publish_quiz(
    quiz_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await QuizService.publish_quiz(db=db, quiz_id=quiz_id, user_id=admin.id)
    return await QuizService.get_quiz_admin(db=db, quiz_id=quiz_id)


@router.post("/{quiz_id}/unpublish", response_model=QuizAdminResponse)
async def unpublish_quiz(
    quiz_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await QuizService.unpublish_quiz(db=db, quiz_id=quiz_id, user_id=admin.id)
    return await QuizService.get_quiz_admin(db=db, quiz_id=quiz_id)

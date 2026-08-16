from typing import List
from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.api.deps import require_admin
from backend.app.core.database import get_db
from backend.app.core.exceptions import BadRequestException, NotFoundException
from backend.app.models.audit import AuditAction
from backend.app.models.question import Question, QuestionOption
from backend.app.models.quiz import Quiz, QuizVersion
from backend.app.models.user import User
from backend.app.schemas.question import (
    BulkQuestionImportRequest,
    BulkQuestionImportResponse,
    QuestionAdminResponse,
    QuestionCreate,
    QuestionUpdate,
)
from backend.app.services.audit_service import AuditService
from backend.app.services.import_export_service import ImportExportService

router = APIRouter(prefix="/questions", tags=["Questions (Admin)"])


@router.post("/quizzes/{quiz_id}", response_model=QuestionAdminResponse, status_code=201)
async def create_question(
    quiz_id: str,
    data: QuestionCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Fetch latest quiz version
    stmt = (
        select(QuizVersion)
        .where(QuizVersion.quiz_id == quiz_id)
        .order_by(QuizVersion.version_number.desc())
    )
    ver = (await db.execute(stmt)).scalars().first()
    if not ver:
        raise NotFoundException(message="Quiz version not found")

    # Validate options: at least 2, exactly 1 marked correct for MCQ
    correct_count = len([o for o in data.options if o.is_correct])
    if correct_count != 1:
        raise BadRequestException(message=f"A multiple-choice question must have exactly 1 correct option (received {correct_count})")

    # Get max position
    pos_stmt = select(func.max(Question.position)).where(Question.quiz_version_id == ver.id)
    pos_res = await db.execute(pos_stmt)
    max_pos = pos_res.scalar() or 0

    new_q = Question(
        quiz_version_id=ver.id,
        question_text=data.question_text.strip(),
        question_type=data.question_type,
        marks=data.marks,
        difficulty=data.difficulty,
        explanation=data.explanation.strip() if data.explanation else None,
        position=data.position or (max_pos + 1),
    )
    db.add(new_q)
    await db.flush()

    for idx, opt in enumerate(data.options, start=1):
        new_opt = QuestionOption(
            question_id=new_q.id,
            option_text=opt.option_text.strip(),
            position=opt.position or idx,
            is_correct=opt.is_correct,
        )
        db.add(new_opt)

    await AuditService.log_event(
        db=db,
        action=AuditAction.QUESTION_CREATED,
        user_id=admin.id,
        resource_type="Question",
        resource_id=new_q.id,
        details={"quiz_id": quiz_id, "marks": new_q.marks},
    )
    await db.commit()

    # Re-fetch with options
    q_stmt = select(Question).where(Question.id == new_q.id).options(selectinload(Question.options))
    saved_q = (await db.execute(q_stmt)).scalar_one()
    return saved_q


@router.get("/{question_id}", response_model=QuestionAdminResponse)
async def get_question(
    question_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Question).where(Question.id == question_id).options(selectinload(Question.options))
    q = (await db.execute(stmt)).scalar_one_or_none()
    if not q:
        raise NotFoundException(message="Question not found")
    return q


@router.put("/{question_id}", response_model=QuestionAdminResponse)
async def update_question(
    question_id: str,
    data: QuestionUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Question).where(Question.id == question_id).options(selectinload(Question.options))
    q = (await db.execute(stmt)).scalar_one_or_none()
    if not q:
        raise NotFoundException(message="Question not found")

    if data.question_text is not None:
        q.question_text = data.question_text.strip()
    if data.question_type is not None:
        q.question_type = data.question_type
    if data.marks is not None:
        q.marks = data.marks
    if data.difficulty is not None:
        q.difficulty = data.difficulty
    if data.explanation is not None:
        q.explanation = data.explanation.strip() if data.explanation else None
    if data.position is not None:
        q.position = data.position

    # Replace options if provided
    if data.options is not None:
        correct_count = len([o for o in data.options if o.is_correct])
        if correct_count != 1:
            raise BadRequestException(message=f"Question must have exactly 1 correct option (received {correct_count})")

        # Delete existing options
        for opt in list(q.options):
            await db.delete(opt)
        await db.flush()

        # Add new options
        for idx, opt in enumerate(data.options, start=1):
            new_opt = QuestionOption(
                question_id=q.id,
                option_text=opt.option_text.strip(),
                position=opt.position or idx,
                is_correct=opt.is_correct,
            )
            db.add(new_opt)

    await AuditService.log_event(
        db=db,
        action=AuditAction.QUESTION_UPDATED,
        user_id=admin.id,
        resource_type="Question",
        resource_id=q.id,
    )
    await db.commit()

    q_stmt = select(Question).where(Question.id == q.id).options(selectinload(Question.options))
    updated_q = (await db.execute(q_stmt)).scalar_one()
    return updated_q


@router.delete("/{question_id}")
async def delete_question(
    question_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Question).where(Question.id == question_id)
    q = (await db.execute(stmt)).scalar_one_or_none()
    if not q:
        raise NotFoundException(message="Question not found")

    await db.delete(q)
    await AuditService.log_event(
        db=db,
        action=AuditAction.QUESTION_DELETED,
        user_id=admin.id,
        resource_type="Question",
        resource_id=question_id,
    )
    await db.commit()
    return {"message": "Question deleted successfully"}


@router.post("/quizzes/{quiz_id}/bulk-import", response_model=BulkQuestionImportResponse)
async def bulk_import_json(
    quiz_id: str,
    data: BulkQuestionImportRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await ImportExportService.import_questions(
        db=db,
        quiz_id=quiz_id,
        import_data=data,
        user_id=admin.id,
    )


@router.post("/quizzes/{quiz_id}/bulk-import-csv", response_model=BulkQuestionImportResponse)
async def bulk_import_csv(
    quiz_id: str,
    file: UploadFile = File(...),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    csv_text = content.decode("utf-8-sig", errors="replace")
    import_req = ImportExportService.parse_csv_content(csv_text)
    return await ImportExportService.import_questions(
        db=db,
        quiz_id=quiz_id,
        import_data=import_req,
        user_id=admin.id,
    )

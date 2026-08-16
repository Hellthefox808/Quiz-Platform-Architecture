from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from backend.app.models.attempt import AssessmentAttempt, AttemptStatus
from backend.app.models.audit import AuditAction
from backend.app.models.category import Category
from backend.app.models.question import Question, QuestionOption, QuestionType
from backend.app.models.quiz import Quiz, QuizStatus, QuizVersion
from backend.app.schemas.quiz import (
    QuizCreate,
    QuizPublishChecklistResponse,
    QuizStudentDetailResponse,
    QuizStudentSummaryResponse,
    QuizUpdate,
    QuizVersionConfig,
)
from backend.app.services.audit_service import AuditService


class QuizService:
    @staticmethod
    async def create_quiz(db: AsyncSession, data: QuizCreate, created_by_user_id: str) -> Quiz:
        # Verify category exists and is active
        cat_stmt = select(Category).where(Category.id == data.category_id)
        cat_res = await db.execute(cat_stmt)
        category = cat_res.scalar_one_or_none()
        if not category:
            raise NotFoundException(message="Category not found")
        if not category.is_active:
            raise BadRequestException(message="Selected category is currently inactive")

        # Create Quiz
        quiz = Quiz(
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            category_id=category.id,
            thumbnail_url=data.thumbnail_url,
            status=QuizStatus.DRAFT,
            created_by=created_by_user_id,
        )
        db.add(quiz)
        await db.flush()

        # Create initial draft QuizVersion (v1)
        cfg = data.config or QuizVersionConfig()
        version = QuizVersion(
            quiz_id=quiz.id,
            version_number=1,
            duration_seconds=cfg.duration_seconds,
            passing_percentage=cfg.passing_percentage,
            max_attempts=cfg.max_attempts,
            shuffle_questions=cfg.shuffle_questions,
            shuffle_options=cfg.shuffle_options,
            negative_marking_enabled=cfg.negative_marking_enabled,
            negative_mark_value=cfg.negative_mark_value,
            show_result_immediately=cfg.show_result_immediately,
            show_correct_answers=cfg.show_correct_answers,
            show_explanations=cfg.show_explanations,
            allow_review=cfg.allow_review,
            allow_resume=cfg.allow_resume,
            available_from=cfg.available_from,
            available_until=cfg.available_until,
        )
        db.add(version)
        await db.flush()

        await AuditService.log_event(
            db=db,
            action=AuditAction.QUIZ_CREATED,
            user_id=created_by_user_id,
            resource_type="Quiz",
            resource_id=quiz.id,
            details={"title": quiz.title, "version": 1},
        )
        await db.commit()
        await db.refresh(quiz)
        return quiz

    @staticmethod
    async def update_quiz(db: AsyncSession, quiz_id: str, data: QuizUpdate, user_id: str) -> Quiz:
        stmt = (
            select(Quiz)
            .where(Quiz.id == quiz_id)
            .options(selectinload(Quiz.versions).selectinload(QuizVersion.questions))
        )
        res = await db.execute(stmt)
        quiz = res.scalar_one_or_none()
        if not quiz:
            raise NotFoundException(message="Quiz not found")

        if data.category_id:
            cat_stmt = select(Category).where(Category.id == data.category_id)
            cat_res = await db.execute(cat_stmt)
            category = cat_res.scalar_one_or_none()
            if not category:
                raise NotFoundException(message="Category not found")
            quiz.category_id = category.id

        if data.title is not None:
            quiz.title = data.title.strip()
        if data.description is not None:
            quiz.description = data.description.strip() if data.description else None
        if data.thumbnail_url is not None:
            quiz.thumbnail_url = data.thumbnail_url
        if data.status is not None:
            quiz.status = data.status

        await AuditService.log_event(
            db=db,
            action=AuditAction.QUIZ_UPDATED,
            user_id=user_id,
            resource_type="Quiz",
            resource_id=quiz.id,
            details={"title": quiz.title, "status": quiz.status.value},
        )
        await db.commit()
        await db.refresh(quiz)
        return quiz

    @staticmethod
    async def get_quiz_admin(db: AsyncSession, quiz_id: str) -> Quiz:
        stmt = (
            select(Quiz)
            .where(Quiz.id == quiz_id)
            .options(
                selectinload(Quiz.category),
                selectinload(Quiz.versions).selectinload(QuizVersion.questions).selectinload(Question.options),
            )
        )
        res = await db.execute(stmt)
        quiz = res.scalar_one_or_none()
        if not quiz:
            raise NotFoundException(message="Quiz not found")
        return quiz

    @staticmethod
    async def list_quizzes_admin(
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        category_id: Optional[str] = None,
        status: Optional[QuizStatus] = None,
    ) -> Tuple[List[Quiz], int]:
        stmt = (
            select(Quiz)
            .options(
                selectinload(Quiz.category),
                selectinload(Quiz.versions).selectinload(QuizVersion.questions).selectinload(Question.options),
            )
        )
        if search:
            stmt = stmt.where(Quiz.title.ilike(f"%{search.strip()}%"))
        if category_id:
            stmt = stmt.where(Quiz.category_id == category_id)
        if status:
            stmt = stmt.where(Quiz.status == status)

        # Count total
        count_stmt = select(func.count(Quiz.id))
        if search:
            count_stmt = count_stmt.where(Quiz.title.ilike(f"%{search.strip()}%"))
        if category_id:
            count_stmt = count_stmt.where(Quiz.category_id == category_id)
        if status:
            count_stmt = count_stmt.where(Quiz.status == status)

        total_res = await db.execute(count_stmt)
        total = total_res.scalar_one()

        stmt = stmt.order_by(Quiz.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        res = await db.execute(stmt)
        quizzes = list(res.scalars().all())

        return quizzes, total

    @staticmethod
    async def validate_publish_checklist(db: AsyncSession, quiz_id: str) -> QuizPublishChecklistResponse:
        stmt = (
            select(Quiz)
            .where(Quiz.id == quiz_id)
            .options(
                selectinload(Quiz.category),
                selectinload(Quiz.versions).selectinload(QuizVersion.questions).selectinload(Question.options),
            )
        )
        res = await db.execute(stmt)
        quiz = res.scalar_one_or_none()
        if not quiz:
            raise NotFoundException(message="Quiz not found")

        checks = []
        blocking_issues = []

        # 1. Category check
        has_active_category = quiz.category is not None and quiz.category.is_active
        checks.append({
            "name": "Category Status",
            "passed": has_active_category,
            "details": f"Category: {quiz.category.name if quiz.category else 'None'}"
        })
        if not has_active_category:
            blocking_issues.append("Category is missing or inactive")

        # 2. Version exists
        latest_version = quiz.versions[0] if quiz.versions else None
        has_version = latest_version is not None
        checks.append({
            "name": "Quiz Version Exists",
            "passed": has_version,
            "details": f"Version: {latest_version.version_number if latest_version else 'None'}"
        })
        if not has_version:
            blocking_issues.append("Quiz has no version configured")
            return QuizPublishChecklistResponse(
                is_publishable=False,
                quiz_id=quiz.id,
                quiz_title=quiz.title,
                checks=checks,
                blocking_issues=blocking_issues,
            )

        # 3. Question count >= 1
        questions = latest_version.questions
        has_questions = len(questions) >= 1
        checks.append({
            "name": "Minimum Question Count",
            "passed": has_questions,
            "details": f"Found {len(questions)} question(s) (minimum 1 required)"
        })
        if not has_questions:
            blocking_issues.append("Quiz must have at least 1 question to be published")

        # 4. Question options validity (each MCQ must have >= 2 options and exactly 1 correct option)
        options_valid = True
        invalid_question_indices = []
        for idx, q in enumerate(questions, start=1):
            opts = q.options
            correct_opts = [o for o in opts if o.is_correct]
            if len(opts) < 2 or len(correct_opts) != 1:
                options_valid = False
                invalid_question_indices.append(idx)

        checks.append({
            "name": "Questions & Correct Options Validity",
            "passed": options_valid,
            "details": f"All questions have valid options and exactly 1 correct answer: {options_valid}"
        })
        if not options_valid:
            blocking_issues.append(f"Questions at position(s) {invalid_question_indices} must have at least 2 options and exactly 1 marked correct")

        # 5. Duration & Passing Score
        duration_valid = latest_version.duration_seconds > 0
        passing_valid = 0.0 <= latest_version.passing_percentage <= 100.0
        checks.append({
            "name": "Assessment Rules Validity",
            "passed": duration_valid and passing_valid,
            "details": f"Duration: {latest_version.duration_seconds}s, Pass Mark: {latest_version.passing_percentage}%"
        })
        if not duration_valid:
            blocking_issues.append("Duration must be greater than 0 seconds")
        if not passing_valid:
            blocking_issues.append("Passing percentage must be between 0% and 100%")

        is_publishable = len(blocking_issues) == 0
        return QuizPublishChecklistResponse(
            is_publishable=is_publishable,
            quiz_id=quiz.id,
            quiz_title=quiz.title,
            checks=checks,
            blocking_issues=blocking_issues,
        )

    @staticmethod
    async def publish_quiz(db: AsyncSession, quiz_id: str, user_id: str) -> Quiz:
        checklist = await QuizService.validate_publish_checklist(db, quiz_id)
        if not checklist.is_publishable:
            raise BadRequestException(
                message=f"Cannot publish quiz. Blocking issues: {'; '.join(checklist.blocking_issues)}",
                details={"blocking_issues": checklist.blocking_issues}
            )

        quiz = await QuizService.get_quiz_admin(db, quiz_id)
        latest_version = quiz.versions[0]
        latest_version.published_at = datetime.now(timezone.utc)
        quiz.status = QuizStatus.PUBLISHED

        await AuditService.log_event(
            db=db,
            action=AuditAction.QUIZ_PUBLISHED,
            user_id=user_id,
            resource_type="Quiz",
            resource_id=quiz.id,
            details={"version_number": latest_version.version_number, "question_count": len(latest_version.questions)},
        )
        await db.commit()
        await db.refresh(quiz)
        return quiz

    @staticmethod
    async def unpublish_quiz(db: AsyncSession, quiz_id: str, user_id: str) -> Quiz:
        quiz = await QuizService.get_quiz_admin(db, quiz_id)
        quiz.status = QuizStatus.DRAFT

        await AuditService.log_event(
            db=db,
            action=AuditAction.QUIZ_UNPUBLISHED,
            user_id=user_id,
            resource_type="Quiz",
            resource_id=quiz.id,
        )
        await db.commit()
        await db.refresh(quiz)
        return quiz

    @staticmethod
    async def list_student_quizzes(
        db: AsyncSession,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        category_id: Optional[str] = None,
    ) -> Tuple[List[QuizStudentSummaryResponse], int]:
        now = datetime.now(timezone.utc)
        stmt = (
            select(Quiz)
            .join(Category, Quiz.category_id == Category.id)
            .where(Quiz.status == QuizStatus.PUBLISHED)
            .where(Category.is_active == True)
            .options(
                selectinload(Quiz.category),
                selectinload(Quiz.versions).selectinload(QuizVersion.questions),
            )
        )
        if search:
            stmt = stmt.where(Quiz.title.ilike(f"%{search.strip()}%"))
        if category_id:
            stmt = stmt.where(Quiz.category_id == category_id)

        # Count total published
        count_stmt = (
            select(func.count(Quiz.id))
            .join(Category, Quiz.category_id == Category.id)
            .where(Quiz.status == QuizStatus.PUBLISHED)
            .where(Category.is_active == True)
        )
        if search:
            count_stmt = count_stmt.where(Quiz.title.ilike(f"%{search.strip()}%"))
        if category_id:
            count_stmt = count_stmt.where(Quiz.category_id == category_id)

        total_res = await db.execute(count_stmt)
        total = total_res.scalar_one()

        stmt = stmt.order_by(Quiz.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        res = await db.execute(stmt)
        quizzes = list(res.scalars().all())

        # Load user attempts for these quizzes
        quiz_ids = [q.id for q in quizzes]
        user_attempts_stmt = (
            select(AssessmentAttempt)
            .where(AssessmentAttempt.user_id == user_id)
            .where(AssessmentAttempt.quiz_id.in_(quiz_ids))
        )
        user_attempts_res = await db.execute(user_attempts_stmt)
        attempts = list(user_attempts_res.scalars().all())

        attempts_by_quiz: Dict[str, List[AssessmentAttempt]] = {}
        for att in attempts:
            attempts_by_quiz.setdefault(att.quiz_id, []).append(att)

        summaries = []
        for q in quizzes:
            ver = q.versions[0] if q.versions else None
            if not ver:
                continue
            
            q_attempts = attempts_by_quiz.get(q.id, [])
            completed_attempts = [a for a in q_attempts if a.status in (AttemptStatus.COMPLETED, AttemptStatus.EXPIRED)]
            best_score = max([a.percentage for a in completed_attempts], default=None)
            has_passed = any([a.passed for a in completed_attempts])
            total_marks = sum(question.marks for question in ver.questions)

            summaries.append(QuizStudentSummaryResponse(
                id=q.id,
                title=q.title,
                description=q.description,
                category_name=q.category.name if q.category else "Uncategorized",
                category_slug=q.category.slug if q.category else "",
                thumbnail_url=q.thumbnail_url,
                duration_seconds=ver.duration_seconds,
                passing_percentage=ver.passing_percentage,
                max_attempts=ver.max_attempts,
                question_count=len(ver.questions),
                total_marks=round(total_marks, 2),
                user_attempts_count=len(completed_attempts),
                user_best_score=round(best_score, 2) if best_score is not None else None,
                user_has_passed=has_passed,
                available_from=ver.available_from,
                available_until=ver.available_until,
            ))

        return summaries, total

    @staticmethod
    async def get_quiz_student_detail(db: AsyncSession, quiz_id: str, user_id: str) -> QuizStudentDetailResponse:
        stmt = (
            select(Quiz)
            .where(Quiz.id == quiz_id)
            .where(Quiz.status == QuizStatus.PUBLISHED)
            .options(
                selectinload(Quiz.category),
                selectinload(Quiz.versions).selectinload(QuizVersion.questions),
            )
        )
        res = await db.execute(stmt)
        quiz = res.scalar_one_or_none()
        if not quiz:
            raise NotFoundException(message="Quiz not found or not published")

        ver = quiz.versions[0]
        now = datetime.now(timezone.utc)

        # Check availability dates
        if ver.available_from:
            from_dt = ver.available_from.replace(tzinfo=timezone.utc) if ver.available_from.tzinfo is None else ver.available_from
            if now < from_dt:
                raise BadRequestException(message="This assessment is not available yet")

        if ver.available_until:
            until_dt = ver.available_until.replace(tzinfo=timezone.utc) if ver.available_until.tzinfo is None else ver.available_until
            if now > until_dt:
                raise BadRequestException(message="This assessment is no longer available")

        # Check user attempts
        user_attempts_stmt = (
            select(AssessmentAttempt)
            .where(AssessmentAttempt.user_id == user_id)
            .where(AssessmentAttempt.quiz_id == quiz.id)
            .order_by(AssessmentAttempt.started_at.desc())
        )
        user_attempts_res = await db.execute(user_attempts_stmt)
        attempts = list(user_attempts_res.scalars().all())

        active_attempt = next((a for a in attempts if a.status == AttemptStatus.IN_PROGRESS), None)
        completed_count = len([a for a in attempts if a.status in (AttemptStatus.COMPLETED, AttemptStatus.EXPIRED)])

        # Check eligibility
        user_can_attempt = (active_attempt is not None and ver.allow_resume) or (completed_count < ver.max_attempts)
        total_marks = sum(question.marks for question in ver.questions)

        return QuizStudentDetailResponse(
            id=quiz.id,
            title=quiz.title,
            description=quiz.description,
            category_name=quiz.category.name if quiz.category else "Uncategorized",
            category_slug=quiz.category.slug if quiz.category else "",
            thumbnail_url=quiz.thumbnail_url,
            duration_seconds=ver.duration_seconds,
            passing_percentage=ver.passing_percentage,
            max_attempts=ver.max_attempts,
            negative_marking_enabled=ver.negative_marking_enabled,
            negative_mark_value=ver.negative_mark_value,
            allow_review=ver.allow_review,
            allow_resume=ver.allow_resume,
            question_count=len(ver.questions),
            total_marks=round(total_marks, 2),
            user_attempts_count=completed_count,
            user_can_attempt=user_can_attempt,
            active_attempt_id=active_attempt.id if active_attempt else None,
            available_from=ver.available_from,
            available_until=ver.available_until,
        )

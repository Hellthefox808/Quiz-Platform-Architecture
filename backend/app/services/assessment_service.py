import random
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.core.exceptions import (
    AttemptAlreadyCompletedException,
    AttemptExpiredException,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
)
from backend.app.models.attempt import Answer, AssessmentAttempt, AttemptQuestion, AttemptStatus
from backend.app.models.audit import AuditAction
from backend.app.models.certificate import Certificate
from backend.app.models.notification import Notification
from backend.app.models.question import Question, QuestionOption
from backend.app.models.quiz import Quiz, QuizStatus, QuizVersion
from backend.app.models.result import Result
from backend.app.models.user import User, UserRole, UserStatus
from backend.app.schemas.attempt import (
    AttemptQuestionStudentView,
    AttemptStudentResponse,
    SaveAnswerRequest,
    SaveAnswerResponse,
)
from backend.app.schemas.question import QuestionOptionStudentResponse
from backend.app.schemas.result import OptionReviewResponse, QuestionReviewResponse, ResultResponse
from backend.app.services.audit_service import AuditService
from backend.app.services.scoring_service import ScoringService


class AssessmentService:
    @staticmethod
    async def start_attempt(db: AsyncSession, quiz_id: str, user: User, ip_address: Optional[str] = None) -> AssessmentAttempt:
        if user.status != UserStatus.ACTIVE:
            raise ForbiddenException(message="Your account is not active")

        # Load quiz with versions and questions
        stmt = (
            select(Quiz)
            .where(Quiz.id == quiz_id)
            .where(Quiz.status == QuizStatus.PUBLISHED)
            .options(
                selectinload(Quiz.versions).selectinload(QuizVersion.questions).selectinload(Question.options)
            )
        )
        res = await db.execute(stmt)
        quiz = res.scalar_one_or_none()
        if not quiz:
            raise NotFoundException(message="Quiz not found or is not published")

        latest_version = quiz.versions[0] if quiz.versions else None
        if not latest_version or not latest_version.questions:
            raise BadRequestException(message="Quiz has no published questions")

        now = datetime.now(timezone.utc)

        # Check availability
        if latest_version.available_from:
            from_dt = latest_version.available_from.replace(tzinfo=timezone.utc) if latest_version.available_from.tzinfo is None else latest_version.available_from
            if now < from_dt:
                raise BadRequestException(message="This assessment is not available yet")
        if latest_version.available_until:
            until_dt = latest_version.available_until.replace(tzinfo=timezone.utc) if latest_version.available_until.tzinfo is None else latest_version.available_until
            if now > until_dt:
                raise BadRequestException(message="This assessment has ended")

        # Check existing user attempts for this quiz
        attempts_stmt = (
            select(AssessmentAttempt)
            .where(AssessmentAttempt.user_id == user.id)
            .where(AssessmentAttempt.quiz_id == quiz.id)
            .order_by(AssessmentAttempt.started_at.desc())
        )
        attempts_res = await db.execute(attempts_stmt)
        past_attempts = list(attempts_res.scalars().all())

        # Check for active attempt
        for past_att in past_attempts:
            if past_att.status == AttemptStatus.IN_PROGRESS:
                att_expires = past_att.expires_at.replace(tzinfo=timezone.utc) if past_att.expires_at.tzinfo is None else past_att.expires_at
                if now < att_expires:
                    if latest_version.allow_resume:
                        return past_att
                    else:
                        raise BadRequestException(message="You already have an active attempt for this quiz")
                else:
                    # Auto-expire past attempt
                    await AssessmentService.submit_attempt(db, past_att.id, user, auto_submitted=True)

        completed_count = len([a for a in past_attempts if a.status in (AttemptStatus.COMPLETED, AttemptStatus.EXPIRED)])
        if completed_count >= latest_version.max_attempts:
            raise BadRequestException(message=f"Maximum attempt limit ({latest_version.max_attempts}) reached for this quiz")

        # Create new Attempt pinned to this version
        started_at = now
        expires_at = started_at + timedelta(seconds=latest_version.duration_seconds)

        attempt = AssessmentAttempt(
            user_id=user.id,
            quiz_id=quiz.id,
            quiz_version_id=latest_version.id,
            status=AttemptStatus.IN_PROGRESS,
            started_at=started_at,
            expires_at=expires_at,
        )
        db.add(attempt)
        await db.flush()

        # Prepare questions snapshot
        questions_list = list(latest_version.questions)
        if latest_version.shuffle_questions:
            random.shuffle(questions_list)

        for order, q in enumerate(questions_list, start=1):
            options_list = list(q.options)
            if latest_version.shuffle_options:
                random.shuffle(options_list)

            # Build sanitized options (WITHOUT is_correct)
            sanitized_options = [
                {"id": opt.id, "option_text": opt.option_text, "position": idx}
                for idx, opt in enumerate(options_list, start=1)
            ]

            snapshot = {
                "question_text": q.question_text,
                "question_type": q.question_type.value,
                "marks": q.marks,
                "difficulty": q.difficulty.value,
                "options": sanitized_options,
            }

            attempt_q = AttemptQuestion(
                attempt_id=attempt.id,
                question_id=q.id,
                question_order=order,
                marks=q.marks,
                question_snapshot=snapshot,
            )
            db.add(attempt_q)

        await AuditService.log_event(
            db=db,
            action=AuditAction.ATTEMPT_STARTED,
            user_id=user.id,
            resource_type="AssessmentAttempt",
            resource_id=attempt.id,
            ip_address=ip_address,
            details={"quiz_id": quiz.id, "quiz_version_id": latest_version.id},
        )
        await db.commit()
        await db.refresh(attempt)
        return attempt

    @staticmethod
    async def get_student_attempt_view(db: AsyncSession, attempt_id: str, user: User) -> AttemptStudentResponse:
        stmt = (
            select(AssessmentAttempt)
            .where(AssessmentAttempt.id == attempt_id)
            .options(
                selectinload(AssessmentAttempt.quiz),
                selectinload(AssessmentAttempt.quiz_version),
                selectinload(AssessmentAttempt.attempt_questions).selectinload(AttemptQuestion.answers),
                selectinload(AssessmentAttempt.answers),
            )
        )
        res = await db.execute(stmt)
        attempt = res.scalar_one_or_none()
        if not attempt:
            raise NotFoundException(message="Assessment attempt not found")

        # Object-Level Authorization Check (BOLA / IDOR protection)
        if attempt.user_id != user.id and user.role != UserRole.ADMIN:
            raise ForbiddenException(message="You are not authorized to view this attempt")

        now = datetime.now(timezone.utc)
        expires_at = attempt.expires_at.replace(tzinfo=timezone.utc) if attempt.expires_at.tzinfo is None else attempt.expires_at

        # Check expiration for in-progress attempts
        if attempt.status == AttemptStatus.IN_PROGRESS and now >= expires_at:
            await AssessmentService.submit_attempt(db, attempt.id, user, auto_submitted=True)
            await db.refresh(attempt)

        # Build answer map
        answers_map: Dict[str, str] = {}
        for ans in attempt.answers:
            if ans.selected_option_id:
                answers_map[ans.attempt_question_id] = ans.selected_option_id

        # Format questions
        q_views: List[AttemptQuestionStudentView] = []
        for aq in sorted(attempt.attempt_questions, key=lambda x: x.question_order):
            snap = aq.question_snapshot
            options = [
                QuestionOptionStudentResponse(
                    id=opt["id"],
                    option_text=opt["option_text"],
                    position=opt["position"]
                )
                for opt in snap.get("options", [])
            ]
            q_views.append(
                AttemptQuestionStudentView(
                    attempt_question_id=aq.id,
                    question_order=aq.question_order,
                    marks=aq.marks,
                    question_text=snap.get("question_text", ""),
                    options=options,
                    selected_option_id=answers_map.get(aq.id),
                )
            )

        answered_count = len(answers_map)

        return AttemptStudentResponse(
            id=attempt.id,
            quiz_id=attempt.quiz_id,
            quiz_title=attempt.quiz.title,
            quiz_version_id=attempt.quiz_version_id,
            status=attempt.status,
            started_at=attempt.started_at,
            expires_at=attempt.expires_at,
            server_time=now,
            duration_seconds=attempt.quiz_version.duration_seconds,
            questions=q_views,
            total_questions=len(q_views),
            answered_count=answered_count,
        )

    @staticmethod
    async def save_answer(db: AsyncSession, attempt_id: str, data: SaveAnswerRequest, user: User) -> SaveAnswerResponse:
        stmt = (
            select(AssessmentAttempt)
            .where(AssessmentAttempt.id == attempt_id)
            .options(selectinload(AssessmentAttempt.attempt_questions))
        )
        res = await db.execute(stmt)
        attempt = res.scalar_one_or_none()
        if not attempt:
            raise NotFoundException(message="Assessment attempt not found")

        # Object-Level Authorization Check
        if attempt.user_id != user.id:
            raise ForbiddenException(message="You do not have permission to modify this attempt")

        if attempt.status != AttemptStatus.IN_PROGRESS:
            raise AttemptAlreadyCompletedException(message=f"Cannot save answer. Attempt status is {attempt.status.value}")

        now = datetime.now(timezone.utc)
        expires_at = attempt.expires_at.replace(tzinfo=timezone.utc) if attempt.expires_at.tzinfo is None else attempt.expires_at

        # Check server-authoritative timer
        if now >= expires_at:
            await AssessmentService.submit_attempt(db, attempt_id, user, auto_submitted=True)
            raise AttemptExpiredException(message="Assessment attempt has expired. Your responses have been auto-submitted.")

        # Verify attempt_question belongs to this attempt
        target_aq = next((aq for aq in attempt.attempt_questions if aq.id == data.attempt_question_id), None)
        if not target_aq:
            raise BadRequestException(message="Question does not belong to this attempt")

        # Verify selected option exists in question snapshot (if selected)
        if data.selected_option_id:
            valid_option_ids = [opt["id"] for opt in target_aq.question_snapshot.get("options", [])]
            if data.selected_option_id not in valid_option_ids:
                raise BadRequestException(message="Selected option is invalid for this question")

        # Check existing Answer
        ans_stmt = (
            select(Answer)
            .where(Answer.attempt_id == attempt_id)
            .where(Answer.attempt_question_id == data.attempt_question_id)
        )
        ans_res = await db.execute(ans_stmt)
        existing_answer = ans_res.scalar_one_or_none()

        if existing_answer:
            existing_answer.selected_option_id = data.selected_option_id
            existing_answer.answered_at = now
        else:
            new_ans = Answer(
                attempt_id=attempt_id,
                attempt_question_id=data.attempt_question_id,
                selected_option_id=data.selected_option_id,
                answered_at=now,
            )
            db.add(new_ans)

        await db.commit()

        return SaveAnswerResponse(
            attempt_id=attempt_id,
            attempt_question_id=data.attempt_question_id,
            selected_option_id=data.selected_option_id,
            saved_at=now,
            status="SAVED",
        )

    @staticmethod
    async def submit_attempt(db: AsyncSession, attempt_id: str, user: User, auto_submitted: bool = False) -> ResultResponse:
        stmt = (
            select(AssessmentAttempt)
            .where(AssessmentAttempt.id == attempt_id)
            .options(
                selectinload(AssessmentAttempt.quiz),
                selectinload(AssessmentAttempt.quiz_version),
                selectinload(AssessmentAttempt.attempt_questions),
                selectinload(AssessmentAttempt.answers),
                selectinload(AssessmentAttempt.result),
            )
        )
        res = await db.execute(stmt)
        attempt = res.scalar_one_or_none()
        if not attempt:
            raise NotFoundException(message="Assessment attempt not found")

        # Authorization
        if attempt.user_id != user.id and user.role != UserRole.ADMIN:
            raise ForbiddenException(message="You are not authorized to submit this attempt")

        # Idempotency: If already completed/expired, return existing result without error or duplicate calculations
        if attempt.status in (AttemptStatus.COMPLETED, AttemptStatus.EXPIRED) and attempt.result:
            return await AssessmentService.get_result(db, attempt.result.id, user)

        now = datetime.now(timezone.utc)
        started_at = attempt.started_at.replace(tzinfo=timezone.utc) if attempt.started_at.tzinfo is None else attempt.started_at
        time_taken_seconds = max(1, int((now - started_at).total_seconds()))

        # Load correct options from DB
        question_ids = [aq.question_id for aq in attempt.attempt_questions]
        q_stmt = (
            select(Question)
            .where(Question.id.in_(question_ids))
            .options(selectinload(Question.options))
        )
        q_res = await db.execute(q_stmt)
        db_questions = {q.id: q for q in q_res.scalars().all()}

        # Build list for pure scoring service
        scoring_input = []
        for aq in attempt.attempt_questions:
            db_q = db_questions.get(aq.question_id)
            correct_opt = next((o for o in db_q.options if o.is_correct), None) if db_q else None
            scoring_input.append({
                "attempt_question_id": aq.id,
                "question_id": aq.question_id,
                "marks": aq.marks,
                "correct_option_id": correct_opt.id if correct_opt else "",
            })

        # Answer lookup
        answers_map = {ans.attempt_question_id: ans.selected_option_id for ans in attempt.answers}

        # Evaluate scoring
        ver = attempt.quiz_version
        eval_result = ScoringService.evaluate_attempt(
            questions_with_options=scoring_input,
            answers_by_attempt_q_id=answers_map,
            passing_percentage=ver.passing_percentage,
            negative_marking_enabled=ver.negative_marking_enabled,
            negative_mark_value=ver.negative_mark_value,
        )

        # Update answers with marks_awarded and is_correct
        eval_by_aq_id = {item["attempt_question_id"]: item for item in eval_result.answers_evaluation}
        for ans in attempt.answers:
            ev = eval_by_aq_id.get(ans.attempt_question_id)
            if ev:
                ans.is_correct = ev["is_correct"]
                ans.marks_awarded = ev["marks_awarded"]

        # Update Attempt
        attempt.status = AttemptStatus.EXPIRED if auto_submitted else AttemptStatus.COMPLETED
        if auto_submitted:
            attempt.auto_submitted_at = now
        else:
            attempt.submitted_at = now

        attempt.score = eval_result.obtained_marks
        attempt.percentage = eval_result.percentage
        attempt.passed = eval_result.passed
        attempt.correct_answers = eval_result.correct_count
        attempt.incorrect_answers = eval_result.incorrect_count
        attempt.unanswered = eval_result.unanswered_count
        attempt.total_marks = eval_result.total_marks
        attempt.obtained_marks = eval_result.obtained_marks
        attempt.time_taken_seconds = min(time_taken_seconds, ver.duration_seconds)

        # Create or update Result
        result_record = attempt.result
        if not result_record:
            result_record = Result(
                attempt_id=attempt.id,
                user_id=attempt.user_id,
                quiz_id=attempt.quiz_id,
                quiz_version_id=attempt.quiz_version_id,
                final_score=eval_result.obtained_marks,
                percentage=eval_result.percentage,
                passed=eval_result.passed,
                total_marks=eval_result.total_marks,
                obtained_marks=eval_result.obtained_marks,
                correct_count=eval_result.correct_count,
                incorrect_count=eval_result.incorrect_count,
                unanswered_count=eval_result.unanswered_count,
                time_taken_seconds=attempt.time_taken_seconds,
            )
            db.add(result_record)
            await db.flush()

        # Idempotent Certificate generation on pass
        cert_code = None
        if eval_result.passed:
            cert_stmt = select(Certificate).where(Certificate.attempt_id == attempt.id)
            cert_res = await db.execute(cert_stmt)
            cert = cert_res.scalar_one_or_none()
            if not cert:
                cert_code = f"CERT-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"
                cert = Certificate(
                    certificate_code=cert_code,
                    user_id=attempt.user_id,
                    attempt_id=attempt.id,
                    quiz_id=attempt.quiz_id,
                    issued_at=now,
                )
                db.add(cert)
                await AuditService.log_event(
                    db=db,
                    action=AuditAction.CERTIFICATE_ISSUED,
                    user_id=attempt.user_id,
                    resource_type="Certificate",
                    resource_id=cert.id,
                    details={"code": cert_code, "quiz_id": attempt.quiz_id},
                )
            else:
                cert_code = cert.certificate_code

        # Add Notification
        status_msg = "PASSED" if eval_result.passed else "DID NOT PASS"
        notif = Notification(
            user_id=attempt.user_id,
            title=f"Assessment Complete: {attempt.quiz.title}",
            message=f"You completed '{attempt.quiz.title}' with a score of {eval_result.percentage}% ({status_msg}).",
            link=f"/results/{result_record.id}",
        )
        db.add(notif)

        # Audit
        action = AuditAction.ATTEMPT_AUTO_SUBMITTED if auto_submitted else AuditAction.ATTEMPT_SUBMITTED
        await AuditService.log_event(
            db=db,
            action=action,
            user_id=attempt.user_id,
            resource_type="AssessmentAttempt",
            resource_id=attempt.id,
            details={
                "score": eval_result.obtained_marks,
                "percentage": eval_result.percentage,
                "passed": eval_result.passed,
                "auto_submitted": auto_submitted,
            },
        )

        await db.commit()
        await db.refresh(result_record)

        return await AssessmentService.get_result(db, result_record.id, user)

    @staticmethod
    async def get_result(db: AsyncSession, result_id: str, user: User) -> ResultResponse:
        stmt = (
            select(Result)
            .where(Result.id == result_id)
            .options(
                selectinload(Result.attempt).selectinload(AssessmentAttempt.quiz_version).selectinload(QuizVersion.questions).selectinload(Question.options),
                selectinload(Result.attempt).selectinload(AssessmentAttempt.attempt_questions),
                selectinload(Result.attempt).selectinload(AssessmentAttempt.answers),
                selectinload(Result.quiz),
                selectinload(Result.user),
            )
        )
        res = await db.execute(stmt)
        result = res.scalar_one_or_none()
        if not result:
            raise NotFoundException(message="Result not found")

        # Object-Level Authorization Check
        if result.user_id != user.id and user.role != UserRole.ADMIN:
            raise ForbiddenException(message="You do not have permission to view this result")

        attempt = result.attempt
        ver = attempt.quiz_version

        # Look up certificate if passed
        cert_code = None
        if result.passed:
            cert_stmt = select(Certificate).where(Certificate.attempt_id == attempt.id)
            cert_res = await db.execute(cert_stmt)
            cert = cert_res.scalar_one_or_none()
            if cert:
                cert_code = cert.certificate_code

        # Answer Review Serialization based on quiz rules
        questions_review = None
        if ver.allow_review or user.role == UserRole.ADMIN:
            questions_review = []
            db_questions = {q.id: q for q in ver.questions}
            answers_by_aq_id = {ans.attempt_question_id: ans for ans in attempt.answers}

            for aq in sorted(attempt.attempt_questions, key=lambda x: x.question_order):
                db_q = db_questions.get(aq.question_id)
                ans = answers_by_aq_id.get(aq.id)
                selected_opt_id = ans.selected_option_id if ans else None

                # Build options review
                opts_review = []
                for opt in aq.question_snapshot.get("options", []):
                    opt_id = opt["id"]
                    is_selected = (selected_opt_id == opt_id)
                    
                    # Determine whether is_correct should be shown
                    is_correct_flag = None
                    if ver.show_correct_answers or user.role == UserRole.ADMIN:
                        # Check DB question for official correctness
                        db_opt = next((o for o in db_q.options if o.id == opt_id), None) if db_q else None
                        is_correct_flag = db_opt.is_correct if db_opt else False

                    opts_review.append(
                        OptionReviewResponse(
                            id=opt_id,
                            option_text=opt["option_text"],
                            is_selected=is_selected,
                            is_correct=is_correct_flag,
                        )
                    )

                explanation = None
                if (ver.show_explanations or user.role == UserRole.ADMIN) and db_q:
                    explanation = db_q.explanation

                questions_review.append(
                    QuestionReviewResponse(
                        question_order=aq.question_order,
                        question_text=aq.question_snapshot.get("question_text", ""),
                        marks=aq.marks,
                        marks_awarded=ans.marks_awarded if ans else 0.0,
                        difficulty=aq.question_snapshot.get("difficulty", "MEDIUM"),
                        options=opts_review,
                        selected_option_id=selected_opt_id,
                        is_correct=ans.is_correct if ans else False,
                        explanation=explanation,
                    )
                )

        submitted_dt = attempt.submitted_at or attempt.auto_submitted_at or result.created_at

        return ResultResponse(
            id=result.id,
            attempt_id=attempt.id,
            user_id=result.user_id,
            quiz_id=result.quiz_id,
            quiz_title=result.quiz.title,
            final_score=result.final_score,
            percentage=result.percentage,
            passed=result.passed,
            passing_percentage=ver.passing_percentage,
            total_marks=result.total_marks,
            obtained_marks=result.obtained_marks,
            correct_count=result.correct_count,
            incorrect_count=result.incorrect_count,
            unanswered_count=result.unanswered_count,
            time_taken_seconds=result.time_taken_seconds,
            submitted_at=submitted_dt,
            allow_review=ver.allow_review,
            show_correct_answers=ver.show_correct_answers,
            show_explanations=ver.show_explanations,
            certificate_code=cert_code,
            questions_review=questions_review,
        )

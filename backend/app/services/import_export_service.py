import csv
import io
import json
from typing import Any, Dict, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.exceptions import BadRequestException, NotFoundException
from backend.app.models.audit import AuditAction
from backend.app.models.question import DifficultyLevel, Question, QuestionOption, QuestionType
from backend.app.models.quiz import Quiz, QuizStatus, QuizVersion
from backend.app.schemas.question import (
    BulkImportError,
    BulkQuestionImportRequest,
    BulkQuestionImportResponse,
    BulkQuestionItem,
)
from backend.app.services.audit_service import AuditService


class ImportExportService:
    @staticmethod
    async def import_questions(
        db: AsyncSession,
        quiz_id: str,
        import_data: BulkQuestionImportRequest,
        user_id: str,
    ) -> BulkQuestionImportResponse:
        # Load latest quiz version
        stmt = select(Quiz).where(Quiz.id == quiz_id)
        res = await db.execute(stmt)
        quiz = res.scalar_one_or_none()
        if not quiz:
            raise NotFoundException(message="Quiz not found")

        ver_stmt = select(QuizVersion).where(QuizVersion.quiz_id == quiz.id).order_by(QuizVersion.version_number.desc())
        ver_res = await db.execute(ver_stmt)
        latest_version = ver_res.scalars().first()
        if not latest_version:
            raise BadRequestException(message="Quiz has no valid version")

        errors: List[BulkImportError] = []
        valid_questions: List[Tuple[Question, List[QuestionOption]]] = []

        # Find current highest position
        pos_stmt = select(func.max(Question.position)).where(Question.quiz_version_id == latest_version.id)
        pos_res = await db.execute(pos_stmt)
        current_max_pos = pos_res.scalar() or 0

        for row_idx, item in enumerate(import_data.questions, start=1):
            # Validate question text
            q_text = item.question_text.strip()
            if len(q_text) < 3:
                errors.append(BulkImportError(row=row_idx, error="Question text must be at least 3 characters"))
                continue

            # Validate options
            opts = [o.strip() for o in item.options if o and o.strip()]
            if len(opts) < 2:
                errors.append(BulkImportError(row=row_idx, error="Question must have at least 2 non-empty options"))
                continue

            # Validate correct option index
            if item.correct_option_index < 0 or item.correct_option_index >= len(opts):
                errors.append(BulkImportError(row=row_idx, error=f"Invalid correct_option_index: {item.correct_option_index} (must be 0 to {len(opts)-1})"))
                continue

            if item.marks <= 0:
                errors.append(BulkImportError(row=row_idx, error="Marks must be greater than 0"))
                continue

            current_max_pos += 1
            new_q = Question(
                quiz_version_id=latest_version.id,
                question_text=q_text,
                question_type=QuestionType.MCQ_SINGLE,
                marks=item.marks,
                difficulty=item.difficulty,
                explanation=item.explanation.strip() if item.explanation else None,
                position=current_max_pos,
            )

            new_options = [
                QuestionOption(
                    option_text=opt_text,
                    position=opt_idx,
                    is_correct=(opt_idx == item.correct_option_index),
                )
                for opt_idx, opt_text in enumerate(opts)
            ]

            valid_questions.append((new_q, new_options))

        # Transactional insertion for valid questions
        for q, options in valid_questions:
            db.add(q)
            await db.flush()
            for opt in options:
                opt.question_id = q.id
                db.add(opt)

        if valid_questions:
            await AuditService.log_event(
                db=db,
                action=AuditAction.QUESTION_CREATED,
                user_id=user_id,
                resource_type="Question",
                resource_id=quiz.id,
                details={"bulk_imported_count": len(valid_questions)},
            )
            await db.commit()

        return BulkQuestionImportResponse(
            total_processed=len(import_data.questions),
            imported_count=len(valid_questions),
            failed_count=len(errors),
            errors=errors,
        )

    @staticmethod
    def parse_csv_content(csv_text: str) -> BulkQuestionImportRequest:
        """
        Parses CSV with header:
        question_text,option_a,option_b,option_c,option_d,correct_option,marks,difficulty,explanation
        where correct_option can be A/B/C/D or 0/1/2/3.
        """
        reader = csv.DictReader(io.StringIO(csv_text))
        questions = []
        
        for row in reader:
            q_text = row.get("question_text", "").strip()
            if not q_text:
                continue

            opts = []
            for col in ["option_a", "option_b", "option_c", "option_d", "option_e", "option_f"]:
                val = row.get(col, "").strip()
                if val:
                    opts.append(val)

            correct_raw = row.get("correct_option", "A").strip().upper()
            letter_map = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5}
            correct_idx = letter_map.get(correct_raw, 0)
            if correct_raw.isdigit():
                correct_idx = int(correct_raw)

            marks = float(row.get("marks", 1.0) or 1.0)
            diff_raw = row.get("difficulty", "MEDIUM").strip().upper()
            difficulty = DifficultyLevel.MEDIUM
            if diff_raw in ["EASY", "MEDIUM", "HARD"]:
                difficulty = DifficultyLevel(diff_raw)

            explanation = row.get("explanation", "").strip() or None

            questions.append(
                BulkQuestionItem(
                    question_text=q_text,
                    options=opts,
                    correct_option_index=correct_idx,
                    marks=marks,
                    difficulty=difficulty,
                    explanation=explanation,
                )
            )

        return BulkQuestionImportRequest(questions=questions)

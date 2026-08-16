from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.models.attempt import Answer, AssessmentAttempt, AttemptQuestion, AttemptStatus
from backend.app.models.category import Category
from backend.app.models.question import Question
from backend.app.models.quiz import Quiz, QuizStatus, QuizVersion
from backend.app.models.result import Result
from backend.app.models.user import User, UserRole, UserStatus
from backend.app.schemas.analytics import (
    AdminAnalyticsResponse,
    QuestionMetric,
    QuizPerformanceSummary,
    ScoreDistributionBucket,
    StudentAnalyticsResponse,
    TimeSeriesPoint,
)


class AnalyticsService:
    @staticmethod
    async def get_admin_analytics(db: AsyncSession) -> AdminAnalyticsResponse:
        # User counts
        users_count_stmt = select(func.count(User.id))
        total_users = (await db.execute(users_count_stmt)).scalar_one()

        active_users_stmt = select(func.count(User.id)).where(User.status == UserStatus.ACTIVE)
        active_users = (await db.execute(active_users_stmt)).scalar_one()

        # Quiz counts
        total_quizzes = (await db.execute(select(func.count(Quiz.id)))).scalar_one()
        published_quizzes = (await db.execute(select(func.count(Quiz.id)).where(Quiz.status == QuizStatus.PUBLISHED))).scalar_one()

        # Question count
        total_questions = (await db.execute(select(func.count(Question.id)))).scalar_one()

        # Attempts
        total_attempts = (await db.execute(select(func.count(AssessmentAttempt.id)))).scalar_one()
        completed_stmt = select(AssessmentAttempt).where(AssessmentAttempt.status.in_([AttemptStatus.COMPLETED, AttemptStatus.EXPIRED]))
        completed_res = await db.execute(completed_stmt)
        completed_attempts_list = list(completed_res.scalars().all())
        completed_count = len(completed_attempts_list)

        # Average score and pass rate
        if completed_count > 0:
            avg_score = sum(a.percentage for a in completed_attempts_list) / completed_count
            passed_count = len([a for a in completed_attempts_list if a.passed])
            overall_pass_rate = (passed_count / completed_count) * 100.0
        else:
            avg_score = 0.0
            overall_pass_rate = 0.0

        # Score distribution (0-20, 21-40, 41-60, 61-80, 81-100)
        buckets = [
            {"range_label": "0-20%", "min": 0.0, "max": 20.0, "count": 0},
            {"range_label": "21-40%", "min": 20.01, "max": 40.0, "count": 0},
            {"range_label": "41-60%", "min": 40.01, "max": 60.0, "count": 0},
            {"range_label": "61-80%", "min": 60.01, "max": 80.0, "count": 0},
            {"range_label": "81-100%", "min": 80.01, "max": 100.0, "count": 0},
        ]
        for a in completed_attempts_list:
            for b in buckets:
                if b["min"] <= a.percentage <= b["max"]:
                    b["count"] += 1
                    break

        score_distribution = [
            ScoreDistributionBucket(
                range_label=b["range_label"],
                count=b["count"],
                percentage=round((b["count"] / completed_count) * 100.0, 1) if completed_count > 0 else 0.0
            )
            for b in buckets
        ]

        # Attempts trend (last 7 days)
        now = datetime.now(timezone.utc)
        attempts_trend: List[TimeSeriesPoint] = []
        for i in range(6, -1, -1):
            day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            date_str = day_start.strftime("%Y-%m-%d")

            day_attempts = [
                a for a in completed_attempts_list
                if a.started_at.replace(tzinfo=timezone.utc) >= day_start and a.started_at.replace(tzinfo=timezone.utc) < day_end
            ]
            day_passed = len([a for a in day_attempts if a.passed])
            day_avg = (sum(a.percentage for a in day_attempts) / len(day_attempts)) if day_attempts else 0.0

            attempts_trend.append(
                TimeSeriesPoint(
                    date=date_str,
                    count=len(day_attempts),
                    passed_count=day_passed,
                    average_score=round(day_avg, 1)
                )
            )

        # Popular quizzes
        quizzes_stmt = select(Quiz).options(selectinload(Quiz.category), selectinload(Quiz.attempts))
        quizzes_res = await db.execute(quizzes_stmt)
        quizzes = list(quizzes_res.scalars().all())

        popular_quizzes: List[QuizPerformanceSummary] = []
        for q in quizzes:
            q_completed = [a for a in q.attempts if a.status in [AttemptStatus.COMPLETED, AttemptStatus.EXPIRED]]
            if q_completed:
                q_avg = sum(a.percentage for a in q_completed) / len(q_completed)
                q_passed = len([a for a in q_completed if a.passed])
                q_pass_rate = (q_passed / len(q_completed)) * 100.0
                popular_quizzes.append(
                    QuizPerformanceSummary(
                        quiz_id=q.id,
                        title=q.title,
                        category_name=q.category.name if q.category else "General",
                        total_attempts=len(q_completed),
                        average_score=round(q_avg, 1),
                        pass_rate=round(q_pass_rate, 1),
                    )
                )

        popular_quizzes.sort(key=lambda x: x.total_attempts, reverse=True)

        return AdminAnalyticsResponse(
            total_users=total_users,
            active_users=active_users,
            total_quizzes=total_quizzes,
            published_quizzes=published_quizzes,
            total_questions=total_questions,
            total_attempts=total_attempts,
            completed_attempts=completed_count,
            average_score=round(avg_score, 1),
            overall_pass_rate=round(overall_pass_rate, 1),
            attempts_trend=attempts_trend,
            score_distribution=score_distribution,
            popular_quizzes=popular_quizzes[:5],
            recent_attempts_count=len([a for a in completed_attempts_list if a.started_at.replace(tzinfo=timezone.utc) >= (now - timedelta(days=1))]),
        )

    @staticmethod
    async def get_question_analytics(db: AsyncSession, quiz_id: Optional[str] = None) -> List[QuestionMetric]:
        stmt = (
            select(Question)
            .join(QuizVersion, Question.quiz_version_id == QuizVersion.id)
            .join(Quiz, QuizVersion.quiz_id == Quiz.id)
            .options(
                selectinload(Question.quiz_version).selectinload(QuizVersion.quiz),
            )
        )
        if quiz_id:
            stmt = stmt.where(QuizVersion.quiz_id == quiz_id)

        res = await db.execute(stmt)
        questions = list(res.scalars().all())

        metrics = []
        for q in questions:
            # Query attempt answers for this question
            ans_stmt = (
                select(Answer)
                .join(AttemptQuestion, Answer.attempt_question_id == AttemptQuestion.id)
                .where(AttemptQuestion.question_id == q.id)
            )
            ans_res = await db.execute(ans_stmt)
            answers = list(ans_res.scalars().all())

            total_ans = len(answers)
            correct_count = len([a for a in answers if a.is_correct is True])
            unanswered_count = len([a for a in answers if not a.selected_option_id])
            incorrect_count = total_ans - correct_count - unanswered_count

            correct_pct = (correct_count / total_ans * 100.0) if total_ans > 0 else 0.0
            difficulty_idx = (incorrect_count / total_ans) if total_ans > 0 else 0.0

            metrics.append(
                QuestionMetric(
                    question_id=q.id,
                    question_text=q.question_text,
                    quiz_title=q.quiz_version.quiz.title if q.quiz_version and q.quiz_version.quiz else "Quiz",
                    difficulty=q.difficulty.value,
                    total_attempts=total_ans,
                    correct_count=correct_count,
                    incorrect_count=incorrect_count,
                    unanswered_count=unanswered_count,
                    correct_percentage=round(correct_pct, 1),
                    difficulty_index=round(difficulty_idx, 2),
                )
            )

        return metrics

    @staticmethod
    async def get_student_analytics(db: AsyncSession, user_id: str) -> StudentAnalyticsResponse:
        stmt = (
            select(AssessmentAttempt)
            .where(AssessmentAttempt.user_id == user_id)
            .where(AssessmentAttempt.status.in_([AttemptStatus.COMPLETED, AttemptStatus.EXPIRED]))
            .options(
                selectinload(AssessmentAttempt.quiz).selectinload(Quiz.category),
            )
            .order_by(AssessmentAttempt.started_at.asc())
        )
        res = await db.execute(stmt)
        attempts = list(res.scalars().all())

        total_attempts = len(attempts)
        passed_attempts = len([a for a in attempts if a.passed])
        failed_attempts = total_attempts - passed_attempts
        pass_rate = round((passed_attempts / total_attempts) * 100.0, 1) if total_attempts > 0 else 0.0
        avg_score = round(sum(a.percentage for a in attempts) / total_attempts, 1) if total_attempts > 0 else 0.0
        highest_score = round(max([a.percentage for a in attempts], default=0.0), 1)
        total_time = sum(a.time_taken_seconds for a in attempts)

        # Category breakdown
        cat_stats: Dict[str, Dict[str, Any]] = {}
        for a in attempts:
            cat_name = a.quiz.category.name if a.quiz and a.quiz.category else "Uncategorized"
            if cat_name not in cat_stats:
                cat_stats[cat_name] = {"category": cat_name, "attempts": 0, "passed": 0, "total_percentage": 0.0}
            cat_stats[cat_name]["attempts"] += 1
            if a.passed:
                cat_stats[cat_name]["passed"] += 1
            cat_stats[cat_name]["total_percentage"] += a.percentage

        category_breakdown = []
        for c in cat_stats.values():
            category_breakdown.append({
                "category": c["category"],
                "attempts": c["attempts"],
                "passed": c["passed"],
                "avg_percentage": round(c["total_percentage"] / c["attempts"], 1) if c["attempts"] > 0 else 0.0,
            })

        # Recent trend
        recent_trend = [
            TimeSeriesPoint(
                date=a.started_at.strftime("%Y-%m-%d"),
                count=1,
                passed_count=1 if a.passed else 0,
                average_score=round(a.percentage, 1),
            )
            for a in attempts[-10:]
        ]

        return StudentAnalyticsResponse(
            total_attempts=total_attempts,
            passed_attempts=passed_attempts,
            failed_attempts=failed_attempts,
            pass_rate=pass_rate,
            average_score=avg_score,
            highest_score=highest_score,
            total_time_spent_seconds=total_time,
            category_breakdown=category_breakdown,
            recent_performance=recent_trend,
        )

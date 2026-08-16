from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.models.attempt import AssessmentAttempt, AttemptStatus
from backend.app.models.category import Category
from backend.app.models.quiz import Quiz
from backend.app.models.user import User, UserStatus
from backend.app.schemas.leaderboard import LeaderboardEntryResponse, LeaderboardResponse


class LeaderboardService:
    @staticmethod
    async def get_leaderboard(
        db: AsyncSession,
        current_user_id: Optional[str] = None,
        category_id: Optional[str] = None,
        timeframe: str = "all",  # "all", "monthly", "weekly"
    ) -> LeaderboardResponse:
        now = datetime.now(timezone.utc)
        stmt = (
            select(AssessmentAttempt)
            .join(User, AssessmentAttempt.user_id == User.id)
            .join(Quiz, AssessmentAttempt.quiz_id == Quiz.id)
            .where(User.status == UserStatus.ACTIVE)
            .where(AssessmentAttempt.status.in_([AttemptStatus.COMPLETED, AttemptStatus.EXPIRED]))
            .options(
                selectinload(AssessmentAttempt.user),
                selectinload(AssessmentAttempt.quiz),
            )
        )

        if category_id:
            stmt = stmt.where(Quiz.category_id == category_id)

        if timeframe == "weekly":
            since = now - timedelta(days=7)
            stmt = stmt.where(AssessmentAttempt.started_at >= since)
        elif timeframe == "monthly":
            since = now - timedelta(days=30)
            stmt = stmt.where(AssessmentAttempt.started_at >= since)

        res = await db.execute(stmt)
        attempts = list(res.scalars().all())

        # Aggregate by student
        user_aggregates: Dict[str, Dict[str, Any]] = {}
        for a in attempts:
            uid = a.user_id
            if uid not in user_aggregates:
                user_aggregates[uid] = {
                    "user_id": uid,
                    "user_name": a.user.name,
                    "quizzes_taken": 0,
                    "quizzes_passed": 0,
                    "total_score": 0.0,
                    "total_percentage": 0.0,
                    "total_time_seconds": 0,
                }
            user_aggregates[uid]["quizzes_taken"] += 1
            if a.passed:
                user_aggregates[uid]["quizzes_passed"] += 1
            user_aggregates[uid]["total_score"] += a.score
            user_aggregates[uid]["total_percentage"] += a.percentage
            user_aggregates[uid]["total_time_seconds"] += a.time_taken_seconds

        # Sort according to stable ranking criteria
        sorted_users = []
        for uid, data in user_aggregates.items():
            avg_pct = data["total_percentage"] / data["quizzes_taken"] if data["quizzes_taken"] > 0 else 0.0
            sorted_users.append({
                "user_id": uid,
                "user_name": data["user_name"],
                "quizzes_taken": data["quizzes_taken"],
                "quizzes_passed": data["quizzes_passed"],
                "total_score": round(data["total_score"], 2),
                "average_percentage": round(avg_pct, 2),
                "total_time_seconds": data["total_time_seconds"],
            })

        sorted_users.sort(
            key=lambda x: (
                x["average_percentage"],
                x["quizzes_passed"],
                x["total_score"],
                -x["total_time_seconds"]
            ),
            reverse=True
        )

        rankings: List[LeaderboardEntryResponse] = []
        current_user_entry: Optional[LeaderboardEntryResponse] = None

        for rank, u in enumerate(sorted_users, start=1):
            entry = LeaderboardEntryResponse(
                rank=rank,
                user_id=u["user_id"],
                user_name=u["user_name"],
                quizzes_taken=u["quizzes_taken"],
                quizzes_passed=u["quizzes_passed"],
                total_score=u["total_score"],
                average_percentage=u["average_percentage"],
                total_time_seconds=u["total_time_seconds"],
            )
            if rank <= 50:
                rankings.append(entry)
            if current_user_id and u["user_id"] == current_user_id:
                current_user_entry = entry

        # Category name lookup
        cat_name = "All Categories"
        if category_id:
            cat_stmt = select(Category).where(Category.id == category_id)
            cat_res = await db.execute(cat_stmt)
            cat = cat_res.scalar_one_or_none()
            if cat:
                cat_name = cat.name

        return LeaderboardResponse(
            timeframe=timeframe,
            category_id=category_id,
            category_name=cat_name,
            total_participants=len(sorted_users),
            user_entry=current_user_entry,
            rankings=rankings,
        )

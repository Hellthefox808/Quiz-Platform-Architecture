from fastapi import APIRouter
from backend.app.api.v1 import (
    analytics,
    attempts,
    audit_logs,
    auth,
    categories,
    certificates,
    health,
    leaderboard,
    notifications,
    questions,
    quizzes,
    users,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(categories.router)
api_router.include_router(quizzes.router)
api_router.include_router(questions.router)
api_router.include_router(attempts.router)
api_router.include_router(leaderboard.router)
api_router.include_router(analytics.router)
api_router.include_router(audit_logs.router)
api_router.include_router(certificates.router)
api_router.include_router(notifications.router)

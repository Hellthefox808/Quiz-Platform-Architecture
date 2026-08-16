from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.attempt import AssessmentAttempt, AttemptStatus
from backend.app.models.category import Category
from backend.app.models.question import DifficultyLevel, Question, QuestionOption, QuestionType
from backend.app.models.quiz import Quiz, QuizStatus, QuizVersion
from backend.app.models.user import User
from backend.tests.conftest import get_auth_headers


@pytest.mark.asyncio
async def test_immutable_assessment_versioning_and_snapshot(
    client: AsyncClient,
    db_session: AsyncSession,
    test_admin: User,
    test_student: User,
):
    admin_headers = get_auth_headers(test_admin)
    student_headers = get_auth_headers(test_student)

    # 1. Admin creates category and quiz
    cat = Category(name="System Design", slug="system-design")
    db_session.add(cat)
    await db_session.commit()

    quiz_payload = {
        "title": "Scalable Web Architecture",
        "description": "Assessment of caching, queues, and databases",
        "category_id": cat.id,
        "config": {
            "duration_seconds": 600,
            "passing_percentage": 50.0,
            "max_attempts": 2,
            "allow_review": True,
        }
    }
    create_quiz_res = await client.post("/api/v1/quizzes", json=quiz_payload, headers=admin_headers)
    assert create_quiz_res.status_code == 201
    quiz_id = create_quiz_res.json()["id"]

    # 2. Add question to Quiz
    q_payload = {
        "question_text": "What is the primary benefit of a Redis write-through cache?",
        "question_type": "MCQ_SINGLE",
        "marks": 2.0,
        "difficulty": "EASY",
        "explanation": "Ensures consistency between cache and persistent database.",
        "options": [
            {"option_text": "Data is written to cache and DB simultaneously", "is_correct": True},
            {"option_text": "Writes are discarded if cache is full", "is_correct": False},
        ]
    }
    q_res = await client.post(f"/api/v1/questions/quizzes/{quiz_id}", json=q_payload, headers=admin_headers)
    assert q_res.status_code == 201
    q1_id = q_res.json()["id"]

    # 3. Publish Quiz
    pub_res = await client.post(f"/api/v1/quizzes/{quiz_id}/publish", headers=admin_headers)
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "PUBLISHED"

    # 4. Student starts attempt (locked to version 1 snapshot)
    start_res = await client.post(f"/api/v1/attempts/quizzes/{quiz_id}/start", headers=student_headers)
    assert start_res.status_code == 200
    attempt_data = start_res.json()
    attempt_id = attempt_data["id"]
    assert len(attempt_data["questions"]) == 1
    # Check that option does NOT contain is_correct
    assert "is_correct" not in attempt_data["questions"][0]["options"][0]

    # 5. Admin updates the question text on live quiz
    update_q_res = await client.put(
        f"/api/v1/questions/{q1_id}",
        json={"question_text": "UPDATED QUESTION TEXT BY ADMIN"},
        headers=admin_headers,
    )
    assert update_q_res.status_code == 200

    # 6. Student views running attempt: the attempt's snapshot MUST preserve the original text!
    running_attempt_res = await client.get(f"/api/v1/attempts/{attempt_id}", headers=student_headers)
    assert running_attempt_res.status_code == 200
    running_data = running_attempt_res.json()
    assert running_data["questions"][0]["question_text"] == "What is the primary benefit of a Redis write-through cache?"


@pytest.mark.asyncio
async def test_server_authoritative_timer_and_expiration(
    client: AsyncClient,
    db_session: AsyncSession,
    test_admin: User,
    test_student: User,
):
    admin_headers = get_auth_headers(test_admin)
    student_headers = get_auth_headers(test_student)

    # 1. Setup Quiz with 5 seconds duration
    cat = Category(name="Quick Timed", slug="quick-timed")
    db_session.add(cat)
    await db_session.commit()

    quiz_res = await client.post(
        "/api/v1/quizzes",
        json={
            "title": "Speed Test",
            "category_id": cat.id,
            "config": {"duration_seconds": 1, "passing_percentage": 50.0, "max_attempts": 1}
        },
        headers=admin_headers,
    )
    quiz_id = quiz_res.json()["id"]

    await client.post(
        f"/api/v1/questions/quizzes/{quiz_id}",
        json={
            "question_text": "Quick 1?",
            "options": [
                {"option_text": "Opt 1", "is_correct": True},
                {"option_text": "Opt 2", "is_correct": False},
            ]
        },
        headers=admin_headers,
    )
    await client.post(f"/api/v1/quizzes/{quiz_id}/publish", headers=admin_headers)

    # 2. Student starts attempt
    start_res = await client.post(f"/api/v1/attempts/quizzes/{quiz_id}/start", headers=student_headers)
    attempt_id = start_res.json()["id"]
    aq_id = start_res.json()["questions"][0]["attempt_question_id"]
    opt_id = start_res.json()["questions"][0]["options"][0]["id"]

    # 3. Simulate time expiration by shifting attempt.expires_at in database to the past
    att_stmt = await db_session.get(AssessmentAttempt, attempt_id)
    att_stmt.expires_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    await db_session.commit()

    # 4. Student tries to save answer after expiration -> Server rejects with ATTEMPT_EXPIRED and auto-submits
    save_res = await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq_id, "selected_option_id": opt_id},
        headers=student_headers,
    )
    assert save_res.status_code in [400, 422]
    assert save_res.json()["error"]["code"] == "ATTEMPT_EXPIRED"

    # 5. Verify attempt status is now EXPIRED
    await db_session.refresh(att_stmt)
    assert att_stmt.status == AttemptStatus.EXPIRED

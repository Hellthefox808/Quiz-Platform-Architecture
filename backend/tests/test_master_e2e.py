import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.security import get_password_hash
from backend.app.models.user import User, UserRole, UserStatus


@pytest.mark.asyncio
async def test_complete_master_e2e_scenario(
    client: AsyncClient,
    db_session: AsyncSession,
):
    print("\n--- MASTER E2E STEP 1-4: Clean environment & Seed Admin ---")
    admin = User(
        name="Master Admin",
        email="admin@e2e.io",
        password_hash=get_password_hash("AdminPass123!"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db_session.add(admin)
    await db_session.commit()

    print("--- MASTER E2E STEP 8-10: Student Registration & Login ---")
    reg_payload = {
        "name": "E2E Student",
        "email": "student@e2e.io",
        "password": "StudentPass123!",
    }
    reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    student_id = reg_res.json()["id"]

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "student@e2e.io", "password": "StudentPass123!"}
    )
    assert login_res.status_code == 200
    student_token = login_res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Verify student /me
    me_res = await client.get("/api/v1/auth/me", headers=student_headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "student@e2e.io"

    print("--- MASTER E2E STEP 12-17: Admin Login, Create Category, Quiz & Questions, Publish ---")
    admin_login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@e2e.io", "password": "AdminPass123!"}
    )
    assert admin_login_res.status_code == 200
    admin_token = admin_login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Create Category
    cat_res = await client.post(
        "/api/v1/categories",
        json={"name": "E2E Engineering", "slug": "e2e-engineering"},
        headers=admin_headers
    )
    assert cat_res.status_code == 201
    cat_id = cat_res.json()["id"]

    # Create Quiz
    quiz_res = await client.post(
        "/api/v1/quizzes",
        json={
            "title": "Master E2E Engineering Assessment",
            "description": "Comprehensive full-stack verification quiz",
            "category_id": cat_id,
            "config": {
                "duration_seconds": 1800,
                "passing_percentage": 60.0,
                "max_attempts": 2,
                "allow_review": True,
                "show_correct_answers": True,
                "show_explanations": True,
            }
        },
        headers=admin_headers
    )
    assert quiz_res.status_code == 201
    quiz_id = quiz_res.json()["id"]

    # Add Question 1
    q1_res = await client.post(
        f"/api/v1/questions/quizzes/{quiz_id}",
        json={
            "question_text": "What is the primary purpose of immutable assessment versioning?",
            "marks": 5.0,
            "difficulty": "MEDIUM",
            "explanation": "To prevent running student assessments from mutating unexpectedly when an administrator alters questions.",
            "options": [
                {"option_text": "To guarantee attempt snapshots remain stable and tamper-proof", "is_correct": True},
                {"option_text": "To speed up local SQLite database queries", "is_correct": False},
                {"option_text": "To reduce network payload size in Vite", "is_correct": False},
            ]
        },
        headers=admin_headers
    )
    assert q1_res.status_code == 201

    # Add Question 2
    q2_res = await client.post(
        f"/api/v1/questions/quizzes/{quiz_id}",
        json={
            "question_text": "Which component must be the single source of truth for timer expiration?",
            "marks": 5.0,
            "difficulty": "EASY",
            "explanation": "The backend server and database timestamp are authoritative.",
            "options": [
                {"option_text": "Backend server and database timestamp", "is_correct": True},
                {"option_text": "Browser localStorage clock", "is_correct": False},
            ]
        },
        headers=admin_headers
    )
    assert q2_res.status_code == 201

    # Check Pre-flight Checklist
    checklist_res = await client.get(f"/api/v1/quizzes/{quiz_id}/publish-checklist", headers=admin_headers)
    assert checklist_res.status_code == 200
    assert checklist_res.json()["is_publishable"] is True

    # Publish Quiz
    pub_res = await client.post(f"/api/v1/quizzes/{quiz_id}/publish", headers=admin_headers)
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "PUBLISHED"

    print("--- MASTER E2E STEP 19-28: Student Search, Start Attempt, Autosave, Submit, Result ---")
    # Search Quiz
    search_res = await client.get(f"/api/v1/quizzes?search=Master", headers=student_headers)
    assert search_res.status_code == 200
    assert len(search_res.json()["items"]) == 1

    # Get Quiz Details
    detail_res = await client.get(f"/api/v1/quizzes/details/{quiz_id}", headers=student_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["user_can_attempt"] is True

    # Start Attempt
    start_attempt_res = await client.post(f"/api/v1/attempts/quizzes/{quiz_id}/start", headers=student_headers)
    assert start_attempt_res.status_code == 200
    attempt = start_attempt_res.json()
    attempt_id = attempt["id"]
    assert len(attempt["questions"]) == 2

    aq1 = attempt["questions"][0]
    aq2 = attempt["questions"][1]

    # Find correct options from question snapshot
    # Save Answer for Q1
    q1_opt_id = aq1["options"][0]["id"]
    save1 = await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq1["attempt_question_id"], "selected_option_id": q1_opt_id},
        headers=student_headers
    )
    assert save1.status_code == 200
    assert save1.json()["status"] == "SAVED"

    # Save Answer for Q2
    q2_opt_id = aq2["options"][0]["id"]
    save2 = await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq2["attempt_question_id"], "selected_option_id": q2_opt_id},
        headers=student_headers
    )
    assert save2.status_code == 200

    # Submit Attempt
    submit_res = await client.post(f"/api/v1/attempts/{attempt_id}/submit", headers=student_headers)
    assert submit_res.status_code == 200
    result_data = submit_res.json()
    assert result_data["total_marks"] == 10.0
    assert result_data["percentage"] >= 0.0
    assert result_data["passed"] in [True, False]
    assert len(result_data["questions_review"]) == 2

    # View History
    hist_res = await client.get("/api/v1/attempts/history/my", headers=student_headers)
    assert hist_res.status_code == 200
    assert hist_res.json()["total"] == 1

    # Check Leaderboard
    leaderboard_res = await client.get("/api/v1/leaderboard", headers=student_headers)
    assert leaderboard_res.status_code == 200
    assert len(leaderboard_res.json()["rankings"]) >= 1

    print("--- MASTER E2E STEP 35-40: Admin Analytics, Question Metrics & Audit Logs ---")
    admin_analytics_res = await client.get("/api/v1/analytics/admin", headers=admin_headers)
    assert admin_analytics_res.status_code == 200
    analytics_data = admin_analytics_res.json()
    assert analytics_data["total_quizzes"] >= 1
    assert analytics_data["completed_attempts"] >= 1

    question_analytics_res = await client.get(f"/api/v1/analytics/admin/questions?quiz_id={quiz_id}", headers=admin_headers)
    assert question_analytics_res.status_code == 200
    assert len(question_analytics_res.json()) == 2

    audit_res = await client.get("/api/v1/audit-logs", headers=admin_headers)
    assert audit_res.status_code == 200
    assert audit_res.json()["total"] >= 4

    print("--- MASTER E2E SCENARIO PASSED 100% ---")

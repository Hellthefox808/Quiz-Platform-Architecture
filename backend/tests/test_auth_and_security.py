import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.category import Category
from backend.app.models.user import User, UserRole
from backend.tests.conftest import get_auth_headers


@pytest.mark.asyncio
async def test_broken_function_level_authorization_bfla(
    client: AsyncClient,
    test_student: User,
):
    student_headers = get_auth_headers(test_student)

    # 1. Student attempts to list all admin users
    res1 = await client.get("/api/v1/users", headers=student_headers)
    assert res1.status_code == 403
    assert res1.json()["error"]["code"] == "FORBIDDEN"

    # 2. Student attempts to create category
    res2 = await client.post("/api/v1/categories", json={"name": "Hacked Category"}, headers=student_headers)
    assert res2.status_code == 403

    # 3. Student attempts to view admin audit logs
    res3 = await client.get("/api/v1/audit-logs", headers=student_headers)
    assert res3.status_code == 403


@pytest.mark.asyncio
async def test_broken_object_level_authorization_bola_idor(
    client: AsyncClient,
    db_session: AsyncSession,
    test_admin: User,
    test_student: User,
    test_student_2: User,
):
    admin_headers = get_auth_headers(test_admin)
    student1_headers = get_auth_headers(test_student)
    student2_headers = get_auth_headers(test_student_2)

    # Admin sets up quiz
    cat = Category(name="Security Cat", slug="security-cat")
    db_session.add(cat)
    await db_session.commit()

    q_res = await client.post(
        "/api/v1/quizzes",
        json={"title": "Sec Quiz", "category_id": cat.id, "config": {"duration_seconds": 600}},
        headers=admin_headers,
    )
    quiz_id = q_res.json()["id"]
    await client.post(
        f"/api/v1/questions/quizzes/{quiz_id}",
        json={
            "question_text": "Is IDOR prevented?",
            "options": [
                {"option_text": "Yes", "is_correct": True},
                {"option_text": "No", "is_correct": False},
            ]
        },
        headers=admin_headers,
    )
    await client.post(f"/api/v1/quizzes/{quiz_id}/publish", headers=admin_headers)

    # Student 1 starts attempt
    s1_attempt_res = await client.post(f"/api/v1/attempts/quizzes/{quiz_id}/start", headers=student1_headers)
    s1_attempt_id = s1_attempt_res.json()["id"]

    # Student 2 tries to GET Student 1's attempt (IDOR attack)
    idor_res = await client.get(f"/api/v1/attempts/{s1_attempt_id}", headers=student2_headers)
    assert idor_res.status_code == 403
    assert idor_res.json()["error"]["code"] == "FORBIDDEN"

    # Student 2 tries to PATCH answer on Student 1's attempt
    aq_id = s1_attempt_res.json()["questions"][0]["attempt_question_id"]
    opt_id = s1_attempt_res.json()["questions"][0]["options"][0]["id"]
    idor_save = await client.patch(
        f"/api/v1/attempts/{s1_attempt_id}/answers",
        json={"attempt_question_id": aq_id, "selected_option_id": opt_id},
        headers=student2_headers,
    )
    assert idor_save.status_code == 403


@pytest.mark.asyncio
async def test_mass_assignment_protection_on_registration(
    client: AsyncClient,
    db_session: AsyncSession,
):
    # Attempt to inject role=ADMIN into registration payload
    payload = {
        "name": "Attacker",
        "email": "attacker@evil.io",
        "password": "Password123",
        "role": "ADMIN",
    }
    reg_res = await client.post("/api/v1/auth/register", json=payload)
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    assert user_data["role"] == "STUDENT"


@pytest.mark.asyncio
async def test_no_answer_leakage_during_active_exam(
    client: AsyncClient,
    db_session: AsyncSession,
    test_admin: User,
    test_student: User,
):
    admin_headers = get_auth_headers(test_admin)
    student_headers = get_auth_headers(test_student)

    cat = Category(name="No Leak Cat", slug="no-leak-cat")
    db_session.add(cat)
    await db_session.commit()

    q_res = await client.post(
        "/api/v1/quizzes",
        json={"title": "No Leak Quiz", "category_id": cat.id, "config": {"duration_seconds": 600}},
        headers=admin_headers,
    )
    quiz_id = q_res.json()["id"]
    await client.post(
        f"/api/v1/questions/quizzes/{quiz_id}",
        json={
            "question_text": "Secret answer question",
            "explanation": "SUPER SECRET EXPLANATION THAT MUST NOT LEAK",
            "options": [
                {"option_text": "Correct Choice", "is_correct": True},
                {"option_text": "Wrong Choice", "is_correct": False},
            ]
        },
        headers=admin_headers,
    )
    await client.post(f"/api/v1/quizzes/{quiz_id}/publish", headers=admin_headers)

    # Start attempt
    start_res = await client.post(f"/api/v1/attempts/quizzes/{quiz_id}/start", headers=student_headers)
    assert start_res.status_code == 200
    data = start_res.json()

    # Verify that neither is_correct nor explanation are in response
    assert "explanation" not in str(data)
    for q in data["questions"]:
        for opt in q["options"]:
            assert "is_correct" not in opt


@pytest.mark.asyncio
async def test_password_reset_token_single_use(
    client: AsyncClient,
    test_student: User,
):
    # Request reset
    forgot_res = await client.post("/api/v1/auth/forgot-password", json={"email": test_student.email})
    assert forgot_res.status_code == 200
    msg = forgot_res.json()["message"]
    # Token was attached in dev response
    token = msg.split(": ")[-1]

    # Reset password with token (1st time -> Success)
    reset_res1 = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "NewStudentPassword123"}
    )
    assert reset_res1.status_code == 200

    # Reset password with same token (2nd time -> Failure, token used)
    reset_res2 = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "AnotherPassword123"}
    )
    assert reset_res2.status_code in [400, 422]
    assert reset_res2.json()["error"]["code"] == "BAD_REQUEST"

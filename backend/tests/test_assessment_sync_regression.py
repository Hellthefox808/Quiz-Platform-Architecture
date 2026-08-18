import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.category import Category
from backend.app.models.user import User
from backend.tests.conftest import get_auth_headers


async def setup_test_assessment(client: AsyncClient, db_session: AsyncSession, test_admin: User):
    """Create and publish an assessment via API with questions & options for regression testing."""
    admin_headers = get_auth_headers(test_admin)

    # 1. Create Category
    cat = Category(name="Sync Regression Category", slug=f"sync-reg-{id(test_admin)}")
    db_session.add(cat)
    await db_session.commit()
    await db_session.refresh(cat)

    # 2. Create Quiz
    quiz_payload = {
        "title": "Sync Regression Test Quiz",
        "description": "Testing answer synchronization edge cases and submission barrier",
        "category_id": cat.id,
        "config": {
            "duration_seconds": 1200,
            "passing_percentage": 60.0,
            "max_attempts": 5,
            "allow_review": True,
            "show_correct_answers": True,
            "show_explanations": True,
        }
    }
    quiz_res = await client.post("/api/v1/quizzes", json=quiz_payload, headers=admin_headers)
    assert quiz_res.status_code == 201
    quiz_id = quiz_res.json()["id"]

    # 3. Add Question 1 (3 choices, option 0 is correct)
    q1_payload = {
        "question_text": "What is the primary guarantee of serializability in database transactions?",
        "question_type": "MCQ_SINGLE",
        "marks": 5.0,
        "difficulty": "MEDIUM",
        "explanation": "Transactions appear to have executed sequentially with zero interleaving anomalies.",
        "options": [
            {"option_text": "Equivalent to some sequential serial execution", "is_correct": True},
            {"option_text": "Guarantees zero disk write latency", "is_correct": False},
            {"option_text": "Disables concurrency entirely across all cores", "is_correct": False},
        ]
    }
    q1_res = await client.post(f"/api/v1/questions/quizzes/{quiz_id}", json=q1_payload, headers=admin_headers)
    assert q1_res.status_code == 201

    # 4. Add Question 2 (2 choices, option 1 is correct)
    q2_payload = {
        "question_text": "Which component is the single source of truth for timer expiration in ApexAssess?",
        "question_type": "MCQ_SINGLE",
        "marks": 5.0,
        "difficulty": "EASY",
        "explanation": "Server timestamp and attempt record expiration timestamp.",
        "options": [
            {"option_text": "Client browser local clock", "is_correct": False},
            {"option_text": "Server database expiration timestamp", "is_correct": True},
        ]
    }
    q2_res = await client.post(f"/api/v1/questions/quizzes/{quiz_id}", json=q2_payload, headers=admin_headers)
    assert q2_res.status_code == 201

    # 5. Publish Quiz
    pub_res = await client.post(f"/api/v1/quizzes/{quiz_id}/publish", headers=admin_headers)
    assert pub_res.status_code == 200

    return {
        "quiz_id": quiz_id,
    }


@pytest.mark.asyncio
async def test_rapid_option_changes_a_to_b(
    client: AsyncClient,
    db_session: AsyncSession,
    test_admin: User,
    test_student: User,
):
    """Verifies that rapidly switching from Option A to Option B results in Option B persisted."""
    setup = await setup_test_assessment(client, db_session, test_admin)
    headers = get_auth_headers(test_student)

    # Start Attempt
    start_res = await client.post(f"/api/v1/attempts/quizzes/{setup['quiz_id']}/start", headers=headers)
    assert start_res.status_code == 200
    attempt = start_res.json()
    attempt_id = attempt["id"]
    aq1 = attempt["questions"][0]

    # Select Option A
    res_a = await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq1["attempt_question_id"], "selected_option_id": aq1["options"][0]["id"]},
        headers=headers,
    )
    assert res_a.status_code == 200
    assert res_a.json()["selected_option_id"] == aq1["options"][0]["id"]

    # Immediately Switch to Option B
    res_b = await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq1["attempt_question_id"], "selected_option_id": aq1["options"][1]["id"]},
        headers=headers,
    )
    assert res_b.status_code == 200
    assert res_b.json()["selected_option_id"] == aq1["options"][1]["id"]

    # Verify reload / fetch returns Option B
    get_res = await client.get(f"/api/v1/attempts/{attempt_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["questions"][0]["selected_option_id"] == aq1["options"][1]["id"]


@pytest.mark.asyncio
async def test_rapid_option_changes_a_to_b_to_c(
    client: AsyncClient,
    db_session: AsyncSession,
    test_admin: User,
    test_student: User,
):
    """Verifies rapid 3-step transition A -> B -> C commits final choice C."""
    setup = await setup_test_assessment(client, db_session, test_admin)
    headers = get_auth_headers(test_student)

    start_res = await client.post(f"/api/v1/attempts/quizzes/{setup['quiz_id']}/start", headers=headers)
    attempt = start_res.json()
    attempt_id = attempt["id"]
    aq1 = attempt["questions"][0]

    opts = aq1["options"]
    await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq1["attempt_question_id"], "selected_option_id": opts[0]["id"]},
        headers=headers,
    )
    await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq1["attempt_question_id"], "selected_option_id": opts[1]["id"]},
        headers=headers,
    )
    res_c = await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq1["attempt_question_id"], "selected_option_id": opts[2]["id"]},
        headers=headers,
    )
    assert res_c.status_code == 200
    assert res_c.json()["selected_option_id"] == opts[2]["id"]

    get_res = await client.get(f"/api/v1/attempts/{attempt_id}", headers=headers)
    assert get_res.json()["questions"][0]["selected_option_id"] == opts[2]["id"]


@pytest.mark.asyncio
async def test_select_then_clear_and_clear_then_select(
    client: AsyncClient,
    db_session: AsyncSession,
    test_admin: User,
    test_student: User,
):
    """Verifies select -> clear -> select cycle correctly manages null values."""
    setup = await setup_test_assessment(client, db_session, test_admin)
    headers = get_auth_headers(test_student)

    start_res = await client.post(f"/api/v1/attempts/quizzes/{setup['quiz_id']}/start", headers=headers)
    attempt = start_res.json()
    attempt_id = attempt["id"]
    aq1 = attempt["questions"][0]

    # Select Option 0
    await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq1["attempt_question_id"], "selected_option_id": aq1["options"][0]["id"]},
        headers=headers,
    )

    # Clear Selection (None / null)
    clear_res = await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq1["attempt_question_id"], "selected_option_id": None},
        headers=headers,
    )
    assert clear_res.status_code == 200
    assert clear_res.json()["selected_option_id"] is None

    # Fetch verify cleared
    get_res1 = await client.get(f"/api/v1/attempts/{attempt_id}", headers=headers)
    assert get_res1.json()["questions"][0]["selected_option_id"] is None

    # Clear -> Select Option 1
    select_again = await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq1["attempt_question_id"], "selected_option_id": aq1["options"][1]["id"]},
        headers=headers,
    )
    assert select_again.status_code == 200
    assert select_again.json()["selected_option_id"] == aq1["options"][1]["id"]


@pytest.mark.asyncio
async def test_foreign_option_id_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
    test_admin: User,
    test_student: User,
):
    """Verifies choosing an option belonging to a different question or invalid UUID is rejected."""
    setup = await setup_test_assessment(client, db_session, test_admin)
    headers = get_auth_headers(test_student)

    start_res = await client.post(f"/api/v1/attempts/quizzes/{setup['quiz_id']}/start", headers=headers)
    attempt = start_res.json()
    attempt_id = attempt["id"]
    aq1 = attempt["questions"][0]
    aq2 = attempt["questions"][1]

    # Set valid answer on Q1
    await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq1["attempt_question_id"], "selected_option_id": aq1["options"][0]["id"]},
        headers=headers,
    )

    # Try to set Q2's option on Q1
    foreign_opt_id = aq2["options"][0]["id"]
    invalid_res = await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq1["attempt_question_id"], "selected_option_id": foreign_opt_id},
        headers=headers,
    )
    assert invalid_res.status_code in [400, 404, 422]

    # Verify Q1 original answer remains untouched
    get_res = await client.get(f"/api/v1/attempts/{attempt_id}", headers=headers)
    assert get_res.json()["questions"][0]["selected_option_id"] == aq1["options"][0]["id"]


@pytest.mark.asyncio
async def test_foreign_attempt_id_forbidden(
    client: AsyncClient,
    db_session: AsyncSession,
    test_admin: User,
    test_student: User,
    test_student_2: User,
):
    """Verifies User B cannot modify or submit User A's active attempt."""
    setup = await setup_test_assessment(client, db_session, test_admin)
    student1_headers = get_auth_headers(test_student)
    student2_headers = get_auth_headers(test_student_2)

    # Student 1 starts attempt
    start_res = await client.post(f"/api/v1/attempts/quizzes/{setup['quiz_id']}/start", headers=student1_headers)
    attempt_id = start_res.json()["id"]
    aq1 = start_res.json()["questions"][0]

    # Student 2 tries to PATCH answer on Student 1's attempt
    res = await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq1["attempt_question_id"], "selected_option_id": aq1["options"][0]["id"]},
        headers=student2_headers,
    )
    assert res.status_code in [403, 404]

    # Student 2 tries to submit Student 1's attempt
    submit_res = await client.post(f"/api/v1/attempts/{attempt_id}/submit", headers=student2_headers)
    assert submit_res.status_code in [403, 404]


@pytest.mark.asyncio
async def test_double_submit_protection(
    client: AsyncClient,
    db_session: AsyncSession,
    test_admin: User,
    test_student: User,
):
    """Verifies submit is idempotent and duplicate submit returns the existing result."""
    setup = await setup_test_assessment(client, db_session, test_admin)
    headers = get_auth_headers(test_student)

    start_res = await client.post(f"/api/v1/attempts/quizzes/{setup['quiz_id']}/start", headers=headers)
    attempt_id = start_res.json()["id"]

    # First submit -> 200 OK
    res1 = await client.post(f"/api/v1/attempts/{attempt_id}/submit", headers=headers)
    assert res1.status_code == 200
    res1_data = res1.json()
    assert res1_data["total_marks"] == 10.0

    # Second submit -> 200 OK with identical result ID (idempotent result return)
    res2 = await client.post(f"/api/v1/attempts/{attempt_id}/submit", headers=headers)
    assert res2.status_code == 200
    res2_data = res2.json()
    assert res2_data["id"] == res1_data["id"]
    assert res2_data["final_score"] == res1_data["final_score"]


@pytest.mark.asyncio
async def test_final_database_answer_scored_authoritatively(
    client: AsyncClient,
    db_session: AsyncSession,
    test_admin: User,
    test_student: User,
):
    """Verifies that final selected options are accurately reflected in the database and graded with correct score."""
    setup = await setup_test_assessment(client, db_session, test_admin)
    headers = get_auth_headers(test_student)

    start_res = await client.post(f"/api/v1/attempts/quizzes/{setup['quiz_id']}/start", headers=headers)
    attempt = start_res.json()
    attempt_id = attempt["id"]
    aq1 = attempt["questions"][0]
    aq2 = attempt["questions"][1]

    # For Q1: Select wrong option (opts[1]), then change to correct option (opts[0])
    await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq1["attempt_question_id"], "selected_option_id": aq1["options"][1]["id"]},
        headers=headers,
    )
    await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq1["attempt_question_id"], "selected_option_id": aq1["options"][0]["id"]},
        headers=headers,
    )

    # For Q2: Select correct option (opts[1])
    await client.patch(
        f"/api/v1/attempts/{attempt_id}/answers",
        json={"attempt_question_id": aq2["attempt_question_id"], "selected_option_id": aq2["options"][1]["id"]},
        headers=headers,
    )

    # Submit
    submit_res = await client.post(f"/api/v1/attempts/{attempt_id}/submit", headers=headers)
    assert submit_res.status_code == 200
    result = submit_res.json()

    # Both answers are correct -> 10.0/10.0 (100%) and passed
    assert result["final_score"] == 10.0
    assert result["obtained_marks"] == 10.0
    assert result["percentage"] == 100.0
    assert result["passed"] is True
    assert len(result["questions_review"]) == 2
    assert result["questions_review"][0]["is_correct"] is True
    assert result["questions_review"][1]["is_correct"] is True

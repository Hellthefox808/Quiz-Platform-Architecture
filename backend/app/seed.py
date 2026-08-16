import asyncio
import sys
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from backend.app.core.database import AsyncSessionLocal, Base, engine
from backend.app.core.security import get_password_hash
from backend.app.models.attempt import Answer, AssessmentAttempt, AttemptQuestion, AttemptStatus
from backend.app.models.audit import AuditAction, AuditLog
from backend.app.models.category import Category
from backend.app.models.certificate import Certificate
from backend.app.models.notification import Notification
from backend.app.models.question import DifficultyLevel, Question, QuestionOption, QuestionType
from backend.app.models.quiz import Quiz, QuizStatus, QuizVersion
from backend.app.models.result import Result
from backend.app.models.user import User, UserRole, UserStatus
from backend.app.services.scoring_service import ScoringService


async def seed_database():
    print("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        print("Seeding Users...")
        admin = User(
            name="Platform Administrator",
            email="admin@assessment.io",
            password_hash=get_password_hash("Admin@12345"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )
        student_alice = User(
            name="Alice Walker",
            email="alice@student.io",
            password_hash=get_password_hash("Student@12345"),
            role=UserRole.STUDENT,
            status=UserStatus.ACTIVE,
        )
        student_bob = User(
            name="Bob Miller",
            email="bob@student.io",
            password_hash=get_password_hash("Student@12345"),
            role=UserRole.STUDENT,
            status=UserStatus.ACTIVE,
        )
        student_charlie = User(
            name="Charlie Davis",
            email="charlie@student.io",
            password_hash=get_password_hash("Student@12345"),
            role=UserRole.STUDENT,
            status=UserStatus.ACTIVE,
        )

        db.add_all([admin, student_alice, student_bob, student_charlie])
        await db.flush()

        print("Seeding Categories...")
        cat_sec = Category(name="Cybersecurity & Web Security", slug="cybersecurity-web-security", description="Web app security, OWASP Top 10, auth protocols, and vulnerability analysis.")
        cat_cloud = Category(name="Cloud Architecture & DevOps", slug="cloud-architecture-devops", description="Distributed computing, containers, Kubernetes, CI/CD, and site reliability.")
        cat_db = Category(name="Database Engineering & SQL", slug="database-engineering-sql", description="Relational modeling, indexing, ACID transactions, and query optimization.")
        cat_ai = Category(name="Algorithms & Data Structures", slug="algorithms-data-structures", description="Algorithm design, complexity analysis, and graph theory.")

        db.add_all([cat_sec, cat_cloud, cat_db, cat_ai])
        await db.flush()

        print("Seeding Quizzes & Versions...")
        # Quiz 1: Cybersecurity
        quiz1 = Quiz(
            title="OWASP API Security & Web Vulnerabilities",
            description="Assess your knowledge of modern API vulnerabilities including BOLA, BFLA, mass assignment, and cryptographic pitfalls.",
            category_id=cat_sec.id,
            status=QuizStatus.PUBLISHED,
            thumbnail_url="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80",
            created_by=admin.id,
        )
        db.add(quiz1)
        await db.flush()

        q1_ver = QuizVersion(
            quiz_id=quiz1.id,
            version_number=1,
            duration_seconds=1200,  # 20 mins
            passing_percentage=70.0,
            max_attempts=3,
            shuffle_questions=True,
            shuffle_options=True,
            negative_marking_enabled=True,
            negative_mark_value=0.5,
            show_result_immediately=True,
            show_correct_answers=True,
            show_explanations=True,
            allow_review=True,
            allow_resume=True,
            published_at=datetime.now(timezone.utc),
        )
        db.add(q1_ver)
        await db.flush()

        # Questions for Quiz 1
        q1_questions_data = [
            {
                "text": "What does BOLA stand for in the context of the OWASP API Security Top 10?",
                "marks": 2.0,
                "diff": DifficultyLevel.EASY,
                "exp": "BOLA stands for Broken Object Level Authorization, previously known as Insecure Direct Object References (IDOR).",
                "options": [
                    ("Broken Object Level Authorization", True),
                    ("Binary Object Link Architecture", False),
                    ("Backend Object Level Access", False),
                    ("Browser Origin Limit Authorization", False),
                ]
            },
            {
                "text": "Which HTTP status code is most appropriate when an authenticated user attempts to access an administrative endpoint without sufficient permissions?",
                "marks": 2.0,
                "diff": DifficultyLevel.EASY,
                "exp": "403 Forbidden indicates the server understands the request but refuses to authorize it. 401 Unauthorized is for unauthenticated requests.",
                "options": [
                    ("403 Forbidden", True),
                    ("401 Unauthorized", False),
                    ("400 Bad Request", False),
                    ("404 Not Found", False),
                ]
            },
            {
                "text": "How does Mass Assignment vulnerability typically manifest in modern REST APIs?",
                "marks": 3.0,
                "diff": DifficultyLevel.MEDIUM,
                "exp": "Mass assignment occurs when client-provided input is bound directly into internal data models without schema filtering, allowing attackers to overwrite fields like 'is_admin' or 'status'.",
                "options": [
                    ("Binding client request payloads directly to database models without property whitelisting", True),
                    ("Sending too many concurrent requests to a single server", False),
                    ("Reusing the same JWT token across multiple client sessions", False),
                    ("Executing raw SQL queries via string concatenation", False),
                ]
            },
            {
                "text": "Why should password reset tokens be stored as cryptographic hashes rather than plaintext in the database?",
                "marks": 3.0,
                "diff": DifficultyLevel.MEDIUM,
                "exp": "Hashing reset tokens ensures that a database read leak does not allow attackers to hijack pending password resets.",
                "options": [
                    ("To protect pending account recoveries even if database backups or dumps are compromised", True),
                    ("To reduce the storage size of tokens in the database table", False),
                    ("To make token generation faster on high-traffic servers", False),
                    ("To satisfy browser CORS header requirements", False),
                ]
            },
            {
                "text": "In a secure assessment system, which component must be the single source of truth for timer expiration and scoring?",
                "marks": 2.0,
                "diff": DifficultyLevel.EASY,
                "exp": "The backend server and database must strictly control assessment time windows and scoring calculation to prevent client tampering.",
                "options": [
                    ("The backend server and database timestamp", True),
                    ("The browser's window.localStorage timestamp", False),
                    ("The client's JavaScript setInterval clock", False),
                    ("The HTTP client's Date request header", False),
                ]
            }
        ]

        for pos, item in enumerate(q1_questions_data, start=1):
            q_obj = Question(
                quiz_version_id=q1_ver.id,
                question_text=item["text"],
                question_type=QuestionType.MCQ_SINGLE,
                marks=item["marks"],
                difficulty=item["diff"],
                explanation=item["exp"],
                position=pos,
            )
            db.add(q_obj)
            await db.flush()

            for opt_pos, (opt_text, is_corr) in enumerate(item["options"], start=1):
                opt_obj = QuestionOption(
                    question_id=q_obj.id,
                    option_text=opt_text,
                    position=opt_pos,
                    is_correct=is_corr,
                )
                db.add(opt_obj)

        # Quiz 2: Cloud Architecture
        quiz2 = Quiz(
            title="Cloud Architecture & Distributed Systems",
            description="Test your understanding of high availability, horizontal scaling, CAP theorem, and container orchestration.",
            category_id=cat_cloud.id,
            status=QuizStatus.PUBLISHED,
            thumbnail_url="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
            created_by=admin.id,
        )
        db.add(quiz2)
        await db.flush()

        q2_ver = QuizVersion(
            quiz_id=quiz2.id,
            version_number=1,
            duration_seconds=900,  # 15 mins
            passing_percentage=60.0,
            max_attempts=2,
            shuffle_questions=False,
            shuffle_options=False,
            negative_marking_enabled=False,
            show_result_immediately=True,
            show_correct_answers=True,
            show_explanations=True,
            allow_review=True,
            allow_resume=True,
            published_at=datetime.now(timezone.utc),
        )
        db.add(q2_ver)
        await db.flush()

        q2_questions_data = [
            {
                "text": "According to the CAP Theorem, what tradeoff must a distributed system make in the presence of a network partition (P)?",
                "marks": 2.0,
                "diff": DifficultyLevel.MEDIUM,
                "exp": "When a network partition occurs, a system must choose between Consistency (C) and Availability (A).",
                "options": [
                    ("Choose between Consistency (C) and Availability (A)", True),
                    ("Choose between Performance (P) and Durability (D)", False),
                    ("Choose between Concurrency (C) and Atomicity (A)", False),
                    ("Choose between Latency (L) and Throughput (T)", False),
                ]
            },
            {
                "text": "What is the primary role of a readiness probe in Kubernetes or container orchestrators?",
                "marks": 2.0,
                "diff": DifficultyLevel.EASY,
                "exp": "Readiness probes determine if a container is ready to accept incoming network traffic.",
                "options": [
                    ("To signal when a container is ready to receive network traffic", True),
                    ("To restart containers when memory leaks occur", False),
                    ("To build Docker images automatically on git push", False),
                    ("To encrypt persistent volume claims at rest", False),
                ]
            },
            {
                "text": "Which load balancing algorithm directs traffic based on the server currently handling the fewest active connections?",
                "marks": 2.0,
                "diff": DifficultyLevel.EASY,
                "exp": "Least Connections assigns incoming requests to the server with the fewest active sessions/connections.",
                "options": [
                    ("Least Connections", True),
                    ("Round Robin", False),
                    ("IP Hash", False),
                    ("Weighted Random", False),
                ]
            }
        ]

        for pos, item in enumerate(q2_questions_data, start=1):
            q_obj = Question(
                quiz_version_id=q2_ver.id,
                question_text=item["text"],
                question_type=QuestionType.MCQ_SINGLE,
                marks=item["marks"],
                difficulty=item["diff"],
                explanation=item["exp"],
                position=pos,
            )
            db.add(q_obj)
            await db.flush()

            for opt_pos, (opt_text, is_corr) in enumerate(item["options"], start=1):
                opt_obj = QuestionOption(
                    question_id=q_obj.id,
                    option_text=opt_text,
                    position=opt_pos,
                    is_correct=is_corr,
                )
                db.add(opt_obj)

        # Quiz 3: Draft Quiz (for testing admin workflows)
        quiz3 = Quiz(
            title="Advanced Database Concurrency & MVCC",
            description="Deep dive into transaction isolation levels, write skew, and locking strategies in PostgreSQL.",
            category_id=cat_db.id,
            status=QuizStatus.DRAFT,
            created_by=admin.id,
        )
        db.add(quiz3)
        await db.flush()

        q3_ver = QuizVersion(
            quiz_id=quiz3.id,
            version_number=1,
            duration_seconds=1500,
            passing_percentage=75.0,
            max_attempts=1,
        )
        db.add(q3_ver)
        await db.flush()

        print("Seeding Sample Completed Attempts & Leaderboard Data...")
        # Create a completed attempt for Alice on Quiz 1
        alice_attempt = AssessmentAttempt(
            user_id=student_alice.id,
            quiz_id=quiz1.id,
            quiz_version_id=q1_ver.id,
            status=AttemptStatus.COMPLETED,
            started_at=datetime.now(timezone.utc) - timedelta(minutes=25),
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),
            submitted_at=datetime.now(timezone.utc) - timedelta(minutes=10),
            score=12.0,
            percentage=100.0,
            passed=True,
            correct_answers=5,
            incorrect_answers=0,
            unanswered=0,
            total_marks=12.0,
            obtained_marks=12.0,
            time_taken_seconds=900,
        )
        db.add(alice_attempt)
        await db.flush()

        alice_res = Result(
            attempt_id=alice_attempt.id,
            user_id=student_alice.id,
            quiz_id=quiz1.id,
            quiz_version_id=q1_ver.id,
            final_score=12.0,
            percentage=100.0,
            passed=True,
            total_marks=12.0,
            obtained_marks=12.0,
            correct_count=5,
            incorrect_count=0,
            unanswered_count=0,
            time_taken_seconds=900,
        )
        db.add(alice_res)

        cert_alice = Certificate(
            certificate_code="CERT-ALICE-SEC-9988",
            user_id=student_alice.id,
            attempt_id=alice_attempt.id,
            quiz_id=quiz1.id,
            issued_at=datetime.now(timezone.utc) - timedelta(minutes=10),
        )
        db.add(cert_alice)

        # Create a completed attempt for Bob on Quiz 1
        bob_attempt = AssessmentAttempt(
            user_id=student_bob.id,
            quiz_id=quiz1.id,
            quiz_version_id=q1_ver.id,
            status=AttemptStatus.COMPLETED,
            started_at=datetime.now(timezone.utc) - timedelta(hours=2),
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1, minutes=40),
            submitted_at=datetime.now(timezone.utc) - timedelta(hours=1, minutes=45),
            score=9.5,
            percentage=79.2,
            passed=True,
            correct_answers=4,
            incorrect_answers=1,
            unanswered=0,
            total_marks=12.0,
            obtained_marks=9.5,
            time_taken_seconds=900,
        )
        db.add(bob_attempt)
        await db.flush()

        bob_res = Result(
            attempt_id=bob_attempt.id,
            user_id=student_bob.id,
            quiz_id=quiz1.id,
            quiz_version_id=q1_ver.id,
            final_score=9.5,
            percentage=79.2,
            passed=True,
            total_marks=12.0,
            obtained_marks=9.5,
            correct_count=4,
            incorrect_count=1,
            unanswered_count=0,
            time_taken_seconds=900,
        )
        db.add(bob_res)

        # Audit logs
        db.add(AuditLog(action=AuditAction.REGISTER, user_id=admin.id, resource_type="User", resource_id=admin.id))
        db.add(AuditLog(action=AuditAction.QUIZ_PUBLISHED, user_id=admin.id, resource_type="Quiz", resource_id=quiz1.id, details={"version": 1}))
        db.add(AuditLog(action=AuditAction.QUIZ_PUBLISHED, user_id=admin.id, resource_type="Quiz", resource_id=quiz2.id, details={"version": 1}))

        await db.commit()
        print("Database successfully seeded with realistic sample data!")


if __name__ == "__main__":
    asyncio.run(seed_database())

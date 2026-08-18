import asyncio
import sys
from pathlib import Path

# Add project root and backend dir to sys.path
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _BACKEND_DIR.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from datetime import datetime, timedelta, timezone
from backend.app.core.database import AsyncSessionLocal, Base, engine
from backend.app.core.security import get_password_hash
from backend.app.models.attempt import AssessmentAttempt, AttemptStatus
from backend.app.models.audit import AuditAction, AuditLog
from backend.app.models.category import Category
from backend.app.models.certificate import Certificate
from backend.app.models.notification import Notification
from backend.app.models.question import DifficultyLevel, Question, QuestionOption, QuestionType
from backend.app.models.quiz import Quiz, QuizStatus, QuizVersion
from backend.app.models.result import Result
from backend.app.models.user import User, UserRole, UserStatus


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
        cat_sec = Category(
            name="Cybersecurity & Web Security",
            slug="cybersecurity-web-security",
            description="Web application security, OWASP API Top 10, cryptographic primitives, and penetration defense.",
        )
        cat_cloud = Category(
            name="Cloud Architecture & DevOps",
            slug="cloud-architecture-devops",
            description="Distributed infrastructure, Kubernetes orchestration, CI/CD pipelines, and high availability.",
        )
        cat_db = Category(
            name="Database Engineering & SQL",
            slug="database-engineering-sql",
            description="Relational modeling, B-Tree index optimization, MVCC concurrency, and ACID transactions.",
        )
        cat_algo = Category(
            name="Algorithms & Data Structures",
            slug="algorithms-data-structures",
            description="Algorithmic complexity, dynamic programming, graph traversal, and optimized data structures.",
        )
        cat_sys = Category(
            name="System Design & Scalability",
            slug="system-design-scalability",
            description="High-throughput systems, event-driven streaming, caching architectures, and load balancing.",
        )
        cat_fullstack = Category(
            name="Fullstack React & TypeScript",
            slug="fullstack-react-typescript",
            description="Modern React 19 architecture, asynchronous state, type narrowing, and web performance.",
        )
        cat_ai = Category(
            name="AI & Machine Learning Engineering",
            slug="ai-ml-engineering",
            description="Large language models, vector embeddings, retrieval-augmented generation (RAG), and neural architectures.",
        )

        db.add_all([cat_sec, cat_cloud, cat_db, cat_algo, cat_sys, cat_fullstack, cat_ai])
        await db.flush()

        print("Seeding Quizzes and Comprehensive Question Banks...")

        # Helper to create quiz + version + questions
        async def create_quiz_with_questions(
            category_id: str,
            title: str,
            description: str,
            duration_minutes: int,
            passing_percentage: float,
            max_attempts: int,
            negative_marking: bool,
            negative_val: float,
            questions_data: list,
            is_draft: bool = False,
        ):
            status = QuizStatus.DRAFT if is_draft else QuizStatus.PUBLISHED
            quiz_obj = Quiz(
                title=title,
                description=description,
                category_id=category_id,
                status=status,
                created_by=admin.id,
            )
            db.add(quiz_obj)
            await db.flush()

            ver_obj = QuizVersion(
                quiz_id=quiz_obj.id,
                version_number=1,
                duration_seconds=duration_minutes * 60,
                passing_percentage=passing_percentage,
                max_attempts=max_attempts,
                shuffle_questions=True,
                shuffle_options=True,
                negative_marking_enabled=negative_marking,
                negative_mark_value=negative_val,
                show_result_immediately=True,
                show_correct_answers=True,
                show_explanations=True,
                allow_review=True,
                allow_resume=True,
                published_at=None if is_draft else datetime.now(timezone.utc),
            )
            db.add(ver_obj)
            await db.flush()

            for pos, q_item in enumerate(questions_data, start=1):
                q_record = Question(
                    quiz_version_id=ver_obj.id,
                    question_text=q_item["text"],
                    question_type=QuestionType.MCQ_SINGLE,
                    marks=q_item.get("marks", 2.0),
                    difficulty=q_item.get("diff", DifficultyLevel.MEDIUM),
                    explanation=q_item.get("exp", ""),
                    position=pos,
                )
                db.add(q_record)
                await db.flush()

                for opt_pos, (opt_text, is_corr) in enumerate(q_item["options"], start=1):
                    opt_record = QuestionOption(
                        question_id=q_record.id,
                        option_text=opt_text,
                        position=opt_pos,
                        is_correct=is_corr,
                    )
                    db.add(opt_record)

            return quiz_obj, ver_obj

        # -------------------------------------------------------------
        # 1. Cybersecurity: OWASP API Security & Web Vulnerabilities
        # -------------------------------------------------------------
        quiz1, q1_ver = await create_quiz_with_questions(
            category_id=cat_sec.id,
            title="OWASP API Security & Web Vulnerabilities",
            description="Assess your mastery of modern API security vulnerabilities including BOLA, BFLA, SSRF, mass assignment, and cryptographic validation.",
            duration_minutes=20,
            passing_percentage=70.0,
            max_attempts=3,
            negative_marking=True,
            negative_val=0.5,
            questions_data=[
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
                    ],
                },
                {
                    "text": "Which HTTP status code should a secure server return when an authenticated user attempts to access an administrative endpoint without sufficient privileges?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "403 Forbidden indicates the identity is authenticated but lacks access permissions. 401 indicates missing or invalid authentication credentials.",
                    "options": [
                        ("403 Forbidden", True),
                        ("401 Unauthorized", False),
                        ("400 Bad Request", False),
                        ("404 Not Found", False),
                    ],
                },
                {
                    "text": "How does a Mass Assignment vulnerability typically manifest in modern REST APIs?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Mass assignment occurs when client input is directly bound to internal data models without schema filtering, allowing attackers to overwrite fields like 'is_admin' or 'status'.",
                    "options": [
                        ("Binding client request payloads directly to database models without property whitelisting", True),
                        ("Sending too many concurrent requests to a single server", False),
                        ("Reusing the same JWT token across multiple client sessions", False),
                        ("Executing raw SQL queries via string concatenation", False),
                    ],
                },
                {
                    "text": "Why should password reset and verification tokens be stored as cryptographic hashes in the database rather than plaintext?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Hashing reset tokens ensures that a database read leak does not allow attackers to hijack pending password resets.",
                    "options": [
                        ("To protect pending account recoveries even if database backups or dumps are compromised", True),
                        ("To reduce the storage size of tokens in the database table", False),
                        ("To make token generation faster on high-traffic servers", False),
                        ("To satisfy browser CORS header requirements", False),
                    ],
                },
                {
                    "text": "In a robust assessment and governance platform, which component must be the single source of truth for timer expiration and scoring?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "The backend server and database must strictly control assessment time windows and scoring calculation to prevent client tampering.",
                    "options": [
                        ("The backend server and database timestamp", True),
                        ("The browser's window.localStorage timestamp", False),
                        ("The client's JavaScript setInterval clock", False),
                        ("The HTTP client's Date request header", False),
                    ],
                },
            ],
        )

        # -------------------------------------------------------------
        # 2. Cybersecurity: Applied Cryptography & Auth Protocols
        # -------------------------------------------------------------
        await create_quiz_with_questions(
            category_id=cat_sec.id,
            title="Applied Cryptography & Authentication Protocols",
            description="Evaluate cryptographic standards, symmetric vs asymmetric encryption, JWT security, OAuth 2.1 PKCE, and key management.",
            duration_minutes=25,
            passing_percentage=75.0,
            max_attempts=2,
            negative_marking=True,
            negative_val=0.5,
            questions_data=[
                {
                    "text": "Why is the PKCE (Proof Key for Code Exchange) flow mandatory for Single Page Apps (SPAs) and mobile clients in OAuth 2.1?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Public clients cannot securely store a static client_secret; PKCE uses a dynamic code verifier and code challenge per authorization request.",
                    "options": [
                        ("Public clients cannot safely maintain a confidential client secret without exposure", True),
                        ("PKCE replaces the need for HTTPS encryption during token exchange", False),
                        ("PKCE automatically encrypts database columns on the authorization server", False),
                        ("It reduces the HTTP payload size by compressing JSON web tokens", False),
                    ],
                },
                {
                    "text": "Which algorithm is recommended for secure password hashing due to its memory-hard resistance against GPU/ASIC attacks?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "Argon2id (and bcrypt/scrypt) provides tunable memory and CPU cost factors that resist parallel hardware attacks.",
                    "options": [
                        ("Argon2id / bcrypt", True),
                        ("SHA-256 with 10 iterations", False),
                        ("HMAC-MD5", False),
                        ("AES-256-GCM", False),
                    ],
                },
                {
                    "text": "What is the critical security vulnerability if a JWT verification library accepts the 'none' algorithm in the header?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "The 'none' algorithm allows an attacker to tamper with the JWT payload and strip the signature entirely, achieving arbitrary authorization.",
                    "options": [
                        ("Attackers can craft arbitrary claims without needing a signature verification", True),
                        ("Tokens will fail to deserialize in Safari and Firefox", False),
                        ("The server will exhaust memory allocating asymmetric key pairs", False),
                        ("CORS preflight checks will fail permanently", False),
                    ],
                },
                {
                    "text": "In AES-GCM encryption, what catastrophic failure occurs if the same Nonce (Initialization Vector) is reused with the same key?",
                    "marks": 4.0,
                    "diff": DifficultyLevel.HARD,
                    "exp": "Reusing a nonce with AES-GCM allows an attacker to recover the authentication key and forge or decrypt ciphertexts.",
                    "options": [
                        ("The authentication tag key is compromised, enabling forgery and plaintext recovery", True),
                        ("The ciphertext becomes 50% larger due to padding expansion", False),
                        ("The CPU throws a division-by-zero hardware exception", False),
                        ("The key is automatically revoked by the certificate authority", False),
                    ],
                },
                {
                    "text": "What is the primary function of the 'SameSite=Strict' attribute on HTTP cookies?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "SameSite=Strict prevents the cookie from being sent in cross-site requests, mitigating Cross-Site Request Forgery (CSRF).",
                    "options": [
                        ("Mitigates Cross-Site Request Forgery (CSRF) by withholding cookies on cross-origin requests", True),
                        ("Forces the browser to encrypt the cookie content using RSA", False),
                        ("Prevents client-side JavaScript from reading document.cookie (which is HttpOnly)", False),
                        ("Ensures the cookie is only valid during the current active tab session", False),
                    ],
                },
            ],
        )

        # -------------------------------------------------------------
        # 3. Cloud Architecture: Cloud Architecture & Distributed Systems
        # -------------------------------------------------------------
        quiz2, q2_ver = await create_quiz_with_questions(
            category_id=cat_cloud.id,
            title="Cloud Architecture & Distributed Systems",
            description="Test your understanding of high availability, horizontal scaling, CAP theorem, failure domains, and resilient topologies.",
            duration_minutes=15,
            passing_percentage=60.0,
            max_attempts=3,
            negative_marking=False,
            negative_val=0.0,
            questions_data=[
                {
                    "text": "According to the CAP Theorem, what tradeoff must a distributed system make in the presence of an inevitable network partition (P)?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "When a network partition occurs, a system must choose between Consistency (C) and Availability (A).",
                    "options": [
                        ("Choose between Consistency (C) and Availability (A)", True),
                        ("Choose between Performance (P) and Durability (D)", False),
                        ("Choose between Concurrency (C) and Atomicity (A)", False),
                        ("Choose between Latency (L) and Throughput (T)", False),
                    ],
                },
                {
                    "text": "What is the primary role of a readiness probe in Kubernetes or container orchestrators?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "Readiness probes determine if a container is ready to accept incoming network traffic from service endpoints.",
                    "options": [
                        ("To signal when a container is ready to receive network traffic", True),
                        ("To restart containers when memory leaks occur", False),
                        ("To build Docker images automatically on git push", False),
                        ("To encrypt persistent volume claims at rest", False),
                    ],
                },
                {
                    "text": "Which load balancing algorithm directs incoming traffic to the server currently handling the fewest active connections?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "Least Connections assigns incoming requests to the server with the fewest active sessions/connections.",
                    "options": [
                        ("Least Connections", True),
                        ("Round Robin", False),
                        ("IP Hash", False),
                        ("Weighted Random", False),
                    ],
                },
                {
                    "text": "What is the purpose of the Circuit Breaker pattern in microservice communication?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Circuit breakers prevent cascading failures by failing fast when downstream services are degraded or unresponsive.",
                    "options": [
                        ("To prevent cascading failures across services by quickly failing requests when downstream calls fail repeatedly", True),
                        ("To encrypt inter-service traffic using mutual TLS certificates", False),
                        ("To compress RPC payloads to save egress bandwidth", False),
                        ("To automatically balance SQL reads across read replicas", False),
                    ],
                },
                {
                    "text": "In distributed consensus, how does the Raft algorithm achieve leader election quorum?",
                    "marks": 4.0,
                    "diff": DifficultyLevel.HARD,
                    "exp": "A candidate node must win votes from a majority (N/2 + 1) of the cluster nodes to become the cluster leader.",
                    "options": [
                        ("Receiving votes from a strict majority of nodes (N/2 + 1) in the cluster", True),
                        ("Having the fastest CPU execution speed during elections", False),
                        ("Broadcasting an unauthenticated UDP message to all IP subnets", False),
                        ("Relying on a centralized clock with nanosecond precision", False),
                    ],
                },
            ],
        )

        # -------------------------------------------------------------
        # 4. Cloud Architecture: Kubernetes & Container Orchestration Pro
        # -------------------------------------------------------------
        await create_quiz_with_questions(
            category_id=cat_cloud.id,
            title="Kubernetes & Container Orchestration Pro",
            description="Deep dive into Kubernetes internals: Pod lifecycle, Ingress controllers, Horizontal Pod Autoscaling (HPA), and zero-downtime rollouts.",
            duration_minutes=20,
            passing_percentage=70.0,
            max_attempts=3,
            negative_marking=True,
            negative_val=0.25,
            questions_data=[
                {
                    "text": "What is the key difference between a Kubernetes Deployment's 'RollingUpdate' and 'Recreate' strategy?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "RollingUpdate spins up new Pods incrementally while terminating old ones for zero downtime; Recreate kills all old Pods before starting new ones.",
                    "options": [
                        ("RollingUpdate incrementally replaces Pods for zero downtime, while Recreate terminates all existing Pods first", True),
                        ("Recreate is used only for stateful databases, while RollingUpdate is for batch jobs", False),
                        ("RollingUpdate bypasses cluster DNS records completely", False),
                        ("Recreate requires manual admin approval for every individual Pod", False),
                    ],
                },
                {
                    "text": "What metric source is used by standard Kubernetes Horizontal Pod Autoscaler (HPA) without custom metrics adapters?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Standard HPA queries resource metrics (CPU and Memory utilization) collected by the Metrics Server.",
                    "options": [
                        ("CPU utilization and Memory consumption via Metrics Server", True),
                        ("Database active connection pools", False),
                        ("Incoming HTTP 500 error rates", False),
                        ("Network interface packet loss percentage", False),
                    ],
                },
                {
                    "text": "Which Kubernetes resource guarantees that exactly one instance of a Pod runs on every matching worker node in the cluster?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "A DaemonSet ensures all (or some) nodes run a copy of a Pod (common for logging agents and monitoring daemons).",
                    "options": [
                        ("DaemonSet", True),
                        ("StatefulSet", False),
                        ("ReplicaSet", False),
                        ("Job", False),
                    ],
                },
                {
                    "text": "Why should container processes avoid running as PID 1 (root user) in production container environments?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Running non-root mitigates container breakout attacks and ensures proper signal handling (SIGTERM) when PID 1 handles init lifecycle.",
                    "options": [
                        ("To reduce the attack surface against container escape vulnerabilities and ensure graceful signal handling", True),
                        ("Docker engines refuse to schedule containers with user ID 0", False),
                        ("Root containers consume twice as much RAM on the host kernel", False),
                        ("It prevents container logs from appearing in stdout", False),
                    ],
                },
                {
                    "text": "In Kubernetes networking, what is the role of the CNI (Container Network Interface) plugin?",
                    "marks": 4.0,
                    "diff": DifficultyLevel.HARD,
                    "exp": "CNI plugins (Calico, Cilium, Flannel) allocate IP addresses to Pods and establish routing/network policies across nodes.",
                    "options": [
                        ("Allocates unique IP addresses to Pods and manages cross-node routing and network policies", True),
                        ("Compiles Golang source code into container binaries", False),
                        ("Performs SSL/TLS termination on the host kernel", False),
                        ("Manages Docker image layer caching on remote registries", False),
                    ],
                },
            ],
        )

        # -------------------------------------------------------------
        # 5. Database Engineering: Relational Modeling & Advanced SQL Optimization
        # -------------------------------------------------------------
        await create_quiz_with_questions(
            category_id=cat_db.id,
            title="Relational Modeling & Advanced SQL Optimization",
            description="Master PostgreSQL query planner execution, composite indexing strategies, CTEs, Window Functions, and query optimization.",
            duration_minutes=25,
            passing_percentage=75.0,
            max_attempts=2,
            negative_marking=True,
            negative_val=0.5,
            questions_data=[
                {
                    "text": "In PostgreSQL and MySQL, when is an index scan preferred over a sequential/table scan by the query planner?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "When a query filters for high selectivity (a small percentage of total rows), index lookups save I/O over scanning the whole table.",
                    "options": [
                        ("When the query predicates match a small, highly selective subset of the total table rows", True),
                        ("Whenever a table contains more than 100 rows regardless of selectivity", False),
                        ("Only when executing full outer joins across unindexed columns", False),
                        ("When the query includes an explicit LIMIT 1000000 clause", False),
                    ],
                },
                {
                    "text": "Given a composite B-Tree index on (tenant_id, created_at, status), which query CANNOT efficiently use the index leading column?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "B-Tree composite indexes can only be used from left to right; a query filtering only on 'created_at' and 'status' misses the leading prefix.",
                    "options": [
                        ("WHERE created_at > '2026-01-01' AND status = 'ACTIVE' (missing leading tenant_id)", True),
                        ("WHERE tenant_id = 't1' AND created_at > '2026-01-01'", False),
                        ("WHERE tenant_id = 't1' AND created_at = '2026-01-01' AND status = 'COMPLETED'", False),
                        ("WHERE tenant_id = 't1'", False),
                    ],
                },
                {
                    "text": "What is the difference between ROW_NUMBER() and DENSE_RANK() window functions when encountering identical values?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "ROW_NUMBER() always assigns unique sequential integers, whereas DENSE_RANK() assigns identical ranks to ties without skipping subsequent ranks.",
                    "options": [
                        ("ROW_NUMBER() assigns distinct sequential integers, while DENSE_RANK() assigns same rank to ties with no gaps", True),
                        ("DENSE_RANK() skips numbers after ties (e.g. 1, 2, 2, 4), while ROW_NUMBER() does not", False),
                        ("ROW_NUMBER() only operates on integer columns, whereas DENSE_RANK() works on text", False),
                        ("DENSE_RANK() modifies the underlying table data permanently", False),
                    ],
                },
                {
                    "text": "In PostgreSQL, what is the primary benefit of a Partial (Filtered) Index (e.g., CREATE INDEX ... WHERE status = 'PENDING')?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Partial indexes only index rows satisfying the WHERE condition, significantly reducing index size and write overhead.",
                    "options": [
                        ("Drastically reduces index disk footprint and maintenance overhead for skewed or status-filtered data", True),
                        ("Allows indexing binary image files directly", False),
                        ("Disables MVCC transaction isolation for those specific rows", False),
                        ("Enforces global unique constraints across multiple database shards", False),
                    ],
                },
                {
                    "text": "Why can N+1 query patterns cause severe degradation in ORMs like SQLAlchemy and Hibernate?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "N+1 executes 1 initial query to fetch N parents, followed by N separate network queries to fetch related children, multiplying network roundtrips.",
                    "options": [
                        ("It issues 1 query for the parent list plus N separate queries for each relationship, causing high network latency", True),
                        ("It forces the database to drop all table indexes during transaction commit", False),
                        ("It creates N concurrent database connection pools simultaneously", False),
                        ("It corrupts the PostgreSQL write-ahead log (WAL)", False),
                    ],
                },
            ],
        )

        # -------------------------------------------------------------
        # 6. Database Engineering: ACID Transactions & Concurrency
        # -------------------------------------------------------------
        await create_quiz_with_questions(
            category_id=cat_db.id,
            title="ACID Transactions & Database Concurrency",
            description="Deep dive into ANSI SQL transaction isolation levels, phantom reads, write skew, MVCC tuple versioning, and deadlocks.",
            duration_minutes=20,
            passing_percentage=70.0,
            max_attempts=3,
            negative_marking=True,
            negative_val=0.5,
            questions_data=[
                {
                    "text": "What concurrency anomaly is permitted under 'Read Committed' isolation but prevented under 'Repeatable Read'?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Non-repeatable reads occur when a transaction re-reads a row and sees changes committed by another transaction in the meantime.",
                    "options": [
                        ("Non-repeatable (Fuzzy) Reads", True),
                        ("Dirty Reads", False),
                        ("Dirty Writes", False),
                        ("Physical Disk Corruption", False),
                    ],
                },
                {
                    "text": "In PostgreSQL's Multi-Version Concurrency Control (MVCC), what happens when a row is updated?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "PostgreSQL inserts a new tuple version and marks the old tuple with xmax, allowing readers to proceed without lock contention.",
                    "options": [
                        ("A new version of the row is created and the old row's xmax is updated, avoiding read-write locking contention", True),
                        ("The existing row is modified in place with an exclusive table lock", False),
                        ("The entire table is duplicated into a temporary tablespace", False),
                        ("All active reader connections are terminated automatically", False),
                    ],
                },
                {
                    "text": "What is the primary function of the VACUUM process in PostgreSQL?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "VACUUM reclaims storage occupied by dead tuples from deleted or updated rows and prevents transaction ID wraparound.",
                    "options": [
                        ("Reclaims space left by dead/superseded row tuples and updates planner statistics", True),
                        ("Defragment's the client's web browser cache", False),
                        ("Backs up the database to Amazon S3 storage buckets", False),
                        ("Compiles SQL functions into machine code", False),
                    ],
                },
                {
                    "text": "What anomaly can occur under 'Snapshot / Repeatable Read' isolation that requires 'Serializable' isolation to prevent?",
                    "marks": 4.0,
                    "diff": DifficultyLevel.HARD,
                    "exp": "Write Skew occurs when concurrent transactions read overlapping data, make disjoint modifications based on constraints, and violate invariants.",
                    "options": [
                        ("Write Skew (where concurrent transactions read intersecting state and make conflicting decisions)", True),
                        ("Dirty Reads of uncommitted data", False),
                        ("Lost Updates under standard row locks", False),
                        ("TCP socket disconnects", False),
                    ],
                },
                {
                    "text": "What strategy is most effective for preventing deadlocks when multiple concurrent transactions update multiple tables?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Acquiring locks in a deterministic, consistent global order across all application transactions prevents circular wait conditions.",
                    "options": [
                        ("Accessing and locking resources in a consistent, deterministic order across all application code", True),
                        ("Increasing transaction timeout to 24 hours", False),
                        ("Disabling all primary keys and foreign key constraints", False),
                        ("Running all transactions on a single read-only replica", False),
                    ],
                },
            ],
        )

        # -------------------------------------------------------------
        # 7. Algorithms: Core Data Structures & Algorithmic Complexity
        # -------------------------------------------------------------
        await create_quiz_with_questions(
            category_id=cat_algo.id,
            title="Core Data Structures & Algorithmic Complexity",
            description="Evaluate knowledge of asymptotic Big-O bounds, Balanced Binary Search Trees, Hash Tables, Heaps, and Sorting.",
            duration_minutes=20,
            passing_percentage=65.0,
            max_attempts=3,
            negative_marking=False,
            negative_val=0.0,
            questions_data=[
                {
                    "text": "What is the worst-case time complexity of searching in an unbalanced Binary Search Tree (BST) versus a Red-Black Tree?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "An unbalanced BST can degenerate into a linked list with O(n) search time, whereas a balanced Red-Black tree guarantees O(log n).",
                    "options": [
                        ("O(n) for unbalanced BST vs O(log n) for Red-Black Tree", True),
                        ("O(1) for unbalanced BST vs O(n) for Red-Black Tree", False),
                        ("O(log n) for both equally", False),
                        ("O(n log n) for unbalanced BST vs O(n^2) for Red-Black Tree", False),
                    ],
                },
                {
                    "text": "In a Min-Heap with N elements, what is the time complexity of extracting the minimum element and restoring heap invariants?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "Extracting the root takes O(1), and bubbling down the last element to restore the min-heap property takes O(log n).",
                    "options": [
                        ("O(log n)", True),
                        ("O(1)", False),
                        ("O(n)", False),
                        ("O(n log n)", False),
                    ],
                },
                {
                    "text": "Which sorting algorithm is comparison-based, stable, and achieves O(n log n) worst-case time complexity?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Merge Sort is stable and guarantees O(n log n) worst-case. Quicksort worst case is O(n^2), and Heapsort is not stable.",
                    "options": [
                        ("Merge Sort", True),
                        ("Quick Sort", False),
                        ("Heap Sort", False),
                        ("Selection Sort", False),
                    ],
                },
                {
                    "text": "What technique resolves hash table collisions by storing collided elements in linked lists at each bucket array index?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "Separate Chaining maintains a linked list (or small tree) of entries at each bucket index.",
                    "options": [
                        ("Separate Chaining", True),
                        ("Linear Probing", False),
                        ("Quadratic Probing", False),
                        ("Double Hashing", False),
                    ],
                },
                {
                    "text": "What is the amortized time complexity of inserting N elements into a dynamic array that doubles capacity upon reaching threshold?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Geometric resizing ensures that total copy operations sum to 2N, giving an amortized O(1) time per append operation.",
                    "options": [
                        ("O(1) amortized per append", True),
                        ("O(n) amortized per append", False),
                        ("O(log n) amortized per append", False),
                        ("O(n^2) amortized per append", False),
                    ],
                },
            ],
        )

        # -------------------------------------------------------------
        # 8. Algorithms: Dynamic Programming & Advanced Graph Traversal
        # -------------------------------------------------------------
        await create_quiz_with_questions(
            category_id=cat_algo.id,
            title="Dynamic Programming & Advanced Graph Traversal",
            description="Challenge algorithmic reasoning on Bellman-Ford, Dijkstra, Topological Sort, DP memoization, and Minimum Spanning Trees.",
            duration_minutes=30,
            passing_percentage=70.0,
            max_attempts=2,
            negative_marking=True,
            negative_val=0.5,
            questions_data=[
                {
                    "text": "Under what condition does Dijkstra's algorithm fail to find the shortest path in a weighted directed graph?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "Dijkstra's algorithm assumes edge weights are non-negative. For graphs with negative edge weights, Bellman-Ford or SPFA is required.",
                    "options": [
                        ("When the graph contains negative edge weights", True),
                        ("When the graph contains more than 10,000 vertices", False),
                        ("When the graph is a Directed Acyclic Graph (DAG)", False),
                        ("When multiple paths have identical total weights", False),
                    ],
                },
                {
                    "text": "What is the time complexity of topological sorting on a Directed Acyclic Graph with V vertices and E edges using Kahn's algorithm?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Kahn's algorithm using in-degree tracking processes each vertex and edge once, achieving linear O(V + E) time.",
                    "options": [
                        ("O(V + E)", True),
                        ("O(V * E)", False),
                        ("O(V log V)", False),
                        ("O(E log V)", False),
                    ],
                },
                {
                    "text": "What two essential properties must a problem exhibit to be effectively solvable via Dynamic Programming?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Dynamic Programming requires Optimal Substructure (solution constructed from subproblems) and Overlapping Subproblems (subproblems are recomputed repeatedly).",
                    "options": [
                        ("Optimal Substructure and Overlapping Subproblems", True),
                        ("Greedy Choice Property and Infinite Recursion", False),
                        ("Linear Independence and Orthogonality", False),
                        ("Continuous Differentiability and Convexity", False),
                    ],
                },
                {
                    "text": "What is the state transition and time complexity for the standard 0/1 Knapsack problem with N items and capacity W?",
                    "marks": 4.0,
                    "diff": DifficultyLevel.HARD,
                    "exp": "DP[i][w] = max(DP[i-1][w], DP[i-1][w-wt[i]] + val[i]) running in pseudo-polynomial O(N * W) time.",
                    "options": [
                        ("DP table of size N x W with O(N * W) pseudo-polynomial time", True),
                        ("O(2^N) polynomial time", False),
                        ("O(N log W) strictly logarithmic time", False),
                        ("O(N + W) linear time", False),
                    ],
                },
                {
                    "text": "Which algorithm computes the Minimum Spanning Tree (MST) of a connected graph by iteratively adding the lowest-weight edge that does not form a cycle?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Kruskal's algorithm sorts edges by weight and uses a Disjoint Set Union (DSU / Union-Find) data structure to detect cycles.",
                    "options": [
                        ("Kruskal's Algorithm", True),
                        ("Floyd-Warshall Algorithm", False),
                        ("A* Search Algorithm", False),
                        ("Tarjan's Strongly Connected Components", False),
                    ],
                },
            ],
        )

        # -------------------------------------------------------------
        # 9. System Design: High-Scale System Design & Microservices
        # -------------------------------------------------------------
        await create_quiz_with_questions(
            category_id=cat_sys.id,
            title="High-Scale System Design & Microservices",
            description="Evaluate architectural decisions on Event-Driven architectures, Kafka partitioning, Cache-Aside vs Write-Through, and Rate Limiting.",
            duration_minutes=25,
            passing_percentage=75.0,
            max_attempts=2,
            negative_marking=True,
            negative_val=0.25,
            questions_data=[
                {
                    "text": "In distributed rate limiting, which algorithm allows bursts of requests while maintaining a steady long-term rate limit?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "The Token Bucket algorithm accumulates tokens at a constant rate up to bucket capacity, allowing bursts up to the capacity.",
                    "options": [
                        ("Token Bucket / Leaky Bucket", True),
                        ("Fixed Window Counter", False),
                        ("Round Robin Balancer", False),
                        ("Binary Exponential Backoff", False),
                    ],
                },
                {
                    "text": "In Apache Kafka or distributed message logs, how is strict message ordering guaranteed?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Kafka guarantees strict total order within a single partition for messages with the same partition key.",
                    "options": [
                        ("Ordering is guaranteed only within an individual topic partition", True),
                        ("Ordering is globally preserved across all topics and brokers automatically", False),
                        ("Consumers sort messages locally using client wall-clock time", False),
                        ("By running Kafka brokers on a single thread", False),
                    ],
                },
                {
                    "text": "What is the 'Thundering Herd' (Cache Stampede) problem in caching systems, and how is it mitigated?",
                    "marks": 4.0,
                    "diff": DifficultyLevel.HARD,
                    "exp": "Occurs when a popular cached key expires and thousands of concurrent requests hit the database simultaneously. Mitigated using distributed mutex locking or probabilistic early recomputation (XFetch).",
                    "options": [
                        ("Massive concurrent queries hitting the origin database when a hot cache key expires; mitigated by probabilistic early refresh or mutex locks", True),
                        ("When cache memory runs out and triggers OOM panic", False),
                        ("When network packets collide on a 10Gbps Ethernet switch", False),
                        ("When database connection strings are exposed in client logs", False),
                    ],
                },
                {
                    "text": "What is the primary operational distinction between Write-Through and Write-Behind (Write-Back) cache strategies?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Write-Through synchronously writes to both cache and database before returning; Write-Behind writes to cache immediately and asynchronously flushes to DB.",
                    "options": [
                        ("Write-Through synchronously updates cache and DB, while Write-Behind updates cache and flushes to DB asynchronously", True),
                        ("Write-Behind never writes to the database at all", False),
                        ("Write-Through is only supported in relational databases like SQLite", False),
                        ("Write-Behind encrypts cached values on disk", False),
                    ],
                },
                {
                    "text": "What mechanism ensures idempotency for financial payment processing or order placement endpoints?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Client supplies a unique Idempotency-Key in the request header, which the server checks in Redis/DB to prevent duplicate charges.",
                    "options": [
                        ("Unique Idempotency Keys stored with transaction status in an atomic distributed store", True),
                        ("Increasing TCP socket timeout to 60 seconds", False),
                        ("Adding a random delay before processing every request", False),
                        ("Relying exclusively on HTTP GET requests for state mutations", False),
                    ],
                },
            ],
        )

        # -------------------------------------------------------------
        # 10. Fullstack: Modern React 19 & TypeScript Architecture
        # -------------------------------------------------------------
        await create_quiz_with_questions(
            category_id=cat_fullstack.id,
            title="Modern React 19 & TypeScript Architecture",
            description="Explore modern front-end engineering: React 19 actions, concurrent rendering, TanStack Query cache invalidation, and TypeScript generics.",
            duration_minutes=20,
            passing_percentage=70.0,
            max_attempts=3,
            negative_marking=False,
            negative_val=0.0,
            questions_data=[
                {
                    "text": "In React 19, what is the primary purpose of the 'useActionState' (formerly useFormState) hook?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "useActionState manages pending state, returned action data, and error boundaries for async server and client form actions.",
                    "options": [
                        ("Manages pending states, optimistic responses, and errors for asynchronous actions", True),
                        ("Replaces CSS stylesheets with inline JSON", False),
                        ("Provides direct low-level access to the GPU shader canvas", False),
                        ("Automatically creates PostgreSQL tables from JSX components", False),
                    ],
                },
                {
                    "text": "In TypeScript, what is the purpose of the 'never' type in exhaustive switch matching?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Assigning unhandled union cases to 'never' causes a compile-time type error if a new union variant is added without being handled.",
                    "options": [
                        ("Guarantees compile-time exhaustiveness checking so unhandled union variants trigger type errors", True),
                        ("Prevents any variable from ever being initialized in memory", False),
                        ("Tells the TypeScript compiler to ignore syntax errors", False),
                        ("Converts all functions into asynchronous Promises", False),
                    ],
                },
                {
                    "text": "When using TanStack Query (React Query), why is key-based cache invalidation (queryClient.invalidateQueries) preferred over manual state mutation?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "Invalidation marks cached data as stale and triggers intelligent background refetches, maintaining single-source-of-truth consistency.",
                    "options": [
                        ("Ensures background refetching and consistency with the server single-source-of-truth without race conditions", True),
                        ("Eliminates the need for HTTP headers in API requests", False),
                        ("Stores all query results in browser localStorage permanently", False),
                        ("Disables CORS verification on the client side", False),
                    ],
                },
                {
                    "text": "What performance problem does React's 'useTransition' hook solve during intensive UI updates?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "useTransition marks non-urgent state updates as interruptible, allowing urgent inputs (typing, clicking) to keep the UI responsive.",
                    "options": [
                        ("Allows heavy render calculations to be interruptible so user interactions like typing remain responsive", True),
                        ("Transitions CSS animations using WebGL hardware acceleration", False),
                        ("Encrypts client-side state across browser tabs", False),
                        ("Automatically compresses JPEG images on upload", False),
                    ],
                },
                {
                    "text": "In TypeScript, how does the 'as const' assertion affect object literals and array definitions?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "'as const' narrows types to their exact readonly literal values rather than widened types like string or number.",
                    "options": [
                        ("Narrows all property types to their exact literal values and marks them deeply readonly", True),
                        ("Converts the object into a JavaScript Map instance", False),
                        ("Bypasses TypeScript type checking entirely for that object", False),
                        ("Stores the object in the browser Web Workers thread", False),
                    ],
                },
            ],
        )

        # -------------------------------------------------------------
        # 11. AI & ML: Generative AI & LLM Systems Engineering
        # -------------------------------------------------------------
        await create_quiz_with_questions(
            category_id=cat_ai.id,
            title="Generative AI & LLM Systems Engineering",
            description="Evaluate core understanding of Transformer attention mechanisms, Vector Embeddings, RAG architectures, and Prompt Engineering.",
            duration_minutes=20,
            passing_percentage=70.0,
            max_attempts=3,
            negative_marking=False,
            negative_val=0.0,
            questions_data=[
                {
                    "text": "In the Transformer architecture, what is the computational complexity of the standard self-attention mechanism with respect to sequence length N?",
                    "marks": 3.0,
                    "diff": DifficultyLevel.MEDIUM,
                    "exp": "Standard self-attention computes query-key matrix multiplication of size N x N, yielding quadratic O(N^2) complexity.",
                    "options": [
                        ("O(N^2) quadratic with sequence length", True),
                        ("O(N) strictly linear with sequence length", False),
                        ("O(log N) logarithmic with sequence length", False),
                        ("O(N^3) cubic with sequence length", False),
                    ],
                },
                {
                    "text": "What is the primary role of Vector Embeddings in Retrieval-Augmented Generation (RAG) pipelines?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "Vector embeddings represent text semantics in continuous vector space, allowing fast cosine similarity search for relevant context.",
                    "options": [
                        ("Captures semantic meaning in high-dimensional vector space for approximate nearest neighbor retrieval", True),
                        ("Compresses audio waveforms into MP3 format", False),
                        ("Encrypts database passwords in memory", False),
                        ("Translates Python code directly into C++ binaries", False),
                    ],
                },
                {
                    "text": "In Vector Databases (e.g. pgvector, Pinecone), what is HNSW (Hierarchical Navigable Small World)?",
                    "marks": 4.0,
                    "diff": DifficultyLevel.HARD,
                    "exp": "HNSW is a graph-based indexing algorithm that enables sub-linear approximate nearest neighbor (ANN) search across millions of vectors.",
                    "options": [
                        ("A multi-layer graph-based index for fast Approximate Nearest Neighbor (ANN) vector search", True),
                        ("A neural network for image segmentation", False),
                        ("A distributed protocol for Bitcoin blockchain validation", False),
                        ("A lossless compression algorithm for JSON payloads", False),
                    ],
                },
                {
                    "text": "What is 'Temperature' in LLM token sampling, and what does setting Temperature = 0.0 achieve?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "Temperature controls randomness; 0.0 produces greedy deterministic decoding by always picking the highest probability token.",
                    "options": [
                        ("Controls probability distribution sharpness; 0.0 produces deterministic, greedy token selection", True),
                        ("Regulates the GPU temperature in degrees Celsius", False),
                        ("Limits the maximum number of output tokens to 0", False),
                        ("Disables safety content filtering on prompt responses", False),
                    ],
                },
                {
                    "text": "What technique uses few-shot demonstration examples to guide an LLM to generate strict structured JSON outputs?",
                    "marks": 2.0,
                    "diff": DifficultyLevel.EASY,
                    "exp": "Providing few-shot examples or schema-constrained grammars guides LLMs reliably toward schema-conformant JSON output.",
                    "options": [
                        ("In-context few-shot prompting with JSON schema constraints / grammar-guided decoding", True),
                        ("Binary quantization of weights", False),
                        ("Gradient descent during inference", False),
                        ("Layer normalization bypass", False),
                    ],
                },
            ],
        )

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
        print("Database successfully seeded with 11 comprehensive assessments and rich question banks across 7 technical categories!")


if __name__ == "__main__":
    asyncio.run(seed_database())

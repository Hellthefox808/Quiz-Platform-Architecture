import asyncio
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from backend.app.core.config import settings
from backend.app.core.database import Base, get_db
from backend.app.core.security import create_access_token, get_password_hash
from backend.app.main import app
from backend.app.models.category import Category
from backend.app.models.question import DifficultyLevel, Question, QuestionOption, QuestionType
from backend.app.models.quiz import Quiz, QuizStatus, QuizVersion
from backend.app.models.user import User, UserRole, UserStatus

# Test DB in memory with StaticPool for reliable isolated in-memory transactions across threads
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingAsyncSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="function")
async def db_session():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingAsyncSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def test_admin(db_session: AsyncSession) -> User:
    admin = User(
        name="Test Administrator",
        email="admin@test.io",
        password_hash=get_password_hash("AdminPass123"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest_asyncio.fixture(scope="function")
async def test_student(db_session: AsyncSession) -> User:
    student = User(
        name="Student One",
        email="student1@test.io",
        password_hash=get_password_hash("StudentPass123"),
        role=UserRole.STUDENT,
        status=UserStatus.ACTIVE,
    )
    db_session.add(student)
    await db_session.commit()
    await db_session.refresh(student)
    return student


@pytest_asyncio.fixture(scope="function")
async def test_student_2(db_session: AsyncSession) -> User:
    student2 = User(
        name="Student Two",
        email="student2@test.io",
        password_hash=get_password_hash("StudentPass123"),
        role=UserRole.STUDENT,
        status=UserStatus.ACTIVE,
    )
    db_session.add(student2)
    await db_session.commit()
    await db_session.refresh(student2)
    return student2


def get_auth_headers(user: User) -> dict:
    token = create_access_token(
        subject=user.id,
        extra_claims={"email": user.email, "role": user.role.value, "name": user.name}
    )
    return {"Authorization": f"Bearer {token}"}

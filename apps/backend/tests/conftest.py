import os

# Тесты никогда не должны трогать настоящую базу
os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"
os.environ["SECRET_KEY"] = "test-secret-key-for-tests-only-0123456789"
os.environ["ENVIRONMENT"] = "development"

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.core.database import get_db  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.models import (  # noqa: E402
    Base,
    Direction,
    Level,
    Profession,
    ProfessionSkill,
    ProfessionStatus,
    Skill,
    SkillDependency,
    User,
    UserRole,
)

PASSWORD = "Strong123"


@pytest_asyncio.fixture
async def session_factory():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(session_factory):
    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def sent_emails(monkeypatch):
    """Перехватывает письма сброса пароля: список (email, токен)."""
    sent: list[tuple[str, str]] = []

    async def fake_send(to: str, token: str) -> None:
        sent.append((to, token))

    monkeypatch.setattr("app.api.v1.endpoints.auth.send_password_reset_email", fake_send)
    return sent


@pytest_asyncio.fixture
async def professions(session_factory):
    rows = [
        Profession(
            slug="python-developer",
            title="Разработчик на Питоне",
            direction="Разработка",
            description="Серверные приложения на Python",
            entry_level=Level.BEGINNER,
            status=ProfessionStatus.PUBLISHED,
            skills_count=20,
            estimated_weeks=12,
        ),
        Profession(
            slug="data-analyst",
            title="Аналитик данных",
            direction="Аналитика",
            description="Отчёты и данные",
            status=ProfessionStatus.PUBLISHED,
            skills_count=22,
            estimated_weeks=14,
        ),
        Profession(
            slug="product-manager",
            title="Менеджер продукта",
            direction="Управление",
            description="Приоритеты 100% результата",
            status=ProfessionStatus.PUBLISHED,
            skills_count=20,
            estimated_weeks=12,
        ),
        Profession(
            slug="secret-draft",
            title="Черновик профессии",
            direction="Разработка",
            description="",
            status=ProfessionStatus.DRAFT,
        ),
    ]
    async with session_factory() as db:
        db.add_all(rows)
        await db.commit()
        for r in rows:
            await db.refresh(r)
        return {r.slug: r.id for r in rows}


@pytest_asyncio.fixture
async def published_profession_id(professions):
    return professions["python-developer"]


@pytest_asyncio.fixture
async def sample_skill_id(session_factory, professions):
    async with session_factory() as db:
        skill = Skill(
            slug="python-basics",
            title="Основы Python",
            description="Синтаксис",
            category="Программирование",
            difficulty=1,       # int 1–5, не Level
            layer=0,
            estimated_hours=20,
        )
        db.add(skill)
        await db.flush()
        link = ProfessionSkill(
            profession_id=professions["python-developer"],
            skill_id=skill.id,
            position=0,
            is_core=True,
            # prerequisite_ids больше нет — связи в SkillDependency
        )
        db.add(link)
        await db.commit()
        await db.refresh(skill)
        return skill.id


@pytest_asyncio.fixture
async def auth_client(client, session_factory):
    await create_user(session_factory, "anna@example.ru")
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "anna@example.ru", "password": PASSWORD},
    )
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client


async def create_user(session_factory, email, role=UserRole.STUDENT, password=PASSWORD):
    async with session_factory() as db:
        db.add(
            User(
                email=email,
                name="Тест",
                password_hash=hash_password(password),
                role=role,
                is_email_verified=True,
            )
        )
        await db.commit()


async def register(client, email="anna@example.ru", name="Анна", password=PASSWORD):
    return await client.post(
        "/api/v1/auth/register",
        json={"email": email, "name": name, "password": password},
    )


def bearer(response) -> dict:
    return {"Authorization": f"Bearer {response.json()['access_token']}"}

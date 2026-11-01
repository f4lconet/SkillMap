from app.models import UserRole
from tests.conftest import PASSWORD, bearer, create_user, register

PING = "/api/v1/admin/ping"


async def test_ping_without_token(client):
    assert (await client.get(PING)).status_code == 401


async def test_student_forbidden(client):
    headers = bearer(await register(client))
    assert (await client.get(PING, headers=headers)).status_code == 403


async def test_editor_allowed(client, session_factory):
    await create_user(session_factory, "editor@example.com", UserRole.EDITOR)
    login = await client.post("/api/v1/auth/login", json={"email": "editor@example.com", "password": PASSWORD})
    assert (await client.get(PING, headers=bearer(login))).status_code == 200


async def test_health(client):
    assert (await client.get("/health")).json() == {"status": "ok"}

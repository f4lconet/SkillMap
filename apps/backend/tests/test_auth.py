from datetime import UTC, datetime, timedelta

from sqlalchemy import update

from app.models import PasswordResetToken
from tests.conftest import PASSWORD, bearer, register

AUTH = "/api/v1/auth"


async def test_register_ok(client):
    response = await register(client)
    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert "refresh_token" in response.headers["set-cookie"]
    assert "HttpOnly" in response.headers["set-cookie"]


async def test_register_duplicate_email_case_insensitive(client):
    await register(client, email="anna@example.ru")
    response = await register(client, email="Anna@Example.RU")
    assert response.status_code == 409


async def test_register_weak_password(client):
    for bad in ["short1", "onlyletters", "12345678"]:
        response = await register(client, password=bad)
        assert response.status_code == 422
        errors = response.json()["errors"]
        assert errors[0]["field"] == "password"
        assert errors[0]["message"]


async def test_register_invalid_email(client):
    response = await register(client, email="not-an-email")
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "email"


async def test_login_ok_and_me(client):
    await register(client)
    response = await client.post(f"{AUTH}/login", json={"email": "ANNA@example.ru", "password": PASSWORD})
    assert response.status_code == 200
    me = await client.get("/api/v1/me", headers=bearer(response))
    assert me.status_code == 200
    assert me.json()["email"] == "anna@example.ru"
    assert me.json()["role"] == "student"
    assert "password_hash" not in me.json()


async def test_login_failures_look_identical(client):
    await register(client)
    wrong_password = await client.post(f"{AUTH}/login", json={"email": "anna@example.ru", "password": "Wrong123"})
    unknown_email = await client.post(f"{AUTH}/login", json={"email": "nobody@example.ru", "password": PASSWORD})
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()


async def test_protected_route_requires_valid_token(client):
    assert (await client.get("/api/v1/me")).status_code == 401
    bad = await client.get("/api/v1/me", headers={"Authorization": "Bearer garbage"})
    assert bad.status_code == 401


async def test_refresh_rotates_tokens(client):
    await register(client)
    old_cookie = client.cookies.get("refresh_token")
    response = await client.post(f"{AUTH}/refresh")
    assert response.status_code == 200
    assert response.json()["access_token"]
    assert client.cookies.get("refresh_token") != old_cookie


async def test_refresh_reuse_revokes_all_sessions(client):
    await register(client)
    old_cookie = client.cookies.get("refresh_token")
    await client.post(f"{AUTH}/refresh")
    new_cookie = client.cookies.get("refresh_token")
    client.cookies.clear()

    reuse = await client.post(f"{AUTH}/refresh", headers={"Cookie": f"refresh_token={old_cookie}"})
    assert reuse.status_code == 401
    after = await client.post(f"{AUTH}/refresh", headers={"Cookie": f"refresh_token={new_cookie}"})
    assert after.status_code == 401


async def test_refresh_without_cookie(client):
    assert (await client.post(f"{AUTH}/refresh")).status_code == 401


async def test_logout_revokes_refresh(client):
    await register(client)
    cookie = client.cookies.get("refresh_token")
    assert (await client.post(f"{AUTH}/logout")).status_code == 204
    client.cookies.clear()
    response = await client.post(f"{AUTH}/refresh", headers={"Cookie": f"refresh_token={cookie}"})
    assert response.status_code == 401


async def test_password_reset_full_flow(client, sent_emails):
    await register(client)

    response = await client.post(f"{AUTH}/password-reset/request", json={"email": "anna@example.ru"})
    assert response.status_code == 200
    assert len(sent_emails) == 1
    to, token = sent_emails[0]
    assert to == "anna@example.ru"

    confirm = await client.post(f"{AUTH}/password-reset/confirm", json={"token": token, "password": "NewPass456"})
    assert confirm.status_code == 200

    old = await client.post(f"{AUTH}/login", json={"email": "anna@example.ru", "password": PASSWORD})
    new = await client.post(f"{AUTH}/login", json={"email": "anna@example.ru", "password": "NewPass456"})
    assert old.status_code == 401
    assert new.status_code == 200

    reuse = await client.post(f"{AUTH}/password-reset/confirm", json={"token": token, "password": "Another789"})
    assert reuse.status_code == 400


async def test_password_reset_unknown_email_same_answer(client, sent_emails):
    await register(client)
    known = await client.post(f"{AUTH}/password-reset/request", json={"email": "anna@example.ru"})
    unknown = await client.post(f"{AUTH}/password-reset/request", json={"email": "ghost@example.ru"})
    assert known.json() == unknown.json()
    assert len(sent_emails) == 1


async def test_password_reset_expired_token(client, sent_emails, session_factory):
    await register(client)
    await client.post(f"{AUTH}/password-reset/request", json={"email": "anna@example.ru"})
    token = sent_emails[0][1]
    async with session_factory() as db:
        await db.execute(update(PasswordResetToken).values(expires_at=datetime.now(UTC) - timedelta(minutes=1)))
        await db.commit()
    response = await client.post(f"{AUTH}/password-reset/confirm", json={"token": token, "password": "NewPass456"})
    assert response.status_code == 400


async def test_password_reset_revokes_refresh_tokens(client, sent_emails):
    await register(client)
    cookie = client.cookies.get("refresh_token")
    await client.post(f"{AUTH}/password-reset/request", json={"email": "anna@example.ru"})
    await client.post(f"{AUTH}/password-reset/confirm", json={"token": sent_emails[0][1], "password": "NewPass456"})
    client.cookies.clear()
    response = await client.post(f"{AUTH}/refresh", headers={"Cookie": f"refresh_token={cookie}"})
    assert response.status_code == 401

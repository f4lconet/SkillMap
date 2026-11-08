from __future__ import annotations

from typing import Any

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import User, UserRole
from app.services.auth import issue_tokens

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


def _github_configured() -> bool:
    s = get_settings()
    return bool(s.github_client_id and s.github_client_secret and s.github_redirect_uri)


def build_github_authorize_url(state: str) -> str:
    if not _github_configured():
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "GitHub OAuth не настроен")
    s = get_settings()
    from urllib.parse import urlencode
    params = {
        "client_id": s.github_client_id,
        "redirect_uri": s.github_redirect_uri,
        "scope": "read:user user:email",
        "state": state,
    }
    return f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}"


async def exchange_code_for_token(code: str) -> str:
    s = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": s.github_client_id,
                "client_secret": s.github_client_secret,
                "code": code,
                "redirect_uri": s.github_redirect_uri,
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"GitHub OAuth error: {data.get('error_description', data['error'])}",
            )
        return data["access_token"]


async def fetch_github_user(access_token: str) -> dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(GITHUB_USER_URL, headers=headers, timeout=15.0)
        user_resp.raise_for_status()
        user_data = user_resp.json()

        email = user_data.get("email")
        if not email:
            emails_resp = await client.get(GITHUB_EMAILS_URL, headers=headers, timeout=15.0)
            emails_resp.raise_for_status()
            emails = emails_resp.json()
            primary = next((e for e in emails if e.get("primary") and e.get("verified")), None)
            if primary:
                email = primary["email"]
            elif emails:
                email = emails[0]["email"]

        if not email:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Не удалось получить email из GitHub. Сделайте email публичным или добавьте verified email.",
            )

        return {
            "github_id": str(user_data["id"]),
            "email": email,
            "name": user_data.get("name") or user_data.get("login") or "GitHub User",
            "login": user_data.get("login"),
            "avatar_url": user_data.get("avatar_url"),
        }


async def get_or_create_github_user(db: AsyncSession, gh: dict[str, Any]) -> User:
    user = await db.scalar(select(User).where(User.email == gh["email"]))
    if user:
        if not user.is_active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Аккаунт заблокирован")
        return user

    user = User(
        email=gh["email"],
        name=gh["name"][:100],
        password_hash=None,  # OAuth-аккаунт
        role=UserRole.STUDENT,
        is_email_verified=True,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def login_or_register_via_github(db: AsyncSession, code: str) -> tuple[User, str, str]:
    token = await exchange_code_for_token(code)
    gh_user = await fetch_github_user(token)
    user = await get_or_create_github_user(db, gh_user)
    access, refresh = await issue_tokens(db, user)
    return user, access, refresh
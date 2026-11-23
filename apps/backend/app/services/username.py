"""Генерация публичного username для ссылки /u/{username}."""
from __future__ import annotations

import re
import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 32

# Разрешены только символы, безопасные в URL и в lower-case пути Next.js.
_INVALID_CHARS = re.compile(r"[^a-z0-9_-]+")


def normalize_username(source: str) -> str:
    """Приводит произвольную строку к допустимому username."""
    base = _INVALID_CHARS.sub("-", source.strip().lower()).strip("-_")
    base = base[:USERNAME_MAX_LENGTH]
    if len(base) < USERNAME_MIN_LENGTH:
        base = f"user-{secrets.token_hex(3)}"
    return base


async def generate_username(db: AsyncSession, source: str) -> str:
    """Возвращает свободный username на основе email/логина."""
    base = normalize_username(source)
    candidate = base
    suffix_index = 1
    while await db.scalar(select(User.id).where(User.username == candidate)):
        suffix_index += 1
        suffix = f"-{suffix_index}"
        candidate = f"{base[: USERNAME_MAX_LENGTH - len(suffix)]}{suffix}"
    return candidate


def username_from_email(email: str) -> str:
    return email.split("@", 1)[0]


__all__ = [
    "generate_username",
    "normalize_username",
    "username_from_email",
]

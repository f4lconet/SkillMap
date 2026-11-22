"""Загрузка контента: python -m app.scripts.seed [--dev-users]

Источник: data/skillmap_content.json (контент аналитика, неделя 4:
135 навыков, 213 зависимостей, 341 ресурс).
"""
from __future__ import annotations

import argparse
import asyncio

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import SessionLocal, engine
from app.core.security import hash_password
from app.models import User, UserRole
from app.services.content import content_stats, load_content, load_content_data

DEV_USERS = [
    ("student@example.com", "Тестовый студент", "Student123", UserRole.STUDENT),
    ("editor@example.com", "Тестовый редактор", "Editor123", UserRole.EDITOR),
]


async def seed_all() -> None:
    data = load_content_data()
    async with SessionLocal() as db:
        await load_content(db, data)
        await db.commit()

    stats = content_stats(data)
    print(
        f"OK: skills={stats['skills']}, deps={stats['dependencies']}, "
        f"resources={stats['resources']}, professions={stats['professions']}"
    )


async def seed_dev_users() -> None:
    if not get_settings().is_development:
        raise SystemExit("Тестовые пользователи только при ENVIRONMENT=development")
    async with SessionLocal() as db:
        for email, name, password, role in DEV_USERS:
            exists = await db.scalar(select(User.id).where(User.email == email))
            if exists:
                continue
            db.add(
                User(
                    email=email,
                    name=name,
                    password_hash=hash_password(password),
                    role=role,
                    is_email_verified=True,
                )
            )
        await db.commit()
    print("Тестовые пользователи: student@example.com / Student123")


async def main(dev_users: bool) -> None:
    await seed_all()
    if dev_users:
        await seed_dev_users()
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dev-users", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.dev_users))

"""Загрузка данных: python -m app.scripts.seed [--dev-users]

Идемпотентный upsert профессий по slug из data/professions.json.
"""
import argparse
import asyncio
import json
from pathlib import Path

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import SessionLocal, engine
from app.core.security import hash_password
from app.models import Level, Profession, ProfessionStatus, User, UserRole

DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "professions.json"

DEV_USERS = [
    ("student@example.com", "Тестовый студент", "Student123", UserRole.STUDENT),
    ("editor@example.com", "Тестовый редактор", "Editor123", UserRole.EDITOR),
]


async def seed_professions() -> None:
    if not DATA_FILE.exists():
        raise SystemExit(f"Нет файла данных: {DATA_FILE}")

    items = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    async with SessionLocal() as db:
        for item in items:
            profession = await db.scalar(
                select(Profession).where(Profession.slug == item["slug"])
            )
            if profession is None:
                profession = Profession(slug=item["slug"])
                db.add(profession)

            profession.title = item["title"]
            profession.direction = item["direction"]
            profession.description = item.get("description", "")
            profession.short_description = item.get("short_description", "")
            profession.tasks = item.get("tasks") or []
            profession.suits_if = item.get("suits_if") or []
            profession.start_hint = item.get("start_hint", "")
            profession.is_priority = bool(item.get("is_priority", False))
            profession.skills_count = int(item.get("skills_count", 0))
            profession.estimated_weeks = int(item.get("estimated_weeks", 0))
            entry = item.get("entry_level")
            profession.entry_level = Level(entry) if entry else None
            profession.status = ProfessionStatus(item.get("status", "published"))
        await db.commit()
    print(f"Профессий загружено/обновлено: {len(items)}")


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
    print(
        "Тестовые пользователи: "
        "student@example.com / Student123, editor@example.com / Editor123"
    )


async def main(dev_users: bool) -> None:
    await seed_professions()
    if dev_users:
        await seed_dev_users()
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dev-users", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.dev_users))
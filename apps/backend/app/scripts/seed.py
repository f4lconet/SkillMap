"""Загрузка контента: python -m app.scripts.seed [--dev-users]

Источник: data/skillmap_content.json (контент аналитика, неделя 2).
"""
from __future__ import annotations

import argparse
import asyncio
import json
import uuid
from pathlib import Path

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import SessionLocal, engine
from app.core.security import hash_password
from app.models import (
    DependencyType,
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
from app.models.base import utcnow

DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "skillmap_content.json"

DEV_USERS = [
    ("student@example.com", "Тестовый студент", "Student123", UserRole.STUDENT),
    ("editor@example.com", "Тестовый редактор", "Editor123", UserRole.EDITOR),
]


async def seed_all() -> None:
    if not DATA_FILE.exists():
        raise SystemExit(f"Нет файла: {DATA_FILE}")

    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    async with SessionLocal() as db:
        # 1. Directions
        for d in data.get("directions", []):
            row = await db.get(Direction, d["id"])
            if row is None:
                row = Direction(id=d["id"])
                db.add(row)
            row.title = d["title"]
            row.description = d.get("description", "")
        await db.flush()

        # 2. Skills (slug = content id)
        skill_by_slug: dict[str, Skill] = {}
        for s in data.get("skills", []):
            skill = await db.scalar(select(Skill).where(Skill.slug == s["id"]))
            if skill is None:
                skill = Skill(slug=s["id"])
                db.add(skill)
            skill.title = s["title"]
            skill.description = s.get("description", "")
            skill.category = s.get("category", "")
            skill.difficulty = int(s.get("difficulty", 1))
            skill.layer = int(s.get("layer", 0))
            skill.estimated_hours = s.get("hours")
            skill_by_slug[s["id"]] = skill
        await db.flush()

        # 3. Professions
        dir_titles = {d["id"]: d["title"] for d in data.get("directions", [])}
        for p in data.get("professions", []):
            profession = await db.scalar(
                select(Profession).where(Profession.slug == p["slug"])
            )
            if profession is None:
                profession = Profession(slug=p["slug"])
                db.add(profession)
            profession.title = p["title"]
            profession.direction_id = p.get("direction")
            profession.direction = dir_titles.get(p.get("direction", ""), p.get("direction", ""))
            profession.description = p.get("description", "")
            profession.short_description = p.get("short_description", "")
            profession.tasks = p.get("tasks") or []
            profession.suits_if = p.get("suits_if") or []
            profession.start_hint = p.get("start_hint", "")
            profession.is_priority = bool(p.get("is_priority", False))
            profession.skills_count = int(p.get("skills_count", 0))
            profession.skills_ready = bool(p.get("skills_ready", False))
            profession.status = ProfessionStatus.PUBLISHED
            profession.entry_level = Level.BEGINNER
        await db.flush()

        # 4. Profession ↔ Skill (по professions[].skills в контенте нет —
        #    берём из skills[].professions)
        # Сначала соберём skill_ids по профессии
        prof_skills: dict[str, list[str]] = {}
        for s in data.get("skills", []):
            for prof_slug in s.get("professions", []):
                prof_skills.setdefault(prof_slug, []).append(s["id"])

        for prof_slug, skill_slugs in prof_skills.items():
            profession = await db.scalar(
                select(Profession).where(Profession.slug == prof_slug)
            )
            if profession is None:
                continue
            for pos, s_slug in enumerate(skill_slugs):
                skill = skill_by_slug.get(s_slug)
                if skill is None:
                    continue
                link = await db.scalar(
                    select(ProfessionSkill).where(
                        ProfessionSkill.profession_id == profession.id,
                        ProfessionSkill.skill_id == skill.id,
                    )
                )
                if link is None:
                    link = ProfessionSkill(
                        profession_id=profession.id, skill_id=skill.id
                    )
                    db.add(link)
                link.position = pos
                link.is_core = True
            profession.skills_count = len(skill_slugs)

        # 5. Dependencies
        for dep in data.get("dependencies", []):
            skill = skill_by_slug.get(dep["skill_id"])
            prereq = skill_by_slug.get(dep["prerequisite_id"])
            if skill is None or prereq is None:
                continue
            dep_type = (
                DependencyType.REQUIRED
                if dep.get("type") == "required"
                else DependencyType.RECOMMENDED
            )
            existing = await db.scalar(
                select(SkillDependency).where(
                    SkillDependency.skill_id == skill.id,
                    SkillDependency.prerequisite_id == prereq.id,
                    SkillDependency.dep_type == dep_type,
                )
            )
            if existing is None:
                db.add(
                    SkillDependency(
                        skill_id=skill.id,
                        prerequisite_id=prereq.id,
                        dep_type=dep_type,
                    )
                )

        await db.commit()

    meta = data.get("meta", {})
    print(
        f"OK: skills={meta.get('skills_total', '?')}, "
        f"deps={meta.get('dependencies_total', '?')}, "
        f"professions={len(data.get('professions', []))}"
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

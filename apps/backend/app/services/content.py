"""Загрузка контента аналитика в БД (навыки, профессии, связи, ресурсы)."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    DependencyType,
    Direction,
    Level,
    Profession,
    ProfessionSkill,
    ProfessionStatus,
    Resource,
    Skill,
    SkillDependency,
)
from app.models.base import utcnow
from app.services.content_validation import ContentValidationError, validate_content

ContentData = dict[str, Any]


def content_path() -> Path:
    return Path(__file__).resolve().parents[2] / "data" / "skillmap_content.json"


def load_content_data(path: Path | None = None) -> ContentData:
    target = path or content_path()
    if not target.exists():
        raise SystemExit(f"Нет файла: {target}")
    return json.loads(target.read_text(encoding="utf-8"))


async def load_content(
    db: AsyncSession, data: ContentData, *, strict: bool = True
) -> dict[str, int]:
    """Идемпотентно загружает контент: повторный вызов не плодит дубли.

    При ``strict=True`` контент сначала проходит структурные проверки
    (см. :mod:`app.services.content_validation`): битые ссылки и циклы в графе
    падают до записи в БД, а не после.
    """
    if strict:
        issues = validate_content(data)
        errors = [i for i in issues if i.level == "error"]
        if errors:
            raise ContentValidationError(issues)

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
        is_new = profession is None
        if profession is None:
            profession = Profession(slug=p["slug"])
            db.add(profession)
        profession.title = p["title"]
        profession.direction_id = p.get("direction")
        profession.direction = dir_titles.get(
            p.get("direction", ""), p.get("direction", "")
        )
        profession.description = p.get("description", "")
        profession.short_description = p.get("short_description", "")
        profession.tasks = p.get("tasks") or []
        profession.suits_if = p.get("suits_if") or []
        profession.start_hint = p.get("start_hint", "")
        profession.is_priority = bool(p.get("is_priority", False))
        profession.skills_count = int(p.get("skills_count", 0))
        profession.skills_ready = bool(p.get("skills_ready", False))
        if is_new:
            # Новую профессию из контента публикуем сразу; правки статуса,
            # сделанные в админке, повторный seed не перетирает.
            profession.status = ProfessionStatus.PUBLISHED
            profession.entry_level = Level.BEGINNER
    await db.flush()

    # 4. Profession ↔ Skill: состав берём из skills[].professions
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
                link.is_core = True
            link.position = pos
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

    # 6. Resources: title — естественный ключ внутри навыка
    #    (аналитик иногда ссылается на один источник двумя записями)
    positions: dict[str, int] = {}
    for res in data.get("resources", []):
        skill = skill_by_slug.get(res["skill_id"])
        if skill is None:
            continue
        url = (res.get("url") or "").strip()
        title = (res.get("title") or "").strip() or url
        row = await db.scalar(
            select(Resource).where(
                Resource.skill_id == skill.id, Resource.title == title
            )
        )
        if row is None:
            row = Resource(skill_id=skill.id, title=title)
            db.add(row)
            # Контент аналитика сразу публикуется: черновики — удел правок
            # в админке, и повторный seed их не трогает.
            row.status = "published"
        row.url = url
        row.resource_type = res.get("type") or "course"
        row.provider = (res.get("provider") or "")[:100]
        row.is_free = bool(res.get("is_free", True))
        row.lang = (res.get("lang") or "ru")[:8]
        row.estimated_hours = res.get("hours")
        row.position = positions.get(res["skill_id"], 0)
        positions[res["skill_id"]] = row.position + 1
        row.published_at = row.published_at or utcnow()

    await db.flush()
    return {
        "skills": len(skill_by_slug),
        "professions": len(prof_skills),
        "resources": len(data.get("resources", [])),
    }


def content_stats(data: ContentData) -> dict[str, int]:
    meta = data.get("meta", {})
    return {
        "skills": meta.get("skills_total", len(data.get("skills", []))),
        "dependencies": meta.get(
            "dependencies_total", len(data.get("dependencies", []))
        ),
        "resources": meta.get("resources_total", len(data.get("resources", []))),
        "professions": len(data.get("professions", [])),
    }


__all__ = [
    "ContentData",
    "content_path",
    "content_stats",
    "load_content",
    "load_content_data",
]

"""Админка: CRUD профессий, навыков, связей и ресурсов — неделя 4."""
from __future__ import annotations

import uuid
from collections.abc import Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    DependencyType,
    Direction,
    Profession,
    ProfessionSkill,
    Resource,
    Skill,
    SkillDependency,
)
from app.schemas.admin import (
    DependencyCreate,
    DependencyRead,
    DependencyUpdate,
    ProfessionAdminCreate,
    ProfessionAdminUpdate,
    ProfessionSkillLinkIn,
    ResourceAdminCreate,
    ResourceAdminUpdate,
    SkillAdminCreate,
    SkillAdminUpdate,
)
from app.services.graph import ensure_edge_is_safe

NOT_FOUND_SKILL = "Навык не найден"
NOT_FOUND_PROFESSION = "Профессия не найдена"
NOT_FOUND_RESOURCE = "Ресурс не найден"
NOT_FOUND_DEPENDENCY = "Связь не найдена"


def _conflict(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, detail)


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


# --------------------------------------------------------------------------
# Профессии
# --------------------------------------------------------------------------


async def get_profession(db: AsyncSession, profession_id: uuid.UUID) -> Profession:
    """Профессия без фильтра по статусу — админка видит и черновики."""
    profession = await db.get(Profession, profession_id)
    if profession is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND_PROFESSION)
    return profession


async def _ensure_profession_slug_free(
    db: AsyncSession, slug: str, exclude_id: uuid.UUID | None = None
) -> None:
    existing = await db.scalar(select(Profession.id).where(Profession.slug == slug))
    if existing is not None and existing != exclude_id:
        raise _conflict("Профессия с таким slug уже существует")


async def _ensure_direction_exists(db: AsyncSession, direction_id: str | None) -> None:
    if direction_id is None:
        return
    if await db.get(Direction, direction_id) is None:
        raise HTTPException(
            422,
            f"Направление «{direction_id}» не найдено",
        )


async def list_professions(
    db: AsyncSession,
    *,
    q: str | None,
    status_filter: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Profession], int]:
    stmt = select(Profession)
    if q:
        pattern = f"%{_escape_like(q.strip())}%"
        stmt = stmt.where(
            or_(
                Profession.title.ilike(pattern, escape="\\"),
                Profession.slug.ilike(pattern, escape="\\"),
            )
        )
    if status_filter:
        stmt = stmt.where(Profession.status == status_filter)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = await db.scalars(
        stmt.order_by(Profession.is_priority.desc(), Profession.title)
        .limit(limit)
        .offset(offset)
    )
    return list(rows), total or 0


async def create_profession(
    db: AsyncSession, data: ProfessionAdminCreate
) -> Profession:
    await _ensure_profession_slug_free(db, data.slug)
    await _ensure_direction_exists(db, data.direction_id)
    profession = Profession(**data.model_dump())
    db.add(profession)
    await db.commit()
    await db.refresh(profession)
    return profession


async def update_profession(
    db: AsyncSession, profession_id: uuid.UUID, data: ProfessionAdminUpdate
) -> Profession:
    profession = await get_profession(db, profession_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    if "slug" in changes:
        await _ensure_profession_slug_free(db, changes["slug"], profession_id)
    if "direction_id" in changes:
        await _ensure_direction_exists(db, changes["direction_id"])
    for field, value in changes.items():
        setattr(profession, field, value)
    await db.commit()
    await db.refresh(profession)
    return profession


async def delete_profession(db: AsyncSession, profession_id: uuid.UUID) -> None:
    profession = await get_profession(db, profession_id)
    await db.delete(profession)
    await db.commit()


async def list_profession_skills(
    db: AsyncSession, profession_id: uuid.UUID
) -> list[ProfessionSkill]:
    await get_profession(db, profession_id)
    rows = await db.scalars(
        select(ProfessionSkill)
        .where(ProfessionSkill.profession_id == profession_id)
        .options(selectinload(ProfessionSkill.skill))
        .order_by(ProfessionSkill.position)
    )
    return list(rows)


async def replace_profession_skills(
    db: AsyncSession,
    profession_id: uuid.UUID,
    links: Sequence[ProfessionSkillLinkIn],
) -> list[ProfessionSkill]:
    """Полная замена состава профессии: порядок в списке = позиция на карте."""
    profession = await get_profession(db, profession_id)
    skill_ids = [link.skill_id for link in links]
    if len(skill_ids) != len(set(skill_ids)):
        raise HTTPException(
            422,
            "Навык указан в профессии дважды",
        )
    if skill_ids:
        found = set(
            await db.scalars(select(Skill.id).where(Skill.id.in_(skill_ids)))
        )
        missing = [str(sid) for sid in skill_ids if sid not in found]
        if missing:
            raise HTTPException(
                422,
                f"Навыки не найдены: {', '.join(missing)}",
            )

    existing = {
        link.skill_id: link
        for link in await db.scalars(
            select(ProfessionSkill).where(
                ProfessionSkill.profession_id == profession_id
            )
        )
    }
    for index, link in enumerate(links):
        position = link.position if link.position is not None else index
        row = existing.pop(link.skill_id, None)
        if row is None:
            row = ProfessionSkill(
                profession_id=profession_id, skill_id=link.skill_id
            )
            db.add(row)
        row.position = position
        row.is_core = link.is_core
    for stale in existing.values():
        await db.delete(stale)

    profession.skills_count = len(links)
    await db.commit()
    return await list_profession_skills(db, profession_id)


# --------------------------------------------------------------------------
# Навыки
# --------------------------------------------------------------------------


async def get_skill(db: AsyncSession, skill_id: uuid.UUID) -> Skill:
    skill = await db.get(Skill, skill_id)
    if skill is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND_SKILL)
    return skill


async def _ensure_skill_slug_free(
    db: AsyncSession, slug: str, exclude_id: uuid.UUID | None = None
) -> None:
    existing = await db.scalar(select(Skill.id).where(Skill.slug == slug))
    if existing is not None and existing != exclude_id:
        raise _conflict("Навык с таким slug уже существует")


async def skill_professions(
    db: AsyncSession, skill_ids: Sequence[uuid.UUID]
) -> dict[uuid.UUID, list[str]]:
    if not skill_ids:
        return {}
    rows = await db.execute(
        select(ProfessionSkill.skill_id, Profession.slug)
        .join(Profession, Profession.id == ProfessionSkill.profession_id)
        .where(ProfessionSkill.skill_id.in_(skill_ids))
        .order_by(ProfessionSkill.position)
    )
    result: dict[uuid.UUID, list[str]] = {}
    for skill_id, slug in rows:
        result.setdefault(skill_id, []).append(slug)
    return result


async def list_skills(
    db: AsyncSession,
    *,
    q: str | None,
    category: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Skill], int]:
    stmt = select(Skill)
    if q:
        pattern = f"%{_escape_like(q.strip())}%"
        stmt = stmt.where(
            or_(
                Skill.title.ilike(pattern, escape="\\"),
                Skill.slug.ilike(pattern, escape="\\"),
            )
        )
    if category:
        stmt = stmt.where(Skill.category == category)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = await db.scalars(
        stmt.order_by(Skill.slug).limit(limit).offset(offset)
    )
    return list(rows), total or 0


async def create_skill(db: AsyncSession, data: SkillAdminCreate) -> Skill:
    await _ensure_skill_slug_free(db, data.slug)
    skill = Skill(**data.model_dump())
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return skill


async def update_skill(
    db: AsyncSession, skill_id: uuid.UUID, data: SkillAdminUpdate
) -> Skill:
    skill = await get_skill(db, skill_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    if "slug" in changes:
        await _ensure_skill_slug_free(db, changes["slug"], skill_id)
    for field, value in changes.items():
        setattr(skill, field, value)
    await db.commit()
    await db.refresh(skill)
    return skill


async def delete_skill(db: AsyncSession, skill_id: uuid.UUID) -> None:
    skill = await get_skill(db, skill_id)
    await db.delete(skill)
    await db.commit()


# --------------------------------------------------------------------------
# Связи (зависимости)
# --------------------------------------------------------------------------


async def to_dependency_read(
    db: AsyncSession, deps: Sequence[SkillDependency]
) -> list[DependencyRead]:
    skill_ids = {dep.skill_id for dep in deps} | {
        dep.prerequisite_id for dep in deps
    }
    if not skill_ids:
        return []
    rows = await db.execute(
        select(Skill.id, Skill.slug, Skill.title).where(Skill.id.in_(skill_ids))
    )
    by_id = {sid: (slug, title) for sid, slug, title in rows}
    result: list[DependencyRead] = []
    for dep in deps:
        skill_slug, skill_title = by_id.get(dep.skill_id, ("", ""))
        pre_slug, pre_title = by_id.get(dep.prerequisite_id, ("", ""))
        result.append(
            DependencyRead(
                id=dep.id,
                skill_id=dep.skill_id,
                skill_slug=skill_slug,
                skill_title=skill_title,
                prerequisite_id=dep.prerequisite_id,
                prerequisite_slug=pre_slug,
                prerequisite_title=pre_title,
                dep_type=dep.dep_type,
            )
        )
    return result


async def list_dependencies(
    db: AsyncSession,
    *,
    skill_id: uuid.UUID | None,
    limit: int,
    offset: int,
) -> tuple[list[DependencyRead], int]:
    stmt = select(SkillDependency)
    if skill_id:
        stmt = stmt.where(SkillDependency.skill_id == skill_id)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = list(
        await db.scalars(
            stmt.order_by(SkillDependency.created_at).limit(limit).offset(offset)
        )
    )
    return await to_dependency_read(db, rows), total or 0


async def _ensure_dependency_unique(
    db: AsyncSession,
    skill_id: uuid.UUID,
    prerequisite_id: uuid.UUID,
    dep_type: DependencyType,
    exclude_id: uuid.UUID | None = None,
) -> None:
    existing = await db.scalar(
        select(SkillDependency.id).where(
            SkillDependency.skill_id == skill_id,
            SkillDependency.prerequisite_id == prerequisite_id,
            SkillDependency.dep_type == dep_type,
        )
    )
    if existing is not None and existing != exclude_id:
        raise _conflict("Такая связь уже есть")


async def _ensure_skills_exist(
    db: AsyncSession, skill_ids: Sequence[uuid.UUID]
) -> None:
    for skill_id in skill_ids:
        if await db.get(Skill, skill_id) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND_SKILL)


async def create_dependency(
    db: AsyncSession, data: DependencyCreate
) -> DependencyRead:
    await _ensure_skills_exist(db, [data.skill_id, data.prerequisite_id])
    await ensure_edge_is_safe(db, data.skill_id, data.prerequisite_id)
    await _ensure_dependency_unique(
        db, data.skill_id, data.prerequisite_id, data.dep_type
    )
    dep = SkillDependency(
        skill_id=data.skill_id,
        prerequisite_id=data.prerequisite_id,
        dep_type=data.dep_type,
    )
    db.add(dep)
    await db.commit()
    await db.refresh(dep)
    return (await to_dependency_read(db, [dep]))[0]


async def get_dependency(
    db: AsyncSession, dependency_id: uuid.UUID
) -> SkillDependency:
    dep = await db.get(SkillDependency, dependency_id)
    if dep is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND_DEPENDENCY)
    return dep


async def update_dependency(
    db: AsyncSession, dependency_id: uuid.UUID, data: DependencyUpdate
) -> DependencyRead:
    dep = await get_dependency(db, dependency_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    skill_id = changes.get("skill_id", dep.skill_id)
    prerequisite_id = changes.get("prerequisite_id", dep.prerequisite_id)
    dep_type = changes.get("dep_type", dep.dep_type)

    await _ensure_skills_exist(db, [skill_id, prerequisite_id])
    if skill_id != dep.skill_id or prerequisite_id != dep.prerequisite_id:
        await ensure_edge_is_safe(
            db, skill_id, prerequisite_id, exclude_id=dependency_id
        )
    await _ensure_dependency_unique(
        db, skill_id, prerequisite_id, dep_type, exclude_id=dependency_id
    )

    dep.skill_id = skill_id
    dep.prerequisite_id = prerequisite_id
    dep.dep_type = dep_type
    await db.commit()
    await db.refresh(dep)
    return (await to_dependency_read(db, [dep]))[0]


async def delete_dependency(
    db: AsyncSession, dependency_id: uuid.UUID
) -> None:
    dep = await get_dependency(db, dependency_id)
    await db.delete(dep)
    await db.commit()


# --------------------------------------------------------------------------
# Ресурсы
# --------------------------------------------------------------------------


async def get_resource(db: AsyncSession, resource_id: uuid.UUID) -> Resource:
    resource = await db.get(Resource, resource_id)
    if resource is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND_RESOURCE)
    return resource


async def list_resources(
    db: AsyncSession,
    *,
    skill_id: uuid.UUID | None,
    limit: int,
    offset: int,
) -> tuple[list[Resource], int]:
    stmt = select(Resource)
    if skill_id:
        stmt = stmt.where(Resource.skill_id == skill_id)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = await db.scalars(
        stmt.order_by(Resource.skill_id, Resource.position)
        .limit(limit)
        .offset(offset)
    )
    return list(rows), total or 0


async def create_resource(
    db: AsyncSession, data: ResourceAdminCreate
) -> Resource:
    await _ensure_skills_exist(db, [data.skill_id])
    resource = Resource(**data.model_dump())
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return resource


async def update_resource(
    db: AsyncSession, resource_id: uuid.UUID, data: ResourceAdminUpdate
) -> Resource:
    resource = await get_resource(db, resource_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    if "skill_id" in changes:
        await _ensure_skills_exist(db, [changes["skill_id"]])
    for field, value in changes.items():
        setattr(resource, field, value)
    await db.commit()
    await db.refresh(resource)
    return resource


async def delete_resource(db: AsyncSession, resource_id: uuid.UUID) -> None:
    resource = await get_resource(db, resource_id)
    await db.delete(resource)
    await db.commit()

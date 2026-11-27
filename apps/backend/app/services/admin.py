"""Админка: CRUD профессий, навыков, связей и ресурсов — неделя 4."""
from __future__ import annotations

import asyncio
import csv
import io
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException, status
from sqlalchemy import and_, case, distinct, exists, func, not_, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from app.api.pagination import clamp_page
from app.models import (
    DependencyType,
    Direction,
    Profession,
    ProfessionSkill,
    ProfessionStatus,
    Resource,
    Skill,
    SkillDependency,
    User,
)
from app.models.base import utcnow
from app.schemas.admin import (
    AdminEditorRead,
    AdminEventRead,
    AdminOverviewRead,
    BrokenDependencyRead,
    DependencyCreate,
    DependencyRead,
    DependencyUpdate,
    GraphEdgeRead,
    GraphNodeRead,
    GraphPositionUpdate,
    GraphSkillCreate,
    GraphStats,
    OverviewChecklist,
    OverviewStats,
    ProfessionAdminCreate,
    ProfessionAdminRead,
    ProfessionAdminUpdate,
    ProfessionGraphRead,
    ProfessionSkillLinkIn,
    PublishRead,
    ResourceAdminCreate,
    ResourceAdminRead,
    ResourceAdminUpdate,
    ResourceStats,
    SkillAdminCreate,
    SkillAdminUpdate,
)
from app.services import admin_activity
from app.services.graph import (
    ensure_edge_is_safe,
    ensure_graph_has_no_cycles,
    find_graph_cycle,
)

NOT_FOUND_SKILL = "Навык не найден"
NOT_FOUND_PROFESSION = "Профессия не найдена"
NOT_FOUND_RESOURCE = "Ресурс не найден"
NOT_FOUND_DEPENDENCY = "Связь не найдена"


def _conflict(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, detail)


async def _commit(db: AsyncSession, on_conflict: str) -> None:
    """Коммит, который переводит гонку по уникальному ключу в 409, а не в 500.

    Проверки `_ensure_*_slug_free` работают по схеме «прочитал — записал»:
    два редактора могут пройти проверку одновременно и столкнуться уже
    на вставке. Без этого перехвата пользователь видел 500.
    """
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _conflict(on_conflict) from exc


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


async def _flush(db: AsyncSession, on_conflict: str) -> None:
    """Flush перед записью в журнал: переводим гонку по slug в 409, а не в 500."""
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise _conflict(on_conflict) from exc


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
    entry_level: str | None = None,
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
    if entry_level:
        stmt = stmt.where(Profession.entry_level == entry_level)
    page = clamp_page(limit, offset)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = await db.scalars(
        stmt.order_by(Profession.is_priority.desc(), Profession.title)
        .limit(page.limit)
        .offset(page.offset)
    )
    return list(rows), total or 0


async def create_profession(
    db: AsyncSession, data: ProfessionAdminCreate, *, actor: User | None = None
) -> Profession:
    await _ensure_profession_slug_free(db, data.slug)
    await _ensure_direction_exists(db, data.direction_id)
    profession = Profession(**data.model_dump())
    db.add(profession)
    await _flush(db, "Профессия с таким slug уже существует")
    await admin_activity.record(
        db,
        actor=actor,
        entity_type=admin_activity.ENTITY_PROFESSION,
        action=admin_activity.ACTION_CREATED,
        title=f"Создана профессия «{profession.title}»",
        entity_id=profession.id,
        profession_id=profession.id,
    )
    await _commit(db, "Профессия с таким slug уже существует")
    await db.refresh(profession)
    return profession


async def update_profession(
    db: AsyncSession,
    profession_id: uuid.UUID,
    data: ProfessionAdminUpdate,
    *,
    actor: User | None = None,
) -> Profession:
    profession = await get_profession(db, profession_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    if "slug" in changes:
        await _ensure_profession_slug_free(db, changes["slug"], profession_id)
    if "direction_id" in changes:
        await _ensure_direction_exists(db, changes["direction_id"])
    for field, value in changes.items():
        setattr(profession, field, value)
    if changes:
        await admin_activity.record(
            db,
            actor=actor,
            entity_type=admin_activity.ENTITY_PROFESSION,
            action=admin_activity.ACTION_UPDATED,
            title=f"Обновлена профессия «{profession.title}»",
            detail=admin_activity.changed_labels(
                changes, admin_activity.PROFESSION_FIELD_LABELS
            ),
            entity_id=profession.id,
            profession_id=profession.id,
        )
    await _commit(db, "Профессия с таким slug уже существует")
    await db.refresh(profession)
    return profession


async def delete_profession(
    db: AsyncSession, profession_id: uuid.UUID, *, actor: User | None = None
) -> None:
    profession = await get_profession(db, profession_id)
    title = profession.title
    await db.delete(profession)
    # Событие без ссылки на удаляемую профессию: строка журнала должна выжить
    await admin_activity.record(
        db,
        actor=actor,
        entity_type=admin_activity.ENTITY_PROFESSION,
        action=admin_activity.ACTION_DELETED,
        title=f"Удалена профессия «{title}»",
        entity_id=profession_id,
    )
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
    *,
    actor: User | None = None,
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
    await admin_activity.record(
        db,
        actor=actor,
        entity_type=admin_activity.ENTITY_PROFESSION,
        action=admin_activity.ACTION_UPDATED,
        title="Обновлён состав графа",
        detail=f"{profession.title}: навыков — {len(links)}",
        entity_id=profession.id,
        profession_id=profession.id,
    )
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
    page = clamp_page(limit, offset)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = await db.scalars(
        stmt.order_by(Skill.slug).limit(page.limit).offset(page.offset)
    )
    return list(rows), total or 0


async def create_skill(
    db: AsyncSession,
    data: SkillAdminCreate,
    *,
    actor: User | None = None,
    log: bool = True,
) -> Skill:
    await _ensure_skill_slug_free(db, data.slug)
    skill = Skill(**data.model_dump())
    db.add(skill)
    await _flush(db, "Навык с таким slug уже существует")
    if log:
        await admin_activity.record(
            db,
            actor=actor,
            entity_type=admin_activity.ENTITY_SKILL,
            action=admin_activity.ACTION_CREATED,
            title=f"Создан навык «{skill.title}»",
            entity_id=skill.id,
            skill_id=skill.id,
        )
    await _commit(db, "Навык с таким slug уже существует")
    await db.refresh(skill)
    return skill


async def update_skill(
    db: AsyncSession,
    skill_id: uuid.UUID,
    data: SkillAdminUpdate,
    *,
    actor: User | None = None,
) -> Skill:
    skill = await get_skill(db, skill_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    # Координаты можно сбросить явным null — тогда работает авто-раскладка
    for field in ("pos_x", "pos_y"):
        if field in data.model_fields_set:
            changes[field] = getattr(data, field)
    if "slug" in changes:
        await _ensure_skill_slug_free(db, changes["slug"], skill_id)
    previous_hours = skill.estimated_hours
    for field, value in changes.items():
        setattr(skill, field, value)
    if changes:
        detail = admin_activity.changed_labels(
            changes, admin_activity.SKILL_FIELD_LABELS
        )
        if "estimated_hours" in changes:
            detail = (
                f"время изучения {previous_hours or 0} → "
                f"{skill.estimated_hours or 0} ч"
            )
        await admin_activity.record(
            db,
            actor=actor,
            entity_type=admin_activity.ENTITY_SKILL,
            action=admin_activity.ACTION_UPDATED,
            title=f"Обновлён навык «{skill.title}»",
            detail=detail,
            entity_id=skill.id,
            skill_id=skill.id,
        )
    await _commit(db, "Навык с таким slug уже существует")
    await db.refresh(skill)
    return skill


async def delete_skill(
    db: AsyncSession, skill_id: uuid.UUID, *, actor: User | None = None
) -> None:
    skill = await get_skill(db, skill_id)
    title = skill.title
    profession_ids = await admin_activity.professions_of_skill(db, skill_id)
    await db.delete(skill)
    await admin_activity.record(
        db,
        actor=actor,
        entity_type=admin_activity.ENTITY_SKILL,
        action=admin_activity.ACTION_DELETED,
        title=f"Удалён навык «{title}»",
        entity_id=skill_id,
        profession_id=profession_ids[0] if profession_ids else None,
    )
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
    related_to: uuid.UUID | None = None,
    limit: int,
    offset: int,
) -> tuple[list[DependencyRead], int]:
    stmt = select(SkillDependency)
    if skill_id:
        stmt = stmt.where(SkillDependency.skill_id == skill_id)
    if related_to:
        stmt = stmt.where(
            or_(
                SkillDependency.skill_id == related_to,
                SkillDependency.prerequisite_id == related_to,
            )
        )
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    page = clamp_page(limit, offset)
    rows = list(
        await db.scalars(
            stmt.order_by(SkillDependency.created_at)
            .limit(page.limit)
            .offset(page.offset)
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


def _dependency_detail(read: DependencyRead) -> str:
    arrow = f"{read.prerequisite_title} → {read.skill_title}"
    label = admin_activity.DEPENDENCY_TYPE_LABELS.get(str(read.dep_type), "")
    return f"{arrow} · {label}" if label else arrow


async def create_dependency(
    db: AsyncSession, data: DependencyCreate, *, actor: User | None = None
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
    await _flush(db, "Такая связь уже есть")
    read = (await to_dependency_read(db, [dep]))[0]
    await admin_activity.record(
        db,
        actor=actor,
        entity_type=admin_activity.ENTITY_DEPENDENCY,
        action=admin_activity.ACTION_CREATED,
        title="Добавлена связь в графе",
        detail=_dependency_detail(read),
        entity_id=dep.id,
        skill_id=dep.skill_id,
    )
    await _commit(db, "Такая связь уже есть")
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
    db: AsyncSession,
    dependency_id: uuid.UUID,
    data: DependencyUpdate,
    *,
    actor: User | None = None,
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
    await _flush(db, "Такая связь уже есть")
    read = (await to_dependency_read(db, [dep]))[0]
    await admin_activity.record(
        db,
        actor=actor,
        entity_type=admin_activity.ENTITY_DEPENDENCY,
        action=admin_activity.ACTION_UPDATED,
        title="Изменена связь в графе",
        detail=_dependency_detail(read),
        entity_id=dep.id,
        skill_id=dep.skill_id,
    )
    await _commit(db, "Такая связь уже есть")
    await db.refresh(dep)
    return (await to_dependency_read(db, [dep]))[0]


async def delete_dependency(
    db: AsyncSession, dependency_id: uuid.UUID, *, actor: User | None = None
) -> None:
    dep = await get_dependency(db, dependency_id)
    read = (await to_dependency_read(db, [dep]))[0]
    skill_id = dep.skill_id
    await db.delete(dep)
    await admin_activity.record(
        db,
        actor=actor,
        entity_type=admin_activity.ENTITY_DEPENDENCY,
        action=admin_activity.ACTION_DELETED,
        title="Удалена связь в графе",
        detail=_dependency_detail(read),
        entity_id=dependency_id,
        skill_id=skill_id,
    )
    await db.commit()


# --------------------------------------------------------------------------
# Ресурсы
# --------------------------------------------------------------------------

RESOURCE_SORT_COLUMNS = {
    "skill": Skill.title,
    "title": Resource.title,
    "status": Resource.status,
    "updated": Resource.updated_at,
}

# Таймаут проверки ссылки: админка ждёт ответа не дольше 5 секунд
LINK_CHECK_TIMEOUT = 5.0


async def get_resource(db: AsyncSession, resource_id: uuid.UUID) -> Resource:
    resource = await db.get(Resource, resource_id)
    if resource is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND_RESOURCE)
    return resource


def to_resource_read(
    resource: Resource, skill_slug: str = "", skill_title: str = ""
) -> ResourceAdminRead:
    return ResourceAdminRead(
        id=resource.id,
        skill_id=resource.skill_id,
        skill_slug=skill_slug,
        skill_title=skill_title,
        title=resource.title,
        url=resource.url or "",
        resource_type=resource.resource_type or "course",
        is_free=bool(resource.is_free),
        provider=resource.provider or "",
        lang=resource.lang or "ru",
        description=resource.description or "",
        estimated_hours=resource.estimated_hours,
        position=resource.position or 0,
        status=resource.status or "draft",
        link_status=resource.link_status or "unknown",
        last_checked_at=resource.last_checked_at,
        published_at=resource.published_at,
    )


async def to_resource_reads(
    db: AsyncSession, resources: Sequence[Resource]
) -> list[ResourceAdminRead]:
    """Читает ресурсы вместе с названиями навыков (для ответов админки)."""
    if not resources:
        return []
    rows = await db.execute(
        select(Skill.id, Skill.slug, Skill.title).where(
            Skill.id.in_({r.skill_id for r in resources})
        )
    )
    by_id = {skill_id: (slug, title) for skill_id, slug, title in rows}
    result = []
    for resource in resources:
        slug, title = by_id.get(resource.skill_id, ("", ""))
        result.append(to_resource_read(resource, slug, title))
    return result


async def get_resource_read(
    db: AsyncSession, resource_id: uuid.UUID
) -> ResourceAdminRead:
    row = (
        await db.execute(
            select(Resource, Skill.slug, Skill.title)
            .join(Skill, Skill.id == Resource.skill_id)
            .where(Resource.id == resource_id)
        )
    ).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND_RESOURCE)
    return to_resource_read(row[0], row[1], row[2])


def _resource_conditions(
    *,
    q: str | None = None,
    skill_id: uuid.UUID | None = None,
    profession_id: uuid.UUID | None = None,
    resource_type: str | None = None,
    lang: str | None = None,
    is_free: bool | None = None,
    status_filter: str | None = None,
    link_status: str | None = None,
) -> list:
    conditions = []
    if q and q.strip():
        pattern = f"%{_escape_like(q.strip())}%"
        conditions.append(
            or_(
                Resource.title.ilike(pattern, escape="\\"),
                Resource.url.ilike(pattern, escape="\\"),
            )
        )
    if skill_id:
        conditions.append(Resource.skill_id == skill_id)
    if profession_id:
        conditions.append(
            Resource.skill_id.in_(
                select(ProfessionSkill.skill_id).where(
                    ProfessionSkill.profession_id == profession_id
                )
            )
        )
    if resource_type:
        conditions.append(Resource.resource_type == resource_type)
    if lang:
        conditions.append(Resource.lang == lang)
    if is_free is not None:
        conditions.append(Resource.is_free == is_free)
    if status_filter:
        conditions.append(Resource.status == status_filter)
    if link_status:
        conditions.append(Resource.link_status == link_status)
    return conditions


async def list_resources(
    db: AsyncSession,
    *,
    q: str | None = None,
    skill_id: uuid.UUID | None = None,
    profession_id: uuid.UUID | None = None,
    resource_type: str | None = None,
    lang: str | None = None,
    is_free: bool | None = None,
    status_filter: str | None = None,
    link_status: str | None = None,
    sort_by: str = "skill",
    sort_dir: str = "asc",
    limit: int = 200,
    offset: int = 0,
) -> tuple[list[ResourceAdminRead], int]:
    if profession_id:
        await get_profession(db, profession_id)
    conditions = _resource_conditions(
        q=q,
        skill_id=skill_id,
        profession_id=profession_id,
        resource_type=resource_type,
        lang=lang,
        is_free=is_free,
        status_filter=status_filter,
        link_status=link_status,
    )
    total = await db.scalar(select(func.count(Resource.id)).where(*conditions))
    column = RESOURCE_SORT_COLUMNS.get(sort_by, Skill.title)
    order = column.desc() if sort_dir == "desc" else column.asc()
    page = clamp_page(limit, offset)
    rows = await db.execute(
        select(Resource, Skill.slug, Skill.title)
        .join(Skill, Skill.id == Resource.skill_id)
        .where(*conditions)
        .order_by(order, Resource.skill_id, Resource.position)
        .limit(page.limit)
        .offset(page.offset)
    )
    return [to_resource_read(r, slug, title) for r, slug, title in rows], total or 0


async def get_resource_stats(
    db: AsyncSession, *, profession_id: uuid.UUID | None = None
) -> ResourceStats:
    """Сводка для карточек страницы «Ресурсы» (опционально в рамках профессии)."""
    if profession_id:
        await get_profession(db, profession_id)
    conditions = _resource_conditions(profession_id=profession_id)
    total, published, draft, needs_review, broken, unchecked, covered = (
        await db.execute(
            select(
                func.count(Resource.id),
                func.coalesce(
                    func.sum(case((Resource.status == "published", 1), else_=0)), 0
                ),
                func.coalesce(
                    func.sum(case((Resource.status == "draft", 1), else_=0)), 0
                ),
                func.coalesce(
                    func.sum(case((Resource.status == "needs_review", 1), else_=0)), 0
                ),
                func.coalesce(
                    func.sum(case((Resource.link_status == "broken", 1), else_=0)), 0
                ),
                func.coalesce(
                    func.sum(case((Resource.link_status == "unknown", 1), else_=0)), 0
                ),
                func.count(distinct(Resource.skill_id)),
            ).where(*conditions)
        )
    ).one()

    if profession_id:
        skills_total = await db.scalar(
            select(func.count())
            .select_from(ProfessionSkill)
            .where(ProfessionSkill.profession_id == profession_id)
        )
    else:
        skills_total = await db.scalar(select(func.count()).select_from(Skill))

    return ResourceStats(
        total=total or 0,
        published=published or 0,
        draft=draft or 0,
        needs_review=needs_review or 0,
        broken_links=broken or 0,
        unchecked_links=unchecked or 0,
        skills_total=skills_total or 0,
        skills_with_resources=covered or 0,
        profession_id=profession_id,
    )


async def _touch_skill(db: AsyncSession, skill_id: uuid.UUID) -> None:
    """Отметка изменения навыка: публикация профессии увидит правку ресурса."""
    skill = await db.get(Skill, skill_id)
    if skill is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND_SKILL)
    skill.updated_at = utcnow()


async def _skill_title(db: AsyncSession, skill_id: uuid.UUID) -> str:
    return await db.scalar(select(Skill.title).where(Skill.id == skill_id)) or ""


def _resource_detail(resource: Resource, skill_title: str) -> str:
    """Короткое описание ресурса для ленты изменений."""
    type_label = admin_activity.RESOURCE_TYPE_LABELS.get(
        str(resource.resource_type or ""), str(resource.resource_type or "")
    )
    parts = [part for part in (skill_title, type_label, resource.provider) if part]
    return " · ".join(parts)


async def create_resource(
    db: AsyncSession, data: ResourceAdminCreate, *, actor: User | None = None
) -> Resource:
    await _touch_skill(db, data.skill_id)
    payload = data.model_dump()
    if payload.get("status") == "published":
        payload["published_at"] = utcnow()
    resource = Resource(**payload)
    db.add(resource)
    await db.flush()
    await admin_activity.record(
        db,
        actor=actor,
        entity_type=admin_activity.ENTITY_RESOURCE,
        action=admin_activity.ACTION_CREATED,
        title=f"Добавлен ресурс «{resource.title}»",
        detail=_resource_detail(resource, await _skill_title(db, resource.skill_id)),
        entity_id=resource.id,
        skill_id=resource.skill_id,
    )
    await db.commit()
    await db.refresh(resource)
    return resource


async def update_resource(
    db: AsyncSession,
    resource_id: uuid.UUID,
    data: ResourceAdminUpdate,
    *,
    actor: User | None = None,
) -> Resource:
    resource = await get_resource(db, resource_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    # Часы можно сбросить явным null — ресурс без оценки времени
    if "estimated_hours" in data.model_fields_set:
        changes["estimated_hours"] = data.estimated_hours
    previous_skill_id = resource.skill_id
    if "skill_id" in changes:
        await _touch_skill(db, changes["skill_id"])
    status = changes.get("status")
    if status == "published" and resource.status != "published":
        changes["published_at"] = utcnow()
    elif status == "draft":
        changes["published_at"] = None
    for field, value in changes.items():
        setattr(resource, field, value)
    await _touch_skill(db, previous_skill_id)
    await _touch_skill(db, resource.skill_id)
    if changes:
        await admin_activity.record(
            db,
            actor=actor,
            entity_type=admin_activity.ENTITY_RESOURCE,
            action=admin_activity.ACTION_UPDATED,
            title=f"Обновлён ресурс «{resource.title}»",
            detail=admin_activity.changed_labels(
                changes, admin_activity.RESOURCE_FIELD_LABELS
            ),
            entity_id=resource.id,
            skill_id=resource.skill_id,
        )
    await db.commit()
    await db.refresh(resource)
    return resource


async def publish_resource(
    db: AsyncSession, resource_id: uuid.UUID, *, actor: User | None = None
) -> Resource:
    resource = await get_resource(db, resource_id)
    resource.status = "published"
    resource.published_at = utcnow()
    await _touch_skill(db, resource.skill_id)
    await admin_activity.record(
        db,
        actor=actor,
        entity_type=admin_activity.ENTITY_RESOURCE,
        action=admin_activity.ACTION_PUBLISHED,
        title="Ресурс опубликован",
        detail=_resource_detail(resource, await _skill_title(db, resource.skill_id)),
        entity_id=resource.id,
        skill_id=resource.skill_id,
    )
    await db.commit()
    await db.refresh(resource)
    return resource


async def delete_resource(
    db: AsyncSession, resource_id: uuid.UUID, *, actor: User | None = None
) -> None:
    resource = await get_resource(db, resource_id)
    skill_id = resource.skill_id
    title = resource.title
    await db.delete(resource)
    await _touch_skill(db, skill_id)
    await admin_activity.record(
        db,
        actor=actor,
        entity_type=admin_activity.ENTITY_RESOURCE,
        action=admin_activity.ACTION_DELETED,
        title=f"Удалён ресурс «{title}»",
        skill_id=skill_id,
    )
    await db.commit()


async def _probe_url(url: str) -> bool:
    """Проверяет доступность ссылки: HEAD, при 4xx/405 — GET с Range."""
    url = (url or "").strip()
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return False
    headers = {"User-Agent": "SkillMap/1.0 (+link-check)"}
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(LINK_CHECK_TIMEOUT),
            follow_redirects=True,
        ) as client:
            response = await client.head(url, headers=headers)
            if response.status_code >= 400:
                response = await client.get(
                    url, headers={**headers, "Range": "bytes=0-0"}
                )
    except httpx.HTTPError:
        return False
    return response.status_code < 400


def _apply_link_result(resource: Resource, ok: bool, checked_at: datetime) -> None:
    resource.link_status = "ok" if ok else "broken"
    resource.last_checked_at = checked_at
    if not ok:
        resource.status = "needs_review"
    elif resource.status == "needs_review":
        resource.status = "published" if resource.published_at else "draft"


async def check_resource_link(
    db: AsyncSession, resource_id: uuid.UUID, *, actor: User | None = None
) -> tuple[Resource, bool]:
    resource = await get_resource(db, resource_id)
    ok = await _probe_url(resource.url or "")
    _apply_link_result(resource, ok, utcnow())
    await _touch_skill(db, resource.skill_id)
    if not ok:
        await admin_activity.record(
            db,
            actor=actor,
            entity_type=admin_activity.ENTITY_RESOURCE,
            action=admin_activity.ACTION_CHECKED,
            title="Ссылка ресурса недоступна",
            detail=f"«{resource.title}» · {resource.url or 'без ссылки'}",
            entity_id=resource.id,
            skill_id=resource.skill_id,
        )
    await db.commit()
    await db.refresh(resource)
    return resource, ok


async def check_resource_links(
    db: AsyncSession,
    *,
    profession_id: uuid.UUID | None = None,
    skill_id: uuid.UUID | None = None,
    only_unchecked: bool = False,
    limit: int = 50,
    actor: User | None = None,
) -> tuple[list[Resource], int]:
    """Пакетная проверка ссылок. Возвращает ресурсы и число доступных."""
    if profession_id:
        await get_profession(db, profession_id)
    conditions = _resource_conditions(
        skill_id=skill_id, profession_id=profession_id
    )
    conditions.append(Resource.url != "")
    if only_unchecked:
        conditions.append(Resource.link_status == "unknown")
    rows = list(
        await db.scalars(
            select(Resource)
            .where(*conditions)
            .order_by(Resource.updated_at.desc())
            .limit(clamp_page(limit, 0).limit)
        )
    )
    if not rows:
        return [], 0

    results = await asyncio.gather(*(_probe_url(r.url or "") for r in rows))
    checked_at = utcnow()
    ok_count = 0
    for resource, ok in zip(rows, results, strict=True):
        _apply_link_result(resource, ok, checked_at)
        ok_count += int(ok)
    for skill in {r.skill_id for r in rows}:
        await _touch_skill(db, skill)
    await admin_activity.record(
        db,
        actor=actor,
        entity_type=admin_activity.ENTITY_RESOURCE,
        action=admin_activity.ACTION_CHECKED,
        title="Проверены ссылки ресурсов",
        detail=f"Проверено {len(rows)}, недоступно {len(rows) - ok_count}",
        profession_id=profession_id,
        skill_id=skill_id if profession_id is None else None,
    )
    await db.commit()
    for resource in rows:
        await db.refresh(resource)
    return rows, ok_count


# --------------------------------------------------------------------------
# Редактор графа профессии
# --------------------------------------------------------------------------


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _publish_state(skill: Skill, profession: Profession) -> str:
    """Статус узла относительно последней публикации профессии."""
    published_at = _aware(profession.published_at)
    if profession.status != ProfessionStatus.PUBLISHED or published_at is None:
        return "draft"
    created_at = _aware(skill.created_at)
    updated_at = _aware(skill.updated_at)
    if created_at is not None and created_at > published_at:
        return "new"
    if updated_at is not None and updated_at > published_at:
        return "modified"
    return "published"


async def _user_name(db: AsyncSession, user_id: uuid.UUID | None) -> str:
    if user_id is None:
        return ""
    name = await db.scalar(select(User.name).where(User.id == user_id))
    return name or ""


async def _profession_skill_ids(
    db: AsyncSession, profession_id: uuid.UUID
) -> list[uuid.UUID]:
    return list(
        await db.scalars(
            select(ProfessionSkill.skill_id)
            .where(ProfessionSkill.profession_id == profession_id)
            .order_by(ProfessionSkill.position)
        )
    )


async def get_profession_graph(
    db: AsyncSession, profession_id: uuid.UUID
) -> ProfessionGraphRead:
    """Сводный payload для редактора: узлы, связи, статистика, публикация."""
    profession = await get_profession(db, profession_id)
    links = list(
        await db.scalars(
            select(ProfessionSkill)
            .where(ProfessionSkill.profession_id == profession_id)
            .options(selectinload(ProfessionSkill.skill))
            .order_by(ProfessionSkill.position)
        )
    )
    skill_ids = [ps.skill_id for ps in links]

    edges: list[SkillDependency] = []
    res_counts: dict[uuid.UUID, int] = {}
    if skill_ids:
        edges = list(
            await db.scalars(
                select(SkillDependency)
                .where(
                    SkillDependency.skill_id.in_(skill_ids),
                    SkillDependency.prerequisite_id.in_(skill_ids),
                )
                .order_by(SkillDependency.created_at)
            )
        )
        rows = await db.execute(
            select(Resource.skill_id, func.count())
            .where(Resource.skill_id.in_(skill_ids))
            .group_by(Resource.skill_id)
        )
        res_counts = {skill_id: count for skill_id, count in rows}

    nodes: list[GraphNodeRead] = []
    modified = 0
    for ps in links:
        skill = ps.skill
        state = _publish_state(skill, profession)
        if state in {"modified", "new"}:
            modified += 1
        nodes.append(
            GraphNodeRead(
                id=skill.id,
                slug=skill.slug,
                title=skill.title,
                subtitle=skill.subtitle or "",
                description=skill.description or "",
                category=skill.category or "",
                difficulty=skill.difficulty or 1,
                layer=skill.layer or 0,
                estimated_hours=skill.estimated_hours,
                position=ps.position,
                is_core=ps.is_core,
                pos_x=skill.pos_x,
                pos_y=skill.pos_y,
                publish_state=state,
                resources_count=res_counts.get(skill.id, 0),
            )
        )

    required = sum(
        1 for edge in edges if edge.dep_type == DependencyType.REQUIRED
    )
    return ProfessionGraphRead(
        profession_id=profession.id,
        slug=profession.slug,
        title=profession.title,
        status=profession.status,
        skills_ready=profession.skills_ready,
        content_version=profession.content_version or 1,
        published_at=profession.published_at,
        published_by_name=await _user_name(db, profession.published_by_id),
        updated_at=profession.updated_at,
        has_unpublished_changes=modified > 0
        or profession.status != ProfessionStatus.PUBLISHED,
        nodes=nodes,
        edges=[
            GraphEdgeRead(
                id=edge.id,
                skill_id=edge.skill_id,
                prerequisite_id=edge.prerequisite_id,
                dep_type=edge.dep_type,
            )
            for edge in edges
        ],
        stats=GraphStats(
            skills=len(nodes),
            required=required,
            recommended=len(edges) - required,
            layers=len({node.layer for node in nodes}),
            resources=sum(res_counts.values()),
            modified=modified,
        ),
    )


async def publish_profession(
    db: AsyncSession, profession_id: uuid.UUID, user: User
) -> PublishRead:
    """Публикация: проверяем граф на циклы и отдаём новую версию студентам."""
    profession = await get_profession(db, profession_id)
    skill_ids = await _profession_skill_ids(db, profession_id)
    if not skill_ids:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Нельзя опубликовать профессию без навыков",
        )
    await ensure_graph_has_no_cycles(db)

    # Ресурсы публикуются вместе с профессией; сломанные ссылки остаются
    # в статусе needs_review и не попадают к студентам
    await db.execute(
        update(Resource)
        .where(
            Resource.skill_id.in_(skill_ids),
            Resource.status != "needs_review",
        )
        .values(status="published", published_at=utcnow())
    )

    profession.status = ProfessionStatus.PUBLISHED
    profession.skills_ready = True
    profession.skills_count = len(skill_ids)
    profession.published_at = utcnow()
    profession.published_by_id = user.id
    profession.content_version = (profession.content_version or 0) + 1
    # Публикация закрывает черновик: «сохранён в …» больше не актуален
    profession.draft_saved_at = None
    await admin_activity.record(
        db,
        actor=user,
        entity_type=admin_activity.ENTITY_PROFESSION,
        action=admin_activity.ACTION_PUBLISHED,
        title="Профессия опубликована",
        detail=f"«{profession.title}» · версия {profession.content_version}",
        entity_id=profession.id,
        profession_id=profession.id,
        touch_draft=False,
    )
    await db.commit()
    await db.refresh(profession)
    return PublishRead(
        profession_id=profession.id,
        status=profession.status,
        content_version=profession.content_version,
        published_at=profession.published_at,
        published_by_name=user.name,
    )


async def upsert_graph_skill(
    db: AsyncSession,
    profession_id: uuid.UUID,
    data: GraphSkillCreate,
    *,
    actor: User | None = None,
) -> Skill:
    """Создаёт навык и сразу ставит его в конец списка навыков профессии."""
    profession = await get_profession(db, profession_id)
    positions = list(
        await db.scalars(
            select(ProfessionSkill.position).where(
                ProfessionSkill.profession_id == profession_id
            )
        )
    )
    skill = await create_skill(
        db, SkillAdminCreate(**data.model_dump(exclude={"is_core"})), log=False
    )
    db.add(
        ProfessionSkill(
            profession_id=profession_id,
            skill_id=skill.id,
            position=(max(positions) + 1) if positions else 0,
            is_core=data.is_core,
        )
    )
    profession.skills_count = len(positions) + 1
    await admin_activity.record(
        db,
        actor=actor,
        entity_type=admin_activity.ENTITY_SKILL,
        action=admin_activity.ACTION_CREATED,
        title=f"Добавлен навык «{skill.title}»",
        detail=profession.title,
        entity_id=skill.id,
        profession_id=profession_id,
    )
    await db.commit()
    await db.refresh(skill)
    return skill


async def update_skill_position(
    db: AsyncSession, skill_id: uuid.UUID, data: GraphPositionUpdate
) -> Skill:
    skill = await get_skill(db, skill_id)
    skill.pos_x = data.pos_x
    skill.pos_y = data.pos_y
    await db.commit()
    await db.refresh(skill)
    return skill


async def reset_profession_layout(
    db: AsyncSession, profession_id: uuid.UUID, *, actor: User | None = None
) -> int:
    """Сбрасывает координаты всех узлов профессии — карта снова авто-раскладка."""
    skill_ids = await _profession_skill_ids(db, profession_id)
    if not skill_ids:
        return 0
    skills = list(await db.scalars(select(Skill).where(Skill.id.in_(skill_ids))))
    for skill in skills:
        skill.pos_x = None
        skill.pos_y = None
    await admin_activity.record(
        db,
        actor=actor,
        entity_type=admin_activity.ENTITY_PROFESSION,
        action=admin_activity.ACTION_UPDATED,
        title="Сброшена раскладка карты",
        detail=f"Узлов затронуто: {len(skills)}",
        profession_id=profession_id,
    )
    await db.commit()
    return len(skills)


# --------------------------------------------------------------------------
# Обзор админки: журнал, диагностика связей, сводка (неделя 6)
# --------------------------------------------------------------------------

HISTORY_CSV_HEADER = [
    "Дата",
    "Редактор",
    "Тип",
    "Действие",
    "Заголовок",
    "Подробности",
    "Профессия",
    "Навык",
    "ID объекта",
]


def _csv_id(value: uuid.UUID | None) -> str:
    return str(value) if value is not None else ""


async def list_history(
    db: AsyncSession,
    *,
    profession_id: uuid.UUID | None = None,
    skill_id: uuid.UUID | None = None,
    entity_type: str | None = None,
    action: str | None = None,
    actor_id: uuid.UUID | None = None,
    q: str | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
    limit: int,
    offset: int,
) -> tuple[list[AdminEventRead], int]:
    page = clamp_page(limit, offset)
    events, total = await admin_activity.list_events(
        db,
        profession_id=profession_id,
        skill_id=skill_id,
        entity_type=entity_type,
        action=action,
        actor_id=actor_id,
        q=q,
        created_from=created_from,
        created_to=created_to,
        limit=page.limit,
        offset=page.offset,
    )
    return [AdminEventRead.model_validate(event) for event in events], total


async def list_editors(db: AsyncSession) -> list[AdminEditorRead]:
    """Авторы журнала: заполняет фильтр «Автор» на странице истории."""
    stats = await admin_activity.list_editor_stats(db)
    return [
        AdminEditorRead(
            actor_id=stat.actor_id,
            actor_name=stat.actor_name,
            events_count=stat.events_count,
            last_event_at=stat.last_event_at,
        )
        for stat in stats
    ]


async def export_history_csv(
    db: AsyncSession,
    *,
    profession_id: uuid.UUID | None = None,
    skill_id: uuid.UUID | None = None,
    entity_type: str | None = None,
    action: str | None = None,
    actor_id: uuid.UUID | None = None,
    q: str | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
) -> str:
    """Журнал в CSV для Excel: `;` как разделитель, не больше строки-лимита."""
    events = await admin_activity.export_events(
        db,
        profession_id=profession_id,
        skill_id=skill_id,
        entity_type=entity_type,
        action=action,
        actor_id=actor_id,
        q=q,
        created_from=created_from,
        created_to=created_to,
    )
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";", lineterminator="\r\n")
    writer.writerow(HISTORY_CSV_HEADER)
    for event in events:
        writer.writerow(
            [
                event.created_at.strftime("%d.%m.%Y %H:%M"),
                event.actor_name or "Система",
                admin_activity.ENTITY_TYPE_LABELS.get(
                    event.entity_type, event.entity_type
                ),
                admin_activity.ACTION_LABELS.get(event.action, event.action),
                event.title,
                event.detail or "",
                _csv_id(event.profession_id),
                _csv_id(event.skill_id),
                _csv_id(event.entity_id),
            ]
        )
    return buffer.getvalue()


async def list_broken_dependencies(
    db: AsyncSession,
    *,
    profession_id: uuid.UUID | None = None,
    limit: int = 200,
    offset: int = 0,
) -> tuple[list[BrokenDependencyRead], int]:
    """Связи, которых не видно на карте.

    Редактор графа строит рёбра только между навыками профессии, поэтому
    связь «навык из профессии → навык вне её» молча теряется. Здесь такие
    рёбра перечислены явно: без профессии — рёбра, не видимые нигде.
    """
    skill_a = aliased(Skill, name="dep_skill")
    skill_b = aliased(Skill, name="dep_prerequisite")
    base = (
        select(
            SkillDependency.id,
            SkillDependency.skill_id,
            SkillDependency.prerequisite_id,
            skill_a.title,
            skill_b.title,
        )
        .join(skill_a, skill_a.id == SkillDependency.skill_id)
        .join(skill_b, skill_b.id == SkillDependency.prerequisite_id)
    )

    if profession_id is not None:
        await get_profession(db, profession_id)
        members = select(ProfessionSkill.skill_id).where(
            ProfessionSkill.profession_id == profession_id
        )
        inside = and_(
            SkillDependency.skill_id.in_(members),
            SkillDependency.prerequisite_id.in_(members),
        )
        stmt = base.where(
            or_(
                SkillDependency.skill_id.in_(members),
                SkillDependency.prerequisite_id.in_(members),
            ),
            not_(inside),
        )
        reason = "outside_profession"
        reason_text = "Второй навык связи не входит в профессию"
    else:
        member_a = aliased(ProfessionSkill, name="member_a")
        member_b = aliased(ProfessionSkill, name="member_b")
        visible = exists(
            select(1)
            .select_from(member_a)
            .join(member_b, member_b.profession_id == member_a.profession_id)
            .where(
                member_a.skill_id == SkillDependency.skill_id,
                member_b.skill_id == SkillDependency.prerequisite_id,
            )
        )
        stmt = base.where(not_(visible))
        reason = "orphan"
        reason_text = "Связь не отображается ни в одной профессии"

    page = clamp_page(limit, offset)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = await db.execute(
        stmt.order_by(skill_a.title).limit(page.limit).offset(page.offset)
    )
    items = [
        BrokenDependencyRead(
            id=dep_id,
            skill_id=skill_id,
            skill_title=skill_title or "",
            prerequisite_id=prerequisite_id,
            prerequisite_title=prerequisite_title or "",
            reason=reason,
            reason_text=reason_text,
        )
        for dep_id, skill_id, prerequisite_id, skill_title, prerequisite_title in rows
    ]
    return items, total or 0


async def get_admin_overview(
    db: AsyncSession,
    *,
    profession_id: uuid.UUID | None = None,
    recent_limit: int = 5,
    attention_limit: int = 5,
) -> AdminOverviewRead:
    """Одна ручка на всю стартовую страницу админки.

    Без `profession_id` берём профессию по умолчанию (приоритетные выше),
    чтобы страница открывалась сразу после логина.
    """
    if profession_id is None:
        profession_id = await db.scalar(
            select(Profession.id)
            .order_by(Profession.is_priority.desc(), Profession.title)
            .limit(1)
        )
    if profession_id is None:
        return AdminOverviewRead()

    profession = await get_profession(db, profession_id)
    graph = await get_profession_graph(db, profession_id)
    resource_stats = await get_resource_stats(db, profession_id=profession_id)
    _, broken_total = await list_broken_dependencies(
        db, profession_id=profession_id, limit=1
    )
    cycle = await find_graph_cycle(db)

    without_resources = [node for node in graph.nodes if node.resources_count == 0]
    conditions = _resource_conditions(profession_id=profession_id)
    attention_rows = await db.execute(
        select(Resource, Skill.slug, Skill.title)
        .join(Skill, Skill.id == Resource.skill_id)
        .where(
            *conditions,
            or_(Resource.status == "needs_review", Resource.link_status == "broken"),
        )
        .order_by(Resource.updated_at.desc())
        .limit(max(1, attention_limit))
    )
    attention = [
        to_resource_read(resource, slug, title)
        for resource, slug, title in attention_rows
    ]

    recent, _ = await list_history(
        db, profession_id=profession_id, limit=recent_limit, offset=0
    )

    action_needed = len(without_resources) + broken_total + resource_stats.needs_review
    profession_read = ProfessionAdminRead.model_validate(profession)
    profession_read.published_by_name = await _user_name(
        db, profession.published_by_id
    )
    return AdminOverviewRead(
        profession=profession_read,
        has_unpublished_changes=graph.has_unpublished_changes,
        stats=OverviewStats(
            skills=graph.stats.skills,
            dependencies=graph.stats.required + graph.stats.recommended,
            resources=resource_stats.total,
            attention=action_needed,
            required=graph.stats.required,
            recommended=graph.stats.recommended,
            layers=graph.stats.layers,
            published_resources=resource_stats.published,
            draft_resources=resource_stats.draft,
            needs_review_resources=resource_stats.needs_review,
            broken_links=resource_stats.broken_links,
        ),
        checklist=OverviewChecklist(
            graph_ready=bool(graph.nodes) and not cycle and broken_total == 0,
            resources_ready=not without_resources,
            links_ready=resource_stats.broken_links == 0,
            skills_without_resources=len(without_resources),
            broken_dependencies=broken_total,
            unchecked_links=resource_stats.unchecked_links,
            cycle=[str(skill_id) for skill_id in (cycle or [])],
        ),
        attention=attention,
        skills_without_resources=without_resources[:attention_limit],
        recent=recent,
    )


"""Админка: CRUD профессий, навыков, связей и ресурсов — неделя 4."""
from __future__ import annotations

import asyncio
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException, status
from sqlalchemy import case, distinct, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
    DependencyCreate,
    DependencyRead,
    DependencyUpdate,
    GraphEdgeRead,
    GraphNodeRead,
    GraphPositionUpdate,
    GraphSkillCreate,
    GraphStats,
    ProfessionAdminCreate,
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
from app.services.graph import ensure_edge_is_safe, ensure_graph_has_no_cycles

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
    page = clamp_page(limit, offset)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = await db.scalars(
        stmt.order_by(Profession.is_priority.desc(), Profession.title)
        .limit(page.limit)
        .offset(page.offset)
    )
    return list(rows), total or 0


async def create_profession(
    db: AsyncSession, data: ProfessionAdminCreate
) -> Profession:
    await _ensure_profession_slug_free(db, data.slug)
    await _ensure_direction_exists(db, data.direction_id)
    profession = Profession(**data.model_dump())
    db.add(profession)
    await _commit(db, "Профессия с таким slug уже существует")
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
    await _commit(db, "Профессия с таким slug уже существует")
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
    page = clamp_page(limit, offset)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = await db.scalars(
        stmt.order_by(Skill.slug).limit(page.limit).offset(page.offset)
    )
    return list(rows), total or 0


async def create_skill(db: AsyncSession, data: SkillAdminCreate) -> Skill:
    await _ensure_skill_slug_free(db, data.slug)
    skill = Skill(**data.model_dump())
    db.add(skill)
    await _commit(db, "Навык с таким slug уже существует")
    await db.refresh(skill)
    return skill


async def update_skill(
    db: AsyncSession, skill_id: uuid.UUID, data: SkillAdminUpdate
) -> Skill:
    skill = await get_skill(db, skill_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    # Координаты можно сбросить явным null — тогда работает авто-раскладка
    for field in ("pos_x", "pos_y"):
        if field in data.model_fields_set:
            changes[field] = getattr(data, field)
    if "slug" in changes:
        await _ensure_skill_slug_free(db, changes["slug"], skill_id)
    for field, value in changes.items():
        setattr(skill, field, value)
    await _commit(db, "Навык с таким slug уже существует")
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
    await _commit(db, "Такая связь уже есть")
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


async def create_resource(
    db: AsyncSession, data: ResourceAdminCreate
) -> Resource:
    await _touch_skill(db, data.skill_id)
    payload = data.model_dump()
    if payload.get("status") == "published":
        payload["published_at"] = utcnow()
    resource = Resource(**payload)
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return resource


async def update_resource(
    db: AsyncSession, resource_id: uuid.UUID, data: ResourceAdminUpdate
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
    await db.commit()
    await db.refresh(resource)
    return resource


async def publish_resource(db: AsyncSession, resource_id: uuid.UUID) -> Resource:
    resource = await get_resource(db, resource_id)
    resource.status = "published"
    resource.published_at = utcnow()
    await _touch_skill(db, resource.skill_id)
    await db.commit()
    await db.refresh(resource)
    return resource


async def delete_resource(db: AsyncSession, resource_id: uuid.UUID) -> None:
    resource = await get_resource(db, resource_id)
    skill_id = resource.skill_id
    await db.delete(resource)
    await _touch_skill(db, skill_id)
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
    db: AsyncSession, resource_id: uuid.UUID
) -> tuple[Resource, bool]:
    resource = await get_resource(db, resource_id)
    ok = await _probe_url(resource.url or "")
    _apply_link_result(resource, ok, utcnow())
    await _touch_skill(db, resource.skill_id)
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
    db: AsyncSession, profession_id: uuid.UUID, data: GraphSkillCreate
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
    skill = await create_skill(db, SkillAdminCreate(**data.model_dump(exclude={"is_core"})))
    db.add(
        ProfessionSkill(
            profession_id=profession_id,
            skill_id=skill.id,
            position=(max(positions) + 1) if positions else 0,
            is_core=data.is_core,
        )
    )
    profession.skills_count = len(positions) + 1
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
    db: AsyncSession, profession_id: uuid.UUID
) -> int:
    """Сбрасывает координаты всех узлов профессии — карта снова авто-раскладка."""
    skill_ids = await _profession_skill_ids(db, profession_id)
    if not skill_ids:
        return 0
    skills = list(await db.scalars(select(Skill).where(Skill.id.in_(skill_ids))))
    for skill in skills:
        skill.pos_x = None
        skill.pos_y = None
    await db.commit()
    return len(skills)

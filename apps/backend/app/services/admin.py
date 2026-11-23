"""Админка: CRUD профессий, навыков, связей и ресурсов — неделя 4."""
from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
    ResourceAdminUpdate,
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
    # Координаты можно сбросить явным null — тогда работает авто-раскладка
    for field in ("pos_x", "pos_y"):
        if field in data.model_fields_set:
            changes[field] = getattr(data, field)
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

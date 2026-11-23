"""Админка редактора: профессии, навыки, связи, ресурсы — неделя 4.

Все ручки требуют роль editor. Связи проверяются на циклы: граф навыков
обязан оставаться ациклическим.
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, DbSession, require_role
from app.models import ProfessionStatus, UserRole
from app.schemas.admin import (
    DependencyCreate,
    DependencyList,
    DependencyRead,
    DependencyUpdate,
    GraphPositionUpdate,
    GraphSkillCreate,
    ProfessionAdminCreate,
    ProfessionAdminList,
    ProfessionAdminRead,
    ProfessionAdminUpdate,
    ProfessionGraphRead,
    ProfessionPreviewRead,
    ProfessionSkillLinkRead,
    ProfessionSkillsReplace,
    PublishRead,
    ResourceAdminCreate,
    ResourceAdminList,
    ResourceAdminRead,
    ResourceAdminUpdate,
    ResourceLinkCheckResult,
    ResourceSortField,
    ResourceStats,
    ResourceStatus,
    ResourceType,
    SkillAdminCreate,
    SkillAdminList,
    SkillAdminRead,
    SkillAdminUpdate,
    SortDirection,
)
from app.schemas.auth import MessageResponse
from app.services import admin as admin_service
from app.services import skills as skills_service
from app.services.graph import ensure_graph_has_no_cycles

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_role(UserRole.EDITOR))],
)


async def _profession_skills(
    db: AsyncSession, profession_id: uuid.UUID
) -> list[ProfessionSkillLinkRead]:
    links = await admin_service.list_profession_skills(db, profession_id)
    return [
        ProfessionSkillLinkRead(
            skill_id=link.skill_id,
            slug=link.skill.slug,
            title=link.skill.title,
            position=link.position,
            is_core=link.is_core,
        )
        for link in links
    ]


async def _skill_read(db: AsyncSession, skill_id: uuid.UUID) -> SkillAdminRead:
    skill = await admin_service.get_skill(db, skill_id)
    professions = await admin_service.skill_professions(db, [skill.id])
    return SkillAdminRead(
        id=skill.id,
        slug=skill.slug,
        title=skill.title,
        subtitle=skill.subtitle or "",
        description=skill.description or "",
        category=skill.category or "",
        difficulty=skill.difficulty or 1,
        layer=skill.layer or 0,
        estimated_hours=skill.estimated_hours,
        pos_x=skill.pos_x,
        pos_y=skill.pos_y,
        professions=professions.get(skill.id, []),
    )


@router.get("/ping", summary="Проверка прав редактора")
async def ping() -> dict[str, str]:
    return {"detail": "pong"}


# ------------------------------- Профессии ---------------------------------


@router.get("/professions", response_model=ProfessionAdminList)
async def list_professions(
    db: DbSession,
    q: Annotated[str | None, Query(max_length=100)] = None,
    status_filter: Annotated[ProfessionStatus | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    items, total = await admin_service.list_professions(
        db,
        q=q,
        status_filter=status_filter.value if status_filter else None,
        limit=limit,
        offset=offset,
    )
    return ProfessionAdminList(
        items=[ProfessionAdminRead.model_validate(p) for p in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/professions",
    response_model=ProfessionAdminRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_profession(data: ProfessionAdminCreate, db: DbSession):
    profession = await admin_service.create_profession(db, data)
    return ProfessionAdminRead.model_validate(profession)


@router.get("/professions/{profession_id}", response_model=ProfessionAdminRead)
async def get_profession(profession_id: uuid.UUID, db: DbSession):
    profession = await admin_service.get_profession(db, profession_id)
    return ProfessionAdminRead.model_validate(profession)


@router.patch("/professions/{profession_id}", response_model=ProfessionAdminRead)
async def update_profession(
    profession_id: uuid.UUID, data: ProfessionAdminUpdate, db: DbSession
):
    profession = await admin_service.update_profession(db, profession_id, data)
    return ProfessionAdminRead.model_validate(profession)


@router.delete("/professions/{profession_id}", response_model=MessageResponse)
async def delete_profession(profession_id: uuid.UUID, db: DbSession):
    await admin_service.delete_profession(db, profession_id)
    return MessageResponse(detail="Профессия удалена")


@router.get(
    "/professions/{profession_id}/skills",
    response_model=list[ProfessionSkillLinkRead],
)
async def list_profession_skills(profession_id: uuid.UUID, db: DbSession):
    return await _profession_skills(db, profession_id)


@router.put(
    "/professions/{profession_id}/skills",
    response_model=list[ProfessionSkillLinkRead],
)
async def replace_profession_skills(
    profession_id: uuid.UUID, data: ProfessionSkillsReplace, db: DbSession
):
    await admin_service.replace_profession_skills(db, profession_id, data.skills)
    return await _profession_skills(db, profession_id)


# ---------------------------- Редактор графа -------------------------------


@router.get(
    "/professions/{profession_id}/graph",
    response_model=ProfessionGraphRead,
    summary="Сводный граф профессии для редактора",
)
async def get_profession_graph(profession_id: uuid.UUID, db: DbSession):
    return await admin_service.get_profession_graph(db, profession_id)


@router.post(
    "/professions/{profession_id}/skills",
    response_model=SkillAdminRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать навык и сразу добавить его в профессию",
)
async def create_profession_skill(
    profession_id: uuid.UUID, data: GraphSkillCreate, db: DbSession
):
    skill = await admin_service.upsert_graph_skill(db, profession_id, data)
    return await _skill_read(db, skill.id)


@router.post(
    "/professions/{profession_id}/publish",
    response_model=PublishRead,
    summary="Опубликовать граф профессии (с проверкой циклов)",
)
async def publish_profession(
    profession_id: uuid.UUID, db: DbSession, user: CurrentUser
):
    return await admin_service.publish_profession(db, profession_id, user)


@router.get(
    "/professions/{profession_id}/preview",
    response_model=ProfessionPreviewRead,
    summary="Предпросмотр карты глазами студента (включая черновики)",
)
async def preview_profession(profession_id: uuid.UUID, db: DbSession):
    profession = await admin_service.get_profession(db, profession_id)
    payload = await skills_service.get_profession_map(
        db, profession_id, allow_draft=True
    )
    return ProfessionPreviewRead(
        status=profession.status,
        content_version=profession.content_version or 1,
        published_at=profession.published_at,
        map=payload,
    )


@router.put(
    "/professions/{profession_id}/layout",
    response_model=MessageResponse,
    summary="Сбросить ручные координаты всех узлов профессии",
)
async def reset_profession_layout(profession_id: uuid.UUID, db: DbSession):
    count = await admin_service.reset_profession_layout(db, profession_id)
    return MessageResponse(detail=f"Раскладка сброшена для {count} навыков")


# -------------------------------- Навыки -----------------------------------


@router.get("/skills", response_model=SkillAdminList)
async def list_skills(
    db: DbSession,
    q: Annotated[str | None, Query(max_length=100)] = None,
    category: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    items, total = await admin_service.list_skills(
        db, q=q, category=category, limit=limit, offset=offset
    )
    professions = await admin_service.skill_professions(db, [s.id for s in items])
    return SkillAdminList(
        items=[
            SkillAdminRead(
                id=s.id,
                slug=s.slug,
                title=s.title,
                subtitle=s.subtitle or "",
                description=s.description or "",
                category=s.category or "",
                difficulty=s.difficulty or 1,
                layer=s.layer or 0,
                estimated_hours=s.estimated_hours,
                pos_x=s.pos_x,
                pos_y=s.pos_y,
                professions=professions.get(s.id, []),
            )
            for s in items
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/skills", response_model=SkillAdminRead, status_code=status.HTTP_201_CREATED
)
async def create_skill(data: SkillAdminCreate, db: DbSession):
    skill = await admin_service.create_skill(db, data)
    return await _skill_read(db, skill.id)


@router.get("/skills/{skill_id}", response_model=SkillAdminRead)
async def get_skill(skill_id: uuid.UUID, db: DbSession):
    return await _skill_read(db, skill_id)


@router.patch("/skills/{skill_id}", response_model=SkillAdminRead)
async def update_skill(skill_id: uuid.UUID, data: SkillAdminUpdate, db: DbSession):
    await admin_service.update_skill(db, skill_id, data)
    return await _skill_read(db, skill_id)


@router.delete("/skills/{skill_id}", response_model=MessageResponse)
async def delete_skill(skill_id: uuid.UUID, db: DbSession):
    await admin_service.delete_skill(db, skill_id)
    return MessageResponse(detail="Навык удалён")


@router.patch("/skills/{skill_id}/position", response_model=SkillAdminRead)
async def update_skill_position(
    skill_id: uuid.UUID, data: GraphPositionUpdate, db: DbSession
):
    """Сохраняет координаты узла после drag&drop (null — вернуть авто-раскладку)."""
    await admin_service.update_skill_position(db, skill_id, data)
    return await _skill_read(db, skill_id)


# -------------------------------- Связи ------------------------------------


@router.get("/dependencies", response_model=DependencyList)
async def list_dependencies(
    db: DbSession,
    skill_id: Annotated[uuid.UUID | None, Query()] = None,
    related_to: Annotated[uuid.UUID | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    items, total = await admin_service.list_dependencies(
        db, skill_id=skill_id, related_to=related_to, limit=limit, offset=offset
    )
    return DependencyList(items=items, total=total, limit=limit, offset=offset)


@router.get(
    "/dependencies/validate",
    response_model=MessageResponse,
    summary="Проверить весь граф навыков на циклы",
)
async def validate_graph(db: DbSession):
    await ensure_graph_has_no_cycles(db)
    return MessageResponse(detail="Циклов не найдено")


@router.post(
    "/dependencies",
    response_model=DependencyRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_dependency(data: DependencyCreate, db: DbSession):
    return await admin_service.create_dependency(db, data)


@router.patch("/dependencies/{dependency_id}", response_model=DependencyRead)
async def update_dependency(
    dependency_id: uuid.UUID, data: DependencyUpdate, db: DbSession
):
    return await admin_service.update_dependency(db, dependency_id, data)


@router.delete("/dependencies/{dependency_id}", response_model=MessageResponse)
async def delete_dependency(dependency_id: uuid.UUID, db: DbSession):
    await admin_service.delete_dependency(db, dependency_id)
    return MessageResponse(detail="Связь удалена")


# ------------------------------- Ресурсы -----------------------------------


@router.get("/resources", response_model=ResourceAdminList)
async def list_resources(
    db: DbSession,
    q: Annotated[str | None, Query(max_length=200)] = None,
    skill_id: Annotated[uuid.UUID | None, Query()] = None,
    profession_id: Annotated[uuid.UUID | None, Query()] = None,
    resource_type: Annotated[ResourceType | None, Query()] = None,
    lang: Annotated[str | None, Query(max_length=8)] = None,
    is_free: Annotated[bool | None, Query()] = None,
    status_filter: Annotated[ResourceStatus | None, Query(alias="status")] = None,
    sort_by: Annotated[ResourceSortField, Query()] = "skill",
    sort_dir: Annotated[SortDirection, Query()] = "asc",
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    items, total = await admin_service.list_resources(
        db,
        q=q,
        skill_id=skill_id,
        profession_id=profession_id,
        resource_type=resource_type,
        lang=lang,
        is_free=is_free,
        status_filter=status_filter,
        sort_by=sort_by,
        sort_dir=sort_dir,
        limit=limit,
        offset=offset,
    )
    return ResourceAdminList(items=items, total=total, limit=limit, offset=offset)


@router.get("/resources/stats", response_model=ResourceStats)
async def get_resource_stats(
    db: DbSession,
    profession_id: Annotated[uuid.UUID | None, Query()] = None,
):
    return await admin_service.get_resource_stats(db, profession_id=profession_id)


@router.post("/resources/check-links", response_model=ResourceLinkCheckResult)
async def check_resource_links(
    db: DbSession,
    profession_id: Annotated[uuid.UUID | None, Query()] = None,
    skill_id: Annotated[uuid.UUID | None, Query()] = None,
    only_unchecked: Annotated[bool, Query()] = False,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
):
    rows, ok_count = await admin_service.check_resource_links(
        db,
        profession_id=profession_id,
        skill_id=skill_id,
        only_unchecked=only_unchecked,
        limit=limit,
    )
    return ResourceLinkCheckResult(
        checked=len(rows),
        ok=ok_count,
        broken=len(rows) - ok_count,
        items=await admin_service.to_resource_reads(db, rows),
    )


@router.get("/resources/{resource_id}", response_model=ResourceAdminRead)
async def get_resource(resource_id: uuid.UUID, db: DbSession):
    return await admin_service.get_resource_read(db, resource_id)


@router.post(
    "/resources",
    response_model=ResourceAdminRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_resource(data: ResourceAdminCreate, db: DbSession):
    resource = await admin_service.create_resource(db, data)
    return (await admin_service.to_resource_reads(db, [resource]))[0]


@router.patch("/resources/{resource_id}", response_model=ResourceAdminRead)
async def update_resource(
    resource_id: uuid.UUID, data: ResourceAdminUpdate, db: DbSession
):
    resource = await admin_service.update_resource(db, resource_id, data)
    return (await admin_service.to_resource_reads(db, [resource]))[0]


@router.post(
    "/resources/{resource_id}/publish", response_model=ResourceAdminRead
)
async def publish_resource(resource_id: uuid.UUID, db: DbSession):
    resource = await admin_service.publish_resource(db, resource_id)
    return (await admin_service.to_resource_reads(db, [resource]))[0]


@router.post(
    "/resources/{resource_id}/check-link", response_model=ResourceAdminRead
)
async def check_resource_link(resource_id: uuid.UUID, db: DbSession):
    resource, _ = await admin_service.check_resource_link(db, resource_id)
    return (await admin_service.to_resource_reads(db, [resource]))[0]


@router.delete("/resources/{resource_id}", response_model=MessageResponse)
async def delete_resource(resource_id: uuid.UUID, db: DbSession):
    await admin_service.delete_resource(db, resource_id)
    return MessageResponse(detail="Ресурс удалён")

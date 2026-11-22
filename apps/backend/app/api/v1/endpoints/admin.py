"""Админка редактора: профессии, навыки, связи, ресурсы — неделя 4.

Все ручки требуют роль editor. Связи проверяются на циклы: граф навыков
обязан оставаться ациклическим.
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DbSession, require_role
from app.models import ProfessionStatus, UserRole
from app.schemas.admin import (
    DependencyCreate,
    DependencyList,
    DependencyRead,
    DependencyUpdate,
    ProfessionAdminCreate,
    ProfessionAdminList,
    ProfessionAdminRead,
    ProfessionAdminUpdate,
    ProfessionSkillLinkRead,
    ProfessionSkillsReplace,
    ResourceAdminCreate,
    ResourceAdminList,
    ResourceAdminRead,
    ResourceAdminUpdate,
    SkillAdminCreate,
    SkillAdminList,
    SkillAdminRead,
    SkillAdminUpdate,
)
from app.schemas.auth import MessageResponse
from app.services import admin as admin_service
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
        description=skill.description or "",
        category=skill.category or "",
        difficulty=skill.difficulty or 1,
        layer=skill.layer or 0,
        estimated_hours=skill.estimated_hours,
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
                description=s.description or "",
                category=s.category or "",
                difficulty=s.difficulty or 1,
                layer=s.layer or 0,
                estimated_hours=s.estimated_hours,
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


# -------------------------------- Связи ------------------------------------


@router.get("/dependencies", response_model=DependencyList)
async def list_dependencies(
    db: DbSession,
    skill_id: Annotated[uuid.UUID | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    items, total = await admin_service.list_dependencies(
        db, skill_id=skill_id, limit=limit, offset=offset
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
    skill_id: Annotated[uuid.UUID | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    items, total = await admin_service.list_resources(
        db, skill_id=skill_id, limit=limit, offset=offset
    )
    return ResourceAdminList(
        items=[ResourceAdminRead.model_validate(r) for r in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/resources",
    response_model=ResourceAdminRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_resource(data: ResourceAdminCreate, db: DbSession):
    resource = await admin_service.create_resource(db, data)
    return ResourceAdminRead.model_validate(resource)


@router.patch("/resources/{resource_id}", response_model=ResourceAdminRead)
async def update_resource(
    resource_id: uuid.UUID, data: ResourceAdminUpdate, db: DbSession
):
    resource = await admin_service.update_resource(db, resource_id, data)
    return ResourceAdminRead.model_validate(resource)


@router.delete("/resources/{resource_id}", response_model=MessageResponse)
async def delete_resource(resource_id: uuid.UUID, db: DbSession):
    await admin_service.delete_resource(db, resource_id)
    return MessageResponse(detail="Ресурс удалён")

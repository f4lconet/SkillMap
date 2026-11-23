"""Публичная ссылка на карту и экспорт данных для PDF."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.share import ExportPayload, PublicMapResponse, ShareState
from app.services import share as share_service

# POST/DELETE/GET /me/share — управление ссылкой авторизованным пользователем
me_router = APIRouter(prefix="/me/share", tags=["share"])

# GET /public/{token} — read-only карта без авторизации
public_router = APIRouter(prefix="/public", tags=["public"])

# GET /me/export — данные для клиентского рендера PDF
export_router = APIRouter(prefix="/me", tags=["export"])


@me_router.get("", response_model=ShareState)
async def read_share_state(user: CurrentUser) -> ShareState:
    return share_service.get_share_state(user)


@me_router.post("", response_model=ShareState)
async def create_share_link(db: DbSession, user: CurrentUser) -> ShareState:
    """Включает публичную ссылку (или возвращает уже существующую)."""
    return await share_service.enable_sharing(db, user)


@me_router.delete("", response_model=ShareState)
async def delete_share_link(db: DbSession, user: CurrentUser) -> ShareState:
    """Отключает публичную ссылку и удаляет токен."""
    return await share_service.disable_sharing(db, user)


@public_router.get("/u/{username}", response_model=PublicMapResponse)
async def read_public_map_by_username(
    db: DbSession, username: str
) -> PublicMapResponse:
    """Read-only карта по человекочитаемому адресу /u/{username}."""
    return await share_service.public_map_by_username(db, username)


@public_router.get("/{token}", response_model=PublicMapResponse)
async def read_public_map(db: DbSession, token: str) -> PublicMapResponse:
    return await share_service.public_map(db, token)


@export_router.get("/export", response_model=ExportPayload)
async def export_my_data(
    db: DbSession,
    user: CurrentUser,
    profession_id: Annotated[
        uuid.UUID | None, Query(description="По умолчанию — цель пользователя")
    ] = None,
) -> ExportPayload:
    """Агрегированный срез профиля для PDF-экспорта на фронте."""
    return await share_service.build_export(db, user, profession_id)

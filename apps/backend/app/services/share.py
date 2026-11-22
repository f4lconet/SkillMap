"""Публичная ссылка на карту и данные для клиентского PDF-экспорта."""
from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.user import User
from app.schemas.profession import ProfessionDetail
from app.schemas.share import (
    ExportMeta,
    ExportPayload,
    ExportUser,
    PublicGapSummary,
    PublicMapResponse,
    PublicPlanSummary,
    ShareState,
)
from app.services.skills import (
    build_trajectory,
    gap_analysis,
    get_profession_map,
    get_profession_or_404,
)

TOKEN_BYTES = 24


def share_url(token: str) -> str:
    base = get_settings().frontend_url.rstrip("/")
    return f"{base}/public/{token}"


def _state(user: User) -> ShareState:
    enabled = bool(user.share_enabled and user.share_token)
    return ShareState(
        enabled=enabled,
        token=user.share_token if enabled else None,
        url=share_url(user.share_token) if enabled and user.share_token else None,
        shared_at=user.shared_at if enabled else None,
    )


def get_share_state(user: User) -> ShareState:
    return _state(user)


async def _new_token(db: AsyncSession) -> str:
    for _ in range(5):
        token = secrets.token_urlsafe(TOKEN_BYTES)
        exists = await db.scalar(select(User.id).where(User.share_token == token))
        if exists is None:
            return token
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Не удалось создать ссылку, попробуйте ещё раз",
    )


async def enable_sharing(db: AsyncSession, user: User) -> ShareState:
    if not user.target_profession_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Сначала выберите профессию — без неё делиться нечем",
        )
    if not user.share_token:
        user.share_token = await _new_token(db)
    user.share_enabled = True
    user.shared_at = datetime.now(UTC)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _state(user)


async def disable_sharing(db: AsyncSession, user: User) -> ShareState:
    user.share_enabled = False
    user.share_token = None
    user.shared_at = None
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _state(user)


async def load_shared_user(db: AsyncSession, token: str) -> User:
    user = await db.scalar(
        select(User).where(
            User.share_token == token,
            User.share_enabled.is_(True),
        )
    )
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ссылка не найдена"
        )
    return user


async def public_map(db: AsyncSession, token: str) -> PublicMapResponse:
    user = await load_shared_user(db, token)
    pid = user.target_profession_id

    if not pid:
        return PublicMapResponse(
            owner_name=user.name,
            owner_level=user.level,
            shared_at=user.shared_at,
            gap=PublicGapSummary(),
            plan=PublicPlanSummary(hours_per_week=user.hours_per_week or 0),
        )

    profession = await get_profession_or_404(db, pid)
    profession_map = await get_profession_map(db, pid, user)
    gap = await gap_analysis(db, user, pid)
    plan = await build_trajectory(db, user, pid, persist=False)

    return PublicMapResponse(
        owner_name=user.name,
        owner_level=user.level,
        profession_id=profession.id,
        profession_title=profession.title,
        shared_at=user.shared_at,
        map=profession_map,
        gap=PublicGapSummary(
            total_skills=gap.total_skills,
            mastered_count=len(gap.mastered),
            learning_count=len(gap.learning),
            missing_count=gap.missing_count,
            match_percent=gap.match_percent or 0.0,
            estimated_remaining_hours=gap.estimated_remaining_hours,
        ),
        plan=PublicPlanSummary(
            hours_per_week=plan.hours_per_week,
            total_weeks=plan.total_weeks,
            current_week=plan.current_week,
            focus=plan.weeks[0].focus if plan.weeks else None,
        ),
    )


async def build_export(
    db: AsyncSession,
    user: User,
    profession_id: uuid.UUID | None = None,
) -> ExportPayload:
    """Полный срез данных пользователя для отрисовки PDF на клиенте."""
    pid = profession_id or user.target_profession_id
    if not pid:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Сначала выберите профессию",
        )

    profession = await get_profession_or_404(db, pid)
    profession_map = await get_profession_map(db, pid, user)
    gap = await gap_analysis(db, user, pid)
    plan = await build_trajectory(db, user, pid, persist=False)

    notes: list[str] = []
    if not profession.skills_ready:
        notes.append("Граф профессии ещё наполняется: часть навыков не опубликована.")
    if plan.total_weeks == 0:
        notes.append("Все навыки профессии уже отмечены как освоенные.")

    return ExportPayload(
        meta=ExportMeta(
            generated_at=datetime.now(UTC),
            share_url=share_url(user.share_token) if user.share_token else None,
        ),
        user=ExportUser(
            name=user.name,
            email=user.email,
            level=user.level,
            hours_per_week=user.hours_per_week,
            target_profession_title=profession.title,
        ),
        profession=ProfessionDetail.model_validate(profession),
        map=profession_map,
        gap=gap,
        plan=plan,
        notes=notes,
    )


__all__ = [
    "build_export",
    "disable_sharing",
    "enable_sharing",
    "get_share_state",
    "load_shared_user",
    "public_map",
    "share_url",
]

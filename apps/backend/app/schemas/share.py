"""Схемы публичной ссылки на карту и экспорта в PDF — неделя 4."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import Level
from app.schemas.profession import ProfessionDetail
from app.schemas.skill import (
    GapAnalysisResponse,
    ProfessionMapResponse,
    TrajectoryResponse,
)


class ShareState(BaseModel):
    """Состояние публичной ссылки текущего пользователя."""

    enabled: bool
    username: str | None = None
    token: str | None = None
    # Ссылка на карту по username: {frontend_url}/u/{username}
    profile_url: str | None = None
    # Ссылка по токену (legacy): {frontend_url}/public/{token}
    url: str | None = None
    shared_at: datetime | None = None


class PublicGapSummary(BaseModel):
    total_skills: int = 0
    mastered_count: int = 0
    learning_count: int = 0
    missing_count: int = 0
    match_percent: float = 0.0
    estimated_remaining_hours: int | None = None


class PublicPlanSummary(BaseModel):
    hours_per_week: int = 0
    total_weeks: int = 0
    current_week: int = 1
    focus: str | None = None


class PublicMapResponse(BaseModel):
    """Read-only карта по публичной ссылке: без email и служебных полей."""

    username: str | None = None
    owner_name: str
    owner_level: Level | None = None
    profession_id: uuid.UUID | None = None
    profession_title: str | None = None
    shared_at: datetime | None = None
    map: ProfessionMapResponse | None = None
    gap: PublicGapSummary
    plan: PublicPlanSummary


class ExportUser(BaseModel):
    name: str
    email: str
    level: Level | None = None
    hours_per_week: int | None = None
    target_profession_title: str | None = None


class ExportMeta(BaseModel):
    app: str = "SkillMap"
    version: str = "2026-11-w4"
    generated_at: datetime
    share_url: str | None = None


class ExportPayload(BaseModel):
    """Данные для клиентского рендера PDF (фронт рисует макет сам)."""

    meta: ExportMeta
    user: ExportUser
    profession: ProfessionDetail
    map: ProfessionMapResponse
    gap: GapAnalysisResponse
    plan: TrajectoryResponse
    notes: list[str] = Field(default_factory=list)

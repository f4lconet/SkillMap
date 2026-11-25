"""Схемы импорта навыков из GitHub и Stepik (Should, неделя 5)."""

from __future__ import annotations

import re
import uuid
from typing import Literal

from pydantic import BaseModel, Field, field_validator

ImportSource = Literal["github", "stepik"]

# Правила GitHub для логина: буквы/цифры/дефис, не более 39 символов
GITHUB_LOGIN_RE = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$")


class ImportEvidence(BaseModel):
    """Чем именно подтверждён навык: язык, тема репозитория, название курса."""

    source: str
    title: str
    url: str = ""
    confidence: float


class ImportSuggestion(BaseModel):
    skill_id: uuid.UUID
    slug: str
    title: str
    confidence: float
    evidence: list[ImportEvidence] = Field(default_factory=list)


class ImportPreview(BaseModel):
    """Результат «сухого» прогона импорта — ничего не записывается в БД."""

    source: ImportSource
    account: str
    total_signals: int
    suggestions: list[ImportSuggestion] = Field(default_factory=list)
    unmatched: list[str] = Field(default_factory=list)
    already_mastered: list[str] = Field(default_factory=list)


class GitHubImportRequest(BaseModel):
    login: str = Field(min_length=1, max_length=39, description="Логин GitHub")
    profession_id: uuid.UUID | None = Field(
        default=None,
        description="Ограничить подсказки профессией; по умолчанию — цель пользователя",
    )

    @field_validator("login")
    @classmethod
    def _check_login(cls, value: str) -> str:
        value = value.strip().lstrip("@")
        if not GITHUB_LOGIN_RE.match(value):
            raise ValueError("Некорректный логин GitHub")
        return value


class StepikImportRequest(BaseModel):
    course_ids: list[int] = Field(
        min_length=1,
        max_length=50,
        description="id пройденных курсов Stepik (из ссылки /course/<id>)",
    )
    profession_id: uuid.UUID | None = None

    @field_validator("course_ids")
    @classmethod
    def _check_ids(cls, value: list[int]) -> list[int]:
        if any(course_id <= 0 for course_id in value):
            raise ValueError("id курса Stepik должен быть положительным")
        return value


class ImportApplyRequest(BaseModel):
    skill_ids: list[uuid.UUID] = Field(min_length=1, max_length=100)
    source: ImportSource = "github"
    self_score: int | None = Field(default=None, ge=1, le=5)


class ImportedSkill(BaseModel):
    skill_id: uuid.UUID
    slug: str


class ImportApplyResponse(BaseModel):
    source: ImportSource
    applied: list[ImportedSkill] = Field(default_factory=list)
    total_mastered: int = 0

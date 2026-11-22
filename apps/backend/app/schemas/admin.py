"""Схемы админки: профессии, навыки, связи, ресурсы — неделя 4."""
from __future__ import annotations

import uuid
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.models.enums import DependencyType, Level, ProfessionStatus

Slug = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=2,
        max_length=100,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    ),
]
ShortText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]
Description = Annotated[str, StringConstraints(max_length=4000)]
ResourceType = Literal["course", "book", "project", "article", "video", "docs"]


class ProfessionAdminCreate(BaseModel):
    slug: Slug
    title: ShortText
    direction_id: Annotated[str, StringConstraints(max_length=50)] | None = None
    direction: Annotated[str, StringConstraints(max_length=100)] = ""
    description: Description = ""
    short_description: Annotated[str, StringConstraints(max_length=300)] = ""
    tasks: list[str] = Field(default_factory=list)
    suits_if: list[str] = Field(default_factory=list)
    start_hint: Description = ""
    is_priority: bool = False
    entry_level: Level | None = None
    status: ProfessionStatus = ProfessionStatus.DRAFT
    skills_ready: bool = False
    estimated_weeks: int = Field(default=0, ge=0, le=260)


class ProfessionAdminUpdate(BaseModel):
    slug: Slug | None = None
    title: ShortText | None = None
    direction_id: Annotated[str, StringConstraints(max_length=50)] | None = None
    direction: Annotated[str, StringConstraints(max_length=100)] | None = None
    description: Description | None = None
    short_description: Annotated[str, StringConstraints(max_length=300)] | None = None
    tasks: list[str] | None = None
    suits_if: list[str] | None = None
    start_hint: Description | None = None
    is_priority: bool | None = None
    entry_level: Level | None = None
    status: ProfessionStatus | None = None
    skills_ready: bool | None = None
    estimated_weeks: int | None = Field(default=None, ge=0, le=260)


class ProfessionAdminRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    direction: str
    direction_id: str | None = None
    description: str
    short_description: str
    tasks: list[str] = Field(default_factory=list)
    suits_if: list[str] = Field(default_factory=list)
    start_hint: str = ""
    is_priority: bool
    entry_level: Level | None = None
    status: ProfessionStatus
    skills_ready: bool
    skills_count: int
    estimated_weeks: int


class ProfessionAdminList(BaseModel):
    items: list[ProfessionAdminRead]
    total: int
    limit: int
    offset: int


class ProfessionSkillLinkIn(BaseModel):
    skill_id: uuid.UUID
    position: int | None = Field(default=None, ge=0)
    is_core: bool = True


class ProfessionSkillsReplace(BaseModel):
    skills: list[ProfessionSkillLinkIn] = Field(default_factory=list, max_length=500)


class ProfessionSkillLinkRead(BaseModel):
    skill_id: uuid.UUID
    slug: str
    title: str
    position: int
    is_core: bool


class SkillAdminCreate(BaseModel):
    slug: Slug
    title: ShortText
    description: Description = ""
    category: Annotated[str, StringConstraints(max_length=100)] = ""
    difficulty: int = Field(default=1, ge=1, le=5)
    layer: int = Field(default=0, ge=0, le=20)
    estimated_hours: int | None = Field(default=None, ge=0, le=2000)


class SkillAdminUpdate(BaseModel):
    slug: Slug | None = None
    title: ShortText | None = None
    description: Description | None = None
    category: Annotated[str, StringConstraints(max_length=100)] | None = None
    difficulty: int | None = Field(default=None, ge=1, le=5)
    layer: int | None = Field(default=None, ge=0, le=20)
    estimated_hours: int | None = Field(default=None, ge=0, le=2000)


class SkillAdminRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    description: str
    category: str
    difficulty: int
    layer: int
    estimated_hours: int | None = None
    professions: list[str] = Field(default_factory=list)


class SkillAdminList(BaseModel):
    items: list[SkillAdminRead]
    total: int
    limit: int
    offset: int


class DependencyCreate(BaseModel):
    skill_id: uuid.UUID
    prerequisite_id: uuid.UUID
    dep_type: DependencyType = DependencyType.REQUIRED


class DependencyUpdate(BaseModel):
    skill_id: uuid.UUID | None = None
    prerequisite_id: uuid.UUID | None = None
    dep_type: DependencyType | None = None


class DependencyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    skill_id: uuid.UUID
    skill_slug: str = ""
    skill_title: str = ""
    prerequisite_id: uuid.UUID
    prerequisite_slug: str = ""
    prerequisite_title: str = ""
    dep_type: DependencyType


class DependencyList(BaseModel):
    items: list[DependencyRead]
    total: int
    limit: int
    offset: int


class ResourceAdminCreate(BaseModel):
    skill_id: uuid.UUID
    title: ShortText
    url: Annotated[str, StringConstraints(max_length=1000)] = ""
    resource_type: ResourceType = "course"
    is_free: bool = True
    provider: Annotated[str, StringConstraints(max_length=100)] = ""
    lang: Annotated[str, StringConstraints(max_length=8)] = "ru"
    description: Description = ""
    estimated_hours: int | None = Field(default=None, ge=0, le=2000)
    position: int = Field(default=0, ge=0)


class ResourceAdminUpdate(BaseModel):
    skill_id: uuid.UUID | None = None
    title: ShortText | None = None
    url: Annotated[str, StringConstraints(max_length=1000)] | None = None
    resource_type: ResourceType | None = None
    is_free: bool | None = None
    provider: Annotated[str, StringConstraints(max_length=100)] | None = None
    lang: Annotated[str, StringConstraints(max_length=8)] | None = None
    description: Description | None = None
    estimated_hours: int | None = Field(default=None, ge=0, le=2000)
    position: int | None = Field(default=None, ge=0)


class ResourceAdminRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    skill_id: uuid.UUID
    title: str
    url: str
    resource_type: str
    is_free: bool
    provider: str
    lang: str = "ru"
    description: str
    estimated_hours: int | None = None
    position: int


class ResourceAdminList(BaseModel):
    items: list[ResourceAdminRead]
    total: int
    limit: int
    offset: int

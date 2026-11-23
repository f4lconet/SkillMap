"""Схемы админки: профессии, навыки, связи, ресурсы — неделя 4."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.models.enums import DependencyType, Level, ProfessionStatus
from app.schemas.skill import ProfessionMapResponse

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
# Названия ресурсов из контента аналитика бывают длиннее ShortText
ResourceTitle = Annotated[
    str, StringConstraints(strip_whitespace=True, max_length=500)
]
Description = Annotated[str, StringConstraints(max_length=4000)]
ResourceType = Literal["course", "book", "project", "article", "video", "docs"]
ResourceStatus = Literal["draft", "published", "needs_review"]
ResourceLinkStatus = Literal["unknown", "ok", "broken"]
ResourceSortField = Literal["skill", "title", "status", "updated"]
SortDirection = Literal["asc", "desc"]


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
    published_at: datetime | None = None
    content_version: int = 1
    published_by_name: str = ""


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
    subtitle: Annotated[str, StringConstraints(max_length=200)] = ""
    description: Description = ""
    category: Annotated[str, StringConstraints(max_length=100)] = ""
    difficulty: int = Field(default=1, ge=1, le=5)
    layer: int = Field(default=0, ge=0, le=20)
    estimated_hours: int | None = Field(default=None, ge=0, le=2000)
    pos_x: int | None = None
    pos_y: int | None = None


class SkillAdminUpdate(BaseModel):
    slug: Slug | None = None
    title: ShortText | None = None
    subtitle: Annotated[str, StringConstraints(max_length=200)] | None = None
    description: Description | None = None
    category: Annotated[str, StringConstraints(max_length=100)] | None = None
    difficulty: int | None = Field(default=None, ge=1, le=5)
    layer: int | None = Field(default=None, ge=0, le=20)
    estimated_hours: int | None = Field(default=None, ge=0, le=2000)
    pos_x: int | None = None
    pos_y: int | None = None


class SkillAdminRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    subtitle: str = ""
    description: str
    category: str
    difficulty: int
    layer: int
    estimated_hours: int | None = None
    pos_x: int | None = None
    pos_y: int | None = None
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
    title: ResourceTitle
    url: Annotated[str, StringConstraints(max_length=1000)] = ""
    resource_type: ResourceType = "course"
    is_free: bool = True
    provider: Annotated[str, StringConstraints(max_length=100)] = ""
    lang: Annotated[str, StringConstraints(max_length=8)] = "ru"
    description: Description = ""
    estimated_hours: int | None = Field(default=None, ge=0, le=2000)
    position: int = Field(default=0, ge=0)
    status: ResourceStatus = "draft"


class ResourceAdminUpdate(BaseModel):
    skill_id: uuid.UUID | None = None
    title: ResourceTitle | None = None
    url: Annotated[str, StringConstraints(max_length=1000)] | None = None
    resource_type: ResourceType | None = None
    is_free: bool | None = None
    provider: Annotated[str, StringConstraints(max_length=100)] | None = None
    lang: Annotated[str, StringConstraints(max_length=8)] | None = None
    description: Description | None = None
    estimated_hours: int | None = Field(default=None, ge=0, le=2000)
    position: int | None = Field(default=None, ge=0)
    status: ResourceStatus | None = None


class ResourceAdminRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    skill_id: uuid.UUID
    skill_slug: str = ""
    skill_title: str = ""
    title: str
    url: str
    resource_type: str
    is_free: bool
    provider: str
    lang: str = "ru"
    description: str
    estimated_hours: int | None = None
    position: int
    status: ResourceStatus = "draft"
    link_status: ResourceLinkStatus = "unknown"
    last_checked_at: datetime | None = None
    published_at: datetime | None = None


class ResourceAdminList(BaseModel):
    items: list[ResourceAdminRead]
    total: int
    limit: int
    offset: int


class ResourceStats(BaseModel):
    """Сводка по ресурсам для карточек на странице «Ресурсы»."""

    total: int = 0
    published: int = 0
    draft: int = 0
    needs_review: int = 0
    broken_links: int = 0
    unchecked_links: int = 0
    skills_total: int = 0
    skills_with_resources: int = 0
    profession_id: uuid.UUID | None = None


class ResourceLinkCheckResult(BaseModel):
    checked: int = 0
    ok: int = 0
    broken: int = 0
    items: list[ResourceAdminRead] = Field(default_factory=list)


# --------------------------------------------------------------------------
# Редактор графа: сводный payload профессии
# --------------------------------------------------------------------------


class GraphNodeRead(BaseModel):
    """Узел карты в редакторе: навык + позиция + состояние публикации."""

    id: uuid.UUID
    slug: str
    title: str
    subtitle: str = ""
    description: str = ""
    category: str = ""
    difficulty: int = 1
    layer: int = 0
    estimated_hours: int | None = None
    position: int = 0
    is_core: bool = False
    pos_x: int | None = None
    pos_y: int | None = None
    publish_state: Literal["draft", "published", "modified", "new"] = "draft"
    resources_count: int = 0


class GraphEdgeRead(BaseModel):
    id: uuid.UUID
    skill_id: uuid.UUID
    prerequisite_id: uuid.UUID
    dep_type: DependencyType


class GraphStats(BaseModel):
    skills: int = 0
    required: int = 0
    recommended: int = 0
    layers: int = 0
    resources: int = 0
    modified: int = 0


class ProfessionGraphRead(BaseModel):
    profession_id: uuid.UUID
    slug: str
    title: str
    status: ProfessionStatus
    skills_ready: bool
    content_version: int = 1
    published_at: datetime | None = None
    published_by_name: str = ""
    updated_at: datetime | None = None
    has_unpublished_changes: bool = False
    nodes: list[GraphNodeRead] = Field(default_factory=list)
    edges: list[GraphEdgeRead] = Field(default_factory=list)
    stats: GraphStats = Field(default_factory=GraphStats)


class GraphSkillCreate(BaseModel):
    """Новый навык прямо из редактора: сразу привязывается к профессии."""

    slug: Slug
    title: ShortText
    subtitle: Annotated[str, StringConstraints(max_length=200)] = ""
    description: Description = ""
    category: Annotated[str, StringConstraints(max_length=100)] = ""
    difficulty: int = Field(default=1, ge=1, le=5)
    estimated_hours: int | None = Field(default=None, ge=0, le=2000)
    pos_x: int | None = None
    pos_y: int | None = None
    is_core: bool = False


class GraphPositionUpdate(BaseModel):
    """Сохранение координат узла после drag&drop (или сброс в null)."""

    pos_x: int | None = None
    pos_y: int | None = None


class PublishRead(BaseModel):
    profession_id: uuid.UUID
    status: ProfessionStatus
    content_version: int
    published_at: datetime | None = None
    published_by_name: str = ""


class ProfessionPreviewRead(BaseModel):
    status: ProfessionStatus
    content_version: int
    published_at: datetime | None = None
    map: ProfessionMapResponse


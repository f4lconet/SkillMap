import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Level


class ProfessionBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str


class ProfessionCard(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    direction: str
    short_description: str
    entry_level: Level | None
    skills_count: int
    estimated_weeks: int
    is_priority: bool


class ProfessionDetail(ProfessionCard):
    description: str
    tasks: list[str] = Field(default_factory=list)
    suits_if: list[str] = Field(default_factory=list)
    start_hint: str = ""


class ProfessionList(BaseModel):
    items: list[ProfessionCard]
    total: int
    limit: int
    offset: int
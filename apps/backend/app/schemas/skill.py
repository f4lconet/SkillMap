import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import DependencyType, SkillStatus


class SkillBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    category: str = ""
    difficulty: int = 1
    layer: int = 0
    estimated_hours: int | None = None


class SkillDetail(SkillBrief):
    description: str = ""


class PrerequisiteRef(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    dep_type: DependencyType


class ProfessionSkillNode(BaseModel):
    """Узел карты для профессии."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    description: str = ""
    category: str = ""
    difficulty: int = 1
    layer: int = 0
    estimated_hours: int | None = None
    position: int = 0
    is_core: bool = True
    required_prerequisites: list[PrerequisiteRef] = Field(default_factory=list)
    recommended_prerequisites: list[PrerequisiteRef] = Field(default_factory=list)
    user_status: SkillStatus | None = None
    self_score: int | None = None
    locked: bool = False


class ProfessionMapResponse(BaseModel):
    profession_id: uuid.UUID
    profession_title: str
    skills_ready: bool
    skills: list[ProfessionSkillNode]
    total_skills: int
    mastered_count: int = 0
    learning_count: int = 0
    progress_percent: float = 0.0


class UserSkillUpdate(BaseModel):
    status: SkillStatus
    self_score: int | None = Field(default=None, ge=1, le=5)


class UserSkillRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    skill_id: uuid.UUID
    status: SkillStatus
    self_score: int | None = None


class GapAnalysisItem(BaseModel):
    skill: SkillBrief
    status: SkillStatus
    is_core: bool
    position: int
    locked: bool = False


class GapAnalysisResponse(BaseModel):
    profession_id: uuid.UUID
    profession_title: str
    total_skills: int
    mastered: list[GapAnalysisItem]
    learning: list[GapAnalysisItem]
    missing: list[GapAnalysisItem]
    progress_percent: float
    estimated_remaining_hours: int | None = None


class TrajectoryWeek(BaseModel):
    week: int
    title: str
    skills: list[SkillBrief]
    estimated_hours: int
    focus: str = ""


class TrajectoryResponse(BaseModel):
    profession_id: uuid.UUID
    profession_title: str
    level: str | None = None
    hours_per_week: int
    total_weeks: int
    weeks: list[TrajectoryWeek]

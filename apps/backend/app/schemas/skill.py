import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import DependencyType, PlanItemStatus, SkillStatus


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


class ResourceBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    url: str = ""
    resource_type: str = "course"
    is_free: bool = True
    provider: str = ""
    estimated_hours: int | None = None


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
    resources: list[ResourceBrief] = Field(default_factory=list)


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


class UserSkillBulkItem(BaseModel):
    skill_id: uuid.UUID
    status: SkillStatus = SkillStatus.MASTERED
    self_score: int | None = Field(default=None, ge=1, le=5)


class UserSkillBulkRequest(BaseModel):
    skills: list[UserSkillBulkItem] = Field(min_length=1, max_length=100)


class GapAnalysisItem(BaseModel):
    skill: SkillBrief
    status: SkillStatus
    is_core: bool
    position: int
    locked: bool = False
    priority: int | None = None


class GapAnalysisResponse(BaseModel):
    profession_id: uuid.UUID
    profession_title: str
    total_skills: int
    mastered: list[GapAnalysisItem]
    learning: list[GapAnalysisItem]
    missing: list[GapAnalysisItem]
    progress_percent: float
    estimated_remaining_hours: int | None = None
    match_percent: float | None = None  # alias for progress_percent (API contracts)


class TrajectoryWeekItem(BaseModel):
    skill: SkillBrief
    hours: int
    resources: list[ResourceBrief] = Field(default_factory=list)
    status: PlanItemStatus = PlanItemStatus.PLANNED
    # id сохранённого пункта плана — нужен для PATCH /me/plan/items/{item_id}
    item_id: uuid.UUID | None = None
    # навык не влез в неделю целиком — это продолжение, часы перенесены вперёд
    continued: bool = False


class PlanItemUpdate(BaseModel):
    status: PlanItemStatus


class PlanItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    plan_id: uuid.UUID
    skill_id: uuid.UUID
    week_number: int
    estimated_hours: int
    position: int
    status: PlanItemStatus


class TrajectoryWeek(BaseModel):
    week: int
    title: str
    items: list[TrajectoryWeekItem] = Field(default_factory=list)
    # backward-compat
    skills: list[SkillBrief] = Field(default_factory=list)
    estimated_hours: int = 0
    focus: str = ""


class TrajectoryResponse(BaseModel):
    profession_id: uuid.UUID
    profession_title: str
    level: str | None = None
    hours_per_week: int
    total_weeks: int
    current_week: int = 1
    weeks: list[TrajectoryWeek]
    what_to_do_this_week: list[TrajectoryWeekItem] = Field(default_factory=list)


class DashboardKpi(BaseModel):
    mastered_count: int = 0
    learning_count: int = 0
    total_skills: int = 0
    progress_percent: float = 0.0
    estimated_remaining_hours: int | None = None
    hours_per_week: int | None = None
    level: str | None = None
    target_profession_title: str | None = None


class DashboardNextStep(BaseModel):
    skill: SkillBrief
    reason: str = ""
    resources: list[ResourceBrief] = Field(default_factory=list)


class DashboardProgressPoint(BaseModel):
    """История прогресса: доля освоенных навыков на конец недели."""

    label: str
    value: float
    mastered: int


class DashboardAchievement(BaseModel):
    kind: Literal["check", "time", "flag"]
    date: str
    text: str


class DashboardDayHours(BaseModel):
    day: str
    hours: float = 0.0
    current: bool = False


class DashboardWeekActivity(BaseModel):
    label: str
    days: list[DashboardDayHours] = Field(default_factory=list)
    hours_done: float = 0.0
    hours_goal: int = 0


class DashboardResponse(BaseModel):
    kpi: DashboardKpi
    next_steps: list[DashboardNextStep] = Field(default_factory=list)
    status_breakdown: dict[str, int] = Field(default_factory=dict)
    current_week_focus: str | None = None
    progress_history: list[DashboardProgressPoint] = Field(default_factory=list)
    recent_achievements: list[DashboardAchievement] = Field(default_factory=list)
    week_activity: DashboardWeekActivity | None = None

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Level, UserRole
from app.schemas.auth import Name
from app.schemas.profession import ProfessionBrief


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    role: UserRole
    level: Level | None
    hours_per_week: int | None
    onboarding_completed: bool
    is_email_verified: bool
    target_profession: ProfessionBrief | None


class UserUpdate(BaseModel):
    name: Name | None = None
    level: Level | None = None
    hours_per_week: int | None = Field(default=None, ge=1, le=40)
    target_profession_id: uuid.UUID | None = None
    # Только true: завершить онбординг можно, сбросить нельзя
    onboarding_completed: Literal[True] | None = None
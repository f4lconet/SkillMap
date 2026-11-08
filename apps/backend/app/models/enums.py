from enum import StrEnum

from sqlalchemy import Enum


class UserRole(StrEnum):
    STUDENT = "student"
    EDITOR = "editor"


class Level(StrEnum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ProfessionStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"


class SkillStatus(StrEnum):
    NOT_STARTED = "not_started"
    LEARNING = "learning"
    MASTERED = "mastered"
    SKIPPED = "skipped"


class DependencyType(StrEnum):
    REQUIRED = "required"
    RECOMMENDED = "recommended"


def _values(enum_cls) -> list[str]:
    return [m.value for m in enum_cls]


user_role_type = Enum(UserRole, name="user_role", values_callable=_values)
level_type = Enum(Level, name="level", values_callable=_values)
profession_status_type = Enum(
    ProfessionStatus, name="profession_status", values_callable=_values
)
dependency_type_type = Enum(
    DependencyType, name="dependency_type", values_callable=_values
)

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TimestampMixin
from app.models.enums import Level, ProfessionStatus, level_type, profession_status_type


class Profession(Base, IdMixin, TimestampMixin):
    __tablename__ = "professions"

    slug: Mapped[str] = mapped_column(String(100), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    direction: Mapped[str] = mapped_column(String(100), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    short_description: Mapped[str] = mapped_column(String(300), default="")
    tasks: Mapped[list] = mapped_column(JSONB, default=list)
    suits_if: Mapped[list] = mapped_column(JSONB, default=list)
    start_hint: Mapped[str] = mapped_column(Text, default="")
    is_priority: Mapped[bool] = mapped_column(Boolean, default=False)
    entry_level: Mapped[Level | None] = mapped_column(level_type, nullable=True)
    status: Mapped[ProfessionStatus] = mapped_column(
        profession_status_type, default=ProfessionStatus.DRAFT
    )
    # С недели 2 пересчитывается по profession_skills; пока из seed
    skills_count: Mapped[int] = mapped_column(Integer, default=0)
    estimated_weeks: Mapped[int] = mapped_column(Integer, default=0)
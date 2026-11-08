from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin
from app.models.enums import Level, ProfessionStatus, level_type, profession_status_type


class Profession(Base, IdMixin, TimestampMixin):
    __tablename__ = "professions"

    slug: Mapped[str] = mapped_column(String(100), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    # id направления из справочника (data-ai, development, …)
    direction_id: Mapped[str | None] = mapped_column(
        String(50), ForeignKey("directions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # legacy-поле для отображения (можно заполнять из Direction.title)
    direction: Mapped[str] = mapped_column(String(100), index=True, default="")
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
    skills_count: Mapped[int] = mapped_column(Integer, default=0)
    estimated_weeks: Mapped[int] = mapped_column(Integer, default=0)
    # true только если граф навыков готов (data-scientist, fullstack, ux-ui)
    skills_ready: Mapped[bool] = mapped_column(Boolean, default=False)

    skill_links: Mapped[list["ProfessionSkill"]] = relationship(  # noqa: F821
        "ProfessionSkill",
        back_populates="profession",
        cascade="all, delete-orphan",
        order_by="ProfessionSkill.position",
    )

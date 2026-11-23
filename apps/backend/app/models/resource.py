"""Ресурсы (курсы, книги, проекты) и планы обучения — неделя 3."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin, utcnow


class Resource(Base, IdMixin, TimestampMixin):
    """Рекомендуемый ресурс, привязанный к навыку."""

    __tablename__ = "resources"

    skill_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), index=True
    )
    # Названия из контента аналитика бывают длинными (до ~350 символов)
    title: Mapped[str] = mapped_column(String(500))
    url: Mapped[str] = mapped_column(String(1000), default="")
    resource_type: Mapped[str] = mapped_column(
        String(30), default="course"
    )  # course | book | project | article | video | docs
    is_free: Mapped[bool] = mapped_column(Boolean, default=True)
    provider: Mapped[str] = mapped_column(String(100), default="")
    lang: Mapped[str] = mapped_column(String(8), default="ru")
    description: Mapped[str] = mapped_column(Text, default="")
    estimated_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    # Редакторский статус: draft | published | needs_review
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    # Состояние ссылки: unknown | ok | broken
    link_status: Mapped[str] = mapped_column(String(20), default="unknown")
    last_checked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    skill: Mapped["Skill"] = relationship(  # noqa: F821
        back_populates="resources", lazy="joined"
    )


class Plan(Base, IdMixin, TimestampMixin):
    """Персональный план обучения пользователя по профессии."""

    __tablename__ = "plans"
    __table_args__ = (
        UniqueConstraint("user_id", "profession_id", name="uq_user_profession_plan"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    profession_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("professions.id", ondelete="CASCADE"), index=True
    )
    hours_per_week: Mapped[int] = mapped_column(Integer, default=6)
    total_weeks: Mapped[int] = mapped_column(Integer, default=0)
    current_week: Mapped[int] = mapped_column(Integer, default=1)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    items: Mapped[list[PlanItem]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="PlanItem.week_number, PlanItem.position",
    )


class PlanItem(Base, IdMixin, TimestampMixin):
    """Элемент плана: навык в конкретной неделе."""

    __tablename__ = "plan_items"

    plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("plans.id", ondelete="CASCADE"), index=True
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), index=True
    )
    week_number: Mapped[int] = mapped_column(Integer, index=True)
    estimated_hours: Mapped[int] = mapped_column(Integer, default=4)
    position: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(
        String(20), default="planned"
    )  # planned | in_progress | done

    plan: Mapped[Plan] = relationship(back_populates="items")
    skill: Mapped["Skill"] = relationship(lazy="joined")  # noqa: F821

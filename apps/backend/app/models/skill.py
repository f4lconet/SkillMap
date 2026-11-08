"""Модели навыков — неделя 2 + выравнивание под skillmap_content.json."""
from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin
from app.models.enums import DependencyType, dependency_type_type


class Skill(Base, IdMixin, TimestampMixin):
    """Узел карты навыков. id из контента = slug (git-cli, py-basics, …)."""

    __tablename__ = "skills"

    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(100), default="", index=True)
    # Сложность 1–5 (как в контенте аналитика)
    difficulty: Mapped[int] = mapped_column(Integer, default=1)
    # Глубина в графе по обязательным связям (0 = входной)
    layer: Mapped[int] = mapped_column(Integer, default=0)
    estimated_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)

    profession_links: Mapped[list[ProfessionSkill]] = relationship(
        back_populates="skill", cascade="all, delete-orphan"
    )
    # Исходящие: этот навык → зависит от prerequisite
    dependencies_out: Mapped[list[SkillDependency]] = relationship(
        back_populates="skill",
        foreign_keys="SkillDependency.skill_id",
        cascade="all, delete-orphan",
    )
    # Входящие: другие навыки зависят от этого
    dependencies_in: Mapped[list[SkillDependency]] = relationship(
        back_populates="prerequisite",
        foreign_keys="SkillDependency.prerequisite_id",
        cascade="all, delete-orphan",
    )


class SkillDependency(Base, IdMixin, TimestampMixin):
    """Ребро графа: prerequisite → skill (required | recommended)."""

    __tablename__ = "skill_dependencies"
    __table_args__ = (
        UniqueConstraint(
            "skill_id", "prerequisite_id", "dep_type", name="uq_skill_dep"
        ),
    )

    skill_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), index=True
    )
    prerequisite_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), index=True
    )
    dep_type: Mapped[DependencyType] = mapped_column(
        dependency_type_type, default=DependencyType.REQUIRED
    )

    skill: Mapped[Skill] = relationship(
        back_populates="dependencies_out", foreign_keys=[skill_id]
    )
    prerequisite: Mapped[Skill] = relationship(
        back_populates="dependencies_in", foreign_keys=[prerequisite_id]
    )


class ProfessionSkill(Base, IdMixin, TimestampMixin):
    """Навык входит в профессию (порядок на карте)."""

    __tablename__ = "profession_skills"
    __table_args__ = (
        UniqueConstraint("profession_id", "skill_id", name="uq_profession_skill"),
    )

    profession_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("professions.id", ondelete="CASCADE"), index=True
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer, default=0)
    is_core: Mapped[bool] = mapped_column(Boolean, default=True)

    skill: Mapped[Skill] = relationship(back_populates="profession_links", lazy="joined")
    profession: Mapped["Profession"] = relationship(  # noqa: F821
        back_populates="skill_links", lazy="joined"
    )


class UserSkill(Base, IdMixin, TimestampMixin):
    """Прогресс пользователя по навыку."""

    __tablename__ = "user_skills"
    __table_args__ = (
        UniqueConstraint("user_id", "skill_id", name="uq_user_skill"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), default="not_started", index=True
    )
    self_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

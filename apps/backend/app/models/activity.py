"""Журнал действий редакторов — обзор админки (неделя 6)."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, utcnow


class AdminEvent(Base, IdMixin):
    """Запись журнала: кто, что и когда изменил в контенте редакторской.

    Строка живёт дольше своей сущности: `profession_id`/`skill_id` обнуляются
    по `ON DELETE SET NULL`, а `entity_id` хранится без внешнего ключа, чтобы
    история правок оставалась читаемой после удаления профессии или навыка.
    """

    __tablename__ = "admin_events"

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    actor_name: Mapped[str] = mapped_column(String(200), default="")
    # profession | skill | dependency | resource
    entity_type: Mapped[str] = mapped_column(String(20), default="profession")
    entity_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    profession_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("professions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    skill_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("skills.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # created | updated | deleted | published | checked
    action: Mapped[str] = mapped_column(String(20), default="updated")
    title: Mapped[str] = mapped_column(String(300), default="")
    detail: Mapped[str] = mapped_column(Text, default="")

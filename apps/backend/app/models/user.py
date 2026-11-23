import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin
from app.models.enums import Level, UserRole, level_type, user_role_type
from app.models.profession import Profession


class User(Base, IdMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    # Публичный идентификатор: /u/{username}
    username: Mapped[str | None] = mapped_column(
        String(32), unique=True, index=True, nullable=True
    )
    # NULL: аккаунт через OAuth (позже)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(user_role_type, default=UserRole.STUDENT)
    level: Mapped[Level | None] = mapped_column(level_type, nullable=True)
    hours_per_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_profession_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("professions.id", ondelete="SET NULL"), nullable=True
    )
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    # Публичная ссылка на карту: /public/{share_token}
    share_token: Mapped[str | None] = mapped_column(
        String(64), unique=True, index=True, nullable=True
    )
    share_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    shared_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    target_profession: Mapped[Profession | None] = relationship(
        lazy="joined", foreign_keys=[target_profession_id]
    )
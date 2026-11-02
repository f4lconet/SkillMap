import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin
from app.models.enums import Level, UserRole, level_type, user_role_type
from app.models.profession import Profession


class User(Base, IdMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
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

    target_profession: Mapped[Profession | None] = relationship(lazy="joined")
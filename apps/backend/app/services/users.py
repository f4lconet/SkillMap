from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Profession, ProfessionStatus, User
from app.schemas.user import UserUpdate


async def update_profile(db: AsyncSession, user: User, data: UserUpdate) -> User:
    changes = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}

    if "target_profession_id" in changes:
        profession = await db.get(Profession, changes.pop("target_profession_id"))
        if profession is None or profession.status != ProfessionStatus.PUBLISHED:
            raise HTTPException(422, "Профессия не найдена")
        user.target_profession = profession

    for field, value in changes.items():
        setattr(user, field, value)

    if changes.get("onboarding_completed") and not (
        user.target_profession and user.level and user.hours_per_week
    ):
        await db.rollback()
        raise HTTPException(
            422,
            "Для завершения онбординга укажите цель, уровень и часы в неделю",
        )

    await db.commit()
    return user

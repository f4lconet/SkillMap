from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Profession, ProfessionStatus


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


async def list_professions(
    db: AsyncSession, q: str | None, direction: str | None, limit: int, offset: int
) -> tuple[list[Profession], int]:
    stmt = select(Profession).where(Profession.status == ProfessionStatus.PUBLISHED)
    if q:
        pattern = f"%{_escape_like(q.strip())}%"
        stmt = stmt.where(
            or_(
                Profession.title.ilike(pattern, escape="\\"),
                Profession.description.ilike(pattern, escape="\\"),
            )
        )
    if direction:
        stmt = stmt.where(Profession.direction == direction)

    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = await db.scalars(stmt.order_by(Profession.title).limit(limit).offset(offset))
    return list(rows), total or 0


async def list_directions(db: AsyncSession) -> list[str]:
    rows = await db.scalars(
        select(Profession.direction)
        .where(Profession.status == ProfessionStatus.PUBLISHED)
        .distinct()
        .order_by(Profession.direction)
    )
    return list(rows)

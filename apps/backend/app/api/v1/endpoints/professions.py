import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import DbSession
from app.models import Profession, ProfessionStatus
from app.schemas.profession import ProfessionDetail, ProfessionList
from app.services import professions as professions_service

router = APIRouter(prefix="/professions", tags=["professions"])


@router.get("", response_model=ProfessionList)
async def list_professions(
    db: DbSession,
    q: Annotated[str | None, Query(max_length=100)] = None,
    direction: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    items, total = await professions_service.list_professions(db, q, direction, limit, offset)
    return ProfessionList(items=items, total=total, limit=limit, offset=offset)


@router.get("/directions", response_model=list[str])
async def list_directions(db: DbSession):
    return await professions_service.list_directions(db)


@router.get("/{profession_id}", response_model=ProfessionDetail)
async def get_profession(profession_id: uuid.UUID, db: DbSession):
    profession = await db.get(Profession, profession_id)
    if profession is None or profession.status != ProfessionStatus.PUBLISHED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Профессия не найдена")
    return profession

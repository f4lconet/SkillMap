import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession, OptionalUser
from app.schemas.skill import (
    GapAnalysisResponse,
    ProfessionMapResponse,
    TrajectoryResponse,
    UserSkillRead,
    UserSkillUpdate,
)
from app.services import skills as skills_service

router = APIRouter(tags=["skills"])


@router.get(
    "/professions/{profession_id}/map",
    response_model=ProfessionMapResponse,
    summary="Карта навыков профессии (гость + пользователь, locked по required)",
)
async def profession_map(
    profession_id: uuid.UUID,
    db: DbSession,
    user: OptionalUser = None,
):
    return await skills_service.get_profession_map(db, profession_id, user=user)


@router.get(
    "/me/skills",
    response_model=list[UserSkillRead],
    summary="Все отмеченные навыки текущего пользователя",
)
async def my_skills(user: CurrentUser, db: DbSession):
    rows = await skills_service.list_user_skills(db, user)
    return [
        UserSkillRead(skill_id=r.skill_id, status=r.status, self_score=r.self_score)
        for r in rows
    ]


@router.put(
    "/me/skills/{skill_id}",
    response_model=UserSkillRead,
    summary="Отметить статус навыка",
)
async def update_my_skill(
    skill_id: uuid.UUID,
    data: UserSkillUpdate,
    user: CurrentUser,
    db: DbSession,
):
    us = await skills_service.set_user_skill(db, user, skill_id, data)
    return UserSkillRead(
        skill_id=us.skill_id, status=us.status, self_score=us.self_score
    )


@router.get(
    "/me/gap/{profession_id}",
    response_model=GapAnalysisResponse,
    summary="Gap Analysis",
)
async def gap_analysis(profession_id: uuid.UUID, user: CurrentUser, db: DbSession):
    return await skills_service.gap_analysis(db, user, profession_id)


@router.get(
    "/me/trajectory/{profession_id}",
    response_model=TrajectoryResponse,
    summary="Персональная траектория по неделям",
)
async def trajectory(profession_id: uuid.UUID, user: CurrentUser, db: DbSession):
    return await skills_service.build_trajectory(db, user, profession_id)

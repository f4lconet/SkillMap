import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession, OptionalUser
from app.schemas.skill import (
    DashboardResponse,
    GapAnalysisResponse,
    ProfessionMapResponse,
    TrajectoryResponse,
    UserSkillBulkRequest,
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


# Alias из API contracts
@router.get(
    "/professions/{profession_id}/graph",
    response_model=ProfessionMapResponse,
    summary="Алиас карты (graph = map)",
    include_in_schema=False,
)
async def profession_graph(
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


@router.post(
    "/me/skills/bulk",
    response_model=list[UserSkillRead],
    summary="Массовая отметка навыков (онбординг)",
)
async def bulk_my_skills(
    data: UserSkillBulkRequest,
    user: CurrentUser,
    db: DbSession,
):
    rows = await skills_service.bulk_set_user_skills(db, user, data.skills)
    return [
        UserSkillRead(skill_id=r.skill_id, status=r.status, self_score=r.self_score)
        for r in rows
    ]


@router.get(
    "/me/gap",
    response_model=GapAnalysisResponse,
    summary="Gap Analysis по целевой профессии пользователя",
)
async def gap_me(user: CurrentUser, db: DbSession):
    return await skills_service.gap_analysis(db, user)


@router.get(
    "/me/gap/{profession_id}",
    response_model=GapAnalysisResponse,
    summary="Gap Analysis по указанной профессии",
)
async def gap_analysis(profession_id: uuid.UUID, user: CurrentUser, db: DbSession):
    return await skills_service.gap_analysis(db, user, profession_id)


@router.get(
    "/me/dashboard",
    response_model=DashboardResponse,
    summary="Дашборд прогресса: KPI + ближайшие шаги",
)
async def dashboard(user: CurrentUser, db: DbSession):
    return await skills_service.dashboard(db, user)


@router.get(
    "/me/plan",
    response_model=TrajectoryResponse,
    summary="Текущий персональный план (сохраняется при первом запросе)",
)
async def get_plan(user: CurrentUser, db: DbSession):
    return await skills_service.get_or_build_plan(db, user)


@router.post(
    "/me/plan/recalculate",
    response_model=TrajectoryResponse,
    summary="Пересчёт траектории после отметок / смены часов",
)
async def recalculate_plan(user: CurrentUser, db: DbSession):
    return await skills_service.recalculate_plan(db, user)


@router.get(
    "/me/trajectory/{profession_id}",
    response_model=TrajectoryResponse,
    summary="Траектория по профессии (без сохранения, on-the-fly)",
)
async def trajectory(profession_id: uuid.UUID, user: CurrentUser, db: DbSession):
    return await skills_service.build_trajectory(db, user, profession_id, persist=False)

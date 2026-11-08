"""Сервис навыков, карты, Gap, траектории — под skillmap_content.json."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    DependencyType,
    Profession,
    ProfessionSkill,
    ProfessionStatus,
    Skill,
    SkillDependency,
    SkillStatus,
    User,
    UserSkill,
)
from app.schemas.skill import (
    GapAnalysisItem,
    GapAnalysisResponse,
    PrerequisiteRef,
    ProfessionMapResponse,
    ProfessionSkillNode,
    SkillBrief,
    TrajectoryResponse,
    TrajectoryWeek,
    UserSkillUpdate,
)

DONE = {SkillStatus.MASTERED.value, SkillStatus.SKIPPED.value}


async def get_profession_or_404(db: AsyncSession, profession_id: uuid.UUID) -> Profession:
    profession = await db.get(Profession, profession_id)
    if profession is None or profession.status != ProfessionStatus.PUBLISHED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Профессия не найдена")
    return profession


async def get_skill_or_404(db: AsyncSession, skill_id: uuid.UUID) -> Skill:
    skill = await db.get(Skill, skill_id)
    if skill is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Навык не найден")
    return skill


def _brief(skill: Skill) -> SkillBrief:
    return SkillBrief(
        id=skill.id,
        slug=skill.slug,
        title=skill.title,
        category=skill.category or "",
        difficulty=skill.difficulty or 1,
        layer=skill.layer or 0,
        estimated_hours=skill.estimated_hours,
    )


async def _deps_for_skills(
    db: AsyncSession, skill_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[SkillDependency]]:
    if not skill_ids:
        return {}
    rows = await db.scalars(
        select(SkillDependency)
        .where(SkillDependency.skill_id.in_(skill_ids))
        .options(selectinload(SkillDependency.prerequisite))
    )
    result: dict[uuid.UUID, list[SkillDependency]] = {sid: [] for sid in skill_ids}
    for dep in rows:
        result.setdefault(dep.skill_id, []).append(dep)
    return result


def _is_locked(
    skill_id: uuid.UUID,
    deps_map: dict[uuid.UUID, list[SkillDependency]],
    user_status: dict[uuid.UUID, str],
) -> bool:
    for dep in deps_map.get(skill_id, []):
        if dep.dep_type != DependencyType.REQUIRED:
            continue
        st = user_status.get(dep.prerequisite_id, SkillStatus.NOT_STARTED.value)
        if st not in DONE:
            return True
    return False


def _to_node(
    ps: ProfessionSkill,
    deps: list[SkillDependency],
    user_status: str | None,
    self_score: int | None,
    locked: bool,
) -> ProfessionSkillNode:
    skill = ps.skill
    required: list[PrerequisiteRef] = []
    recommended: list[PrerequisiteRef] = []
    for dep in deps:
        pr = dep.prerequisite
        ref = PrerequisiteRef(
            id=pr.id, slug=pr.slug, title=pr.title, dep_type=dep.dep_type
        )
        if dep.dep_type == DependencyType.REQUIRED:
            required.append(ref)
        else:
            recommended.append(ref)
    return ProfessionSkillNode(
        id=skill.id,
        slug=skill.slug,
        title=skill.title,
        description=skill.description or "",
        category=skill.category or "",
        difficulty=skill.difficulty or 1,
        layer=skill.layer or 0,
        estimated_hours=skill.estimated_hours,
        position=ps.position,
        is_core=ps.is_core,
        required_prerequisites=required,
        recommended_prerequisites=recommended,
        user_status=SkillStatus(user_status) if user_status else None,
        self_score=self_score,
        locked=locked,
    )


async def get_profession_map(
    db: AsyncSession,
    profession_id: uuid.UUID,
    user: User | None = None,
) -> ProfessionMapResponse:
    profession = await get_profession_or_404(db, profession_id)

    links = list(
        await db.scalars(
            select(ProfessionSkill)
            .where(ProfessionSkill.profession_id == profession_id)
            .options(selectinload(ProfessionSkill.skill))
            .order_by(ProfessionSkill.position)
        )
    )
    skill_ids = [ps.skill_id for ps in links]
    deps_map = await _deps_for_skills(db, skill_ids)

    user_map: dict[uuid.UUID, UserSkill] = {}
    status_map: dict[uuid.UUID, str] = {}
    if user and skill_ids:
        us_rows = await db.scalars(
            select(UserSkill).where(
                UserSkill.user_id == user.id, UserSkill.skill_id.in_(skill_ids)
            )
        )
        for us in us_rows:
            user_map[us.skill_id] = us
            status_map[us.skill_id] = us.status

    nodes = []
    mastered = learning = 0
    for ps in links:
        us = user_map.get(ps.skill_id)
        st = us.status if us else None
        score = us.self_score if us else None
        locked = _is_locked(ps.skill_id, deps_map, status_map) if user else False
        nodes.append(_to_node(ps, deps_map.get(ps.skill_id, []), st, score, locked))
        if st == SkillStatus.MASTERED.value:
            mastered += 1
        elif st == SkillStatus.LEARNING.value:
            learning += 1

    total = len(nodes)
    progress = round((mastered / total) * 100, 1) if total else 0.0

    return ProfessionMapResponse(
        profession_id=profession.id,
        profession_title=profession.title,
        skills_ready=profession.skills_ready,
        skills=nodes,
        total_skills=total,
        mastered_count=mastered,
        learning_count=learning,
        progress_percent=progress,
    )


async def set_user_skill(
    db: AsyncSession, user: User, skill_id: uuid.UUID, data: UserSkillUpdate
) -> UserSkill:
    await get_skill_or_404(db, skill_id)
    us = await db.scalar(
        select(UserSkill).where(
            UserSkill.user_id == user.id, UserSkill.skill_id == skill_id
        )
    )
    if us is None:
        us = UserSkill(user_id=user.id, skill_id=skill_id)
        db.add(us)
    us.status = data.status.value
    us.self_score = data.self_score
    await db.commit()
    await db.refresh(us)
    return us


async def list_user_skills(db: AsyncSession, user: User) -> list[UserSkill]:
    return list(await db.scalars(select(UserSkill).where(UserSkill.user_id == user.id)))


async def gap_analysis(
    db: AsyncSession, user: User, profession_id: uuid.UUID
) -> GapAnalysisResponse:
    profession = await get_profession_or_404(db, profession_id)
    links = list(
        await db.scalars(
            select(ProfessionSkill)
            .where(ProfessionSkill.profession_id == profession_id)
            .options(selectinload(ProfessionSkill.skill))
            .order_by(ProfessionSkill.position)
        )
    )
    skill_ids = [ps.skill_id for ps in links]
    deps_map = await _deps_for_skills(db, skill_ids)

    us_rows = await db.scalars(
        select(UserSkill).where(
            UserSkill.user_id == user.id,
            UserSkill.skill_id.in_(skill_ids or [uuid.uuid4()]),
        )
    )
    user_map = {us.skill_id: us for us in us_rows}
    status_map = {us.skill_id: us.status for us in us_rows}

    mastered: list[GapAnalysisItem] = []
    learning: list[GapAnalysisItem] = []
    missing: list[GapAnalysisItem] = []
    remaining_hours = 0

    for ps in links:
        skill = ps.skill
        us = user_map.get(ps.skill_id)
        st = SkillStatus(us.status) if us else SkillStatus.NOT_STARTED
        locked = _is_locked(ps.skill_id, deps_map, status_map)
        item = GapAnalysisItem(
            skill=_brief(skill),
            status=st,
            is_core=ps.is_core,
            position=ps.position,
            locked=locked,
        )
        if st == SkillStatus.MASTERED:
            mastered.append(item)
        elif st == SkillStatus.LEARNING:
            learning.append(item)
            if skill.estimated_hours:
                remaining_hours += skill.estimated_hours
        else:
            missing.append(item)
            if skill.estimated_hours:
                remaining_hours += skill.estimated_hours

    total = len(links)
    progress = round((len(mastered) / total) * 100, 1) if total else 0.0
    return GapAnalysisResponse(
        profession_id=profession.id,
        profession_title=profession.title,
        total_skills=total,
        mastered=mastered,
        learning=learning,
        missing=missing,
        progress_percent=progress,
        estimated_remaining_hours=remaining_hours or None,
    )


async def build_trajectory(
    db: AsyncSession, user: User, profession_id: uuid.UUID
) -> TrajectoryResponse:
    profession = await get_profession_or_404(db, profession_id)
    hours_per_week = user.hours_per_week or 6

    links = list(
        await db.scalars(
            select(ProfessionSkill)
            .where(ProfessionSkill.profession_id == profession_id)
            .options(selectinload(ProfessionSkill.skill))
            .order_by(ProfessionSkill.position)
        )
    )
    us_rows = await db.scalars(
        select(UserSkill).where(
            UserSkill.user_id == user.id,
            UserSkill.skill_id.in_([ps.skill_id for ps in links] or [uuid.uuid4()]),
        )
    )
    mastered_ids = {
        us.skill_id for us in us_rows if us.status in DONE
    }
    remaining = [ps for ps in links if ps.skill_id not in mastered_ids]

    weeks: list[TrajectoryWeek] = []
    current_skills: list[SkillBrief] = []
    current_hours = 0
    week_num = 1
    max_h = max(hours_per_week, 1)

    def flush():
        nonlocal current_skills, current_hours, week_num
        if not current_skills:
            return
        weeks.append(
            TrajectoryWeek(
                week=week_num,
                title=f"Неделя {week_num}",
                skills=list(current_skills),
                estimated_hours=current_hours,
                focus=current_skills[0].title if current_skills else "",
            )
        )
        week_num += 1
        current_skills = []
        current_hours = 0

    for ps in remaining:
        skill = ps.skill
        h = skill.estimated_hours or 4
        brief = _brief(skill)
        if current_hours + h > max_h and current_skills:
            flush()
        current_skills.append(brief)
        current_hours += h
        if current_hours >= max_h:
            flush()
    flush()
    if len(weeks) > 24:
        weeks = weeks[:24]

    return TrajectoryResponse(
        profession_id=profession.id,
        profession_title=profession.title,
        level=user.level.value if user.level else None,
        hours_per_week=hours_per_week,
        total_weeks=len(weeks),
        weeks=weeks,
    )

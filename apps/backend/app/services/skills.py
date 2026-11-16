"""Сервис навыков, карты, Gap, траектории, дашборда — неделя 2–3."""
from __future__ import annotations

import uuid
from collections import defaultdict, deque
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    DependencyType,
    Plan,
    PlanItem,
    PlanItemStatus,
    Profession,
    ProfessionSkill,
    ProfessionStatus,
    Resource,
    Skill,
    SkillDependency,
    SkillStatus,
    User,
    UserSkill,
)
from app.schemas.skill import (
    DashboardKpi,
    DashboardNextStep,
    DashboardResponse,
    GapAnalysisItem,
    GapAnalysisResponse,
    PlanItemUpdate,
    PrerequisiteRef,
    ProfessionMapResponse,
    ProfessionSkillNode,
    ResourceBrief,
    SkillBrief,
    TrajectoryResponse,
    TrajectoryWeek,
    TrajectoryWeekItem,
    UserSkillBulkItem,
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


def _require_target(user: User) -> uuid.UUID:
    if user.target_profession_id is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Сначала выберите целевую профессию в профиле / онбординге",
        )
    return user.target_profession_id


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


def _resource_brief(r: Resource) -> ResourceBrief:
    return ResourceBrief(
        id=r.id,
        title=r.title,
        url=r.url or "",
        resource_type=r.resource_type or "course",
        is_free=r.is_free,
        provider=r.provider or "",
        estimated_hours=r.estimated_hours,
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


async def _resources_for_skills(
    db: AsyncSession, skill_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[Resource]]:
    if not skill_ids:
        return {}
    rows = await db.scalars(
        select(Resource)
        .where(Resource.skill_id.in_(skill_ids))
        .order_by(Resource.position)
    )
    result: dict[uuid.UUID, list[Resource]] = {sid: [] for sid in skill_ids}
    for r in rows:
        result.setdefault(r.skill_id, []).append(r)
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


def _topo_sort(
    skill_ids: list[uuid.UUID],
    deps_map: dict[uuid.UUID, list[SkillDependency]],
    prefer_order: dict[uuid.UUID, int] | None = None,
) -> list[uuid.UUID]:
    """Топологическая сортировка по required-зависимостям. Стабильна по position."""
    id_set = set(skill_ids)
    indeg: dict[uuid.UUID, int] = {sid: 0 for sid in skill_ids}
    graph: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)

    for sid in skill_ids:
        for dep in deps_map.get(sid, []):
            if dep.dep_type != DependencyType.REQUIRED:
                continue
            if dep.prerequisite_id not in id_set:
                continue
            graph[dep.prerequisite_id].append(sid)
            indeg[sid] += 1

    order_key = prefer_order or {}
    ready = sorted(
        [sid for sid, d in indeg.items() if d == 0],
        key=lambda x: order_key.get(x, 10_000),
    )
    q = deque(ready)
    result: list[uuid.UUID] = []

    while q:
        u = q.popleft()
        result.append(u)
        next_nodes = sorted(graph[u], key=lambda x: order_key.get(x, 10_000))
        for v in next_nodes:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)

    # Если цикл — докидываем оставшиеся в исходном порядке
    if len(result) < len(skill_ids):
        seen = set(result)
        for sid in skill_ids:
            if sid not in seen:
                result.append(sid)
    return result


def _to_node(
    ps: ProfessionSkill,
    deps: list[SkillDependency],
    user_status: str | None,
    self_score: int | None,
    locked: bool,
    resources: list[Resource] | None = None,
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
        resources=[_resource_brief(r) for r in (resources or [])],
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
    res_map = await _resources_for_skills(db, skill_ids)

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
        nodes.append(
            _to_node(
                ps,
                deps_map.get(ps.skill_id, []),
                st,
                score,
                locked,
                res_map.get(ps.skill_id),
            )
        )
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


async def bulk_set_user_skills(
    db: AsyncSession, user: User, items: list[UserSkillBulkItem]
) -> list[UserSkill]:
    skill_ids = [i.skill_id for i in items]
    existing = {
        us.skill_id: us
        for us in await db.scalars(
            select(UserSkill).where(
                UserSkill.user_id == user.id, UserSkill.skill_id.in_(skill_ids)
            )
        )
    }
    result: list[UserSkill] = []
    for item in items:
        await get_skill_or_404(db, item.skill_id)
        us = existing.get(item.skill_id)
        if us is None:
            us = UserSkill(user_id=user.id, skill_id=item.skill_id)
            db.add(us)
            existing[item.skill_id] = us
        us.status = item.status.value
        us.self_score = item.self_score
        result.append(us)
    await db.commit()
    for us in result:
        await db.refresh(us)
    return result


async def list_user_skills(db: AsyncSession, user: User) -> list[UserSkill]:
    return list(await db.scalars(select(UserSkill).where(UserSkill.user_id == user.id)))


async def gap_analysis(
    db: AsyncSession, user: User, profession_id: uuid.UUID | None = None
) -> GapAnalysisResponse:
    pid = profession_id or _require_target(user)
    profession = await get_profession_or_404(db, pid)
    links = list(
        await db.scalars(
            select(ProfessionSkill)
            .where(ProfessionSkill.profession_id == pid)
            .options(selectinload(ProfessionSkill.skill))
            .order_by(ProfessionSkill.position)
        )
    )
    skill_ids = [ps.skill_id for ps in links]
    deps_map = await _deps_for_skills(db, skill_ids)
    prefer = {ps.skill_id: ps.position for ps in links}
    ordered_ids = _topo_sort(skill_ids, deps_map, prefer)
    priority_map = {sid: i + 1 for i, sid in enumerate(ordered_ids)}

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
            priority=priority_map.get(ps.skill_id),
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

    # missing в порядке приоритета (топосортировка)
    missing.sort(key=lambda x: x.priority or 9999)

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
        match_percent=progress,
        estimated_remaining_hours=remaining_hours or None,
    )


async def _build_week_items(
    remaining_links: list[ProfessionSkill],
    deps_map: dict[uuid.UUID, list[SkillDependency]],
    res_map: dict[uuid.UUID, list[Resource]],
    hours_per_week: int,
) -> list[TrajectoryWeek]:
    """Раскладывает навыки по неделям ровно по hours_per_week часов.

    Навык, который не влезает в остаток недели, делится: оставшиеся часы
    переносятся на следующую неделю. Свободное место недели добирается
    часами следующего навыка, поэтому неделя всегда заполнена целиком.
    """
    prefer = {ps.skill_id: ps.position for ps in remaining_links}
    ordered_ids = _topo_sort(
        [ps.skill_id for ps in remaining_links], deps_map, prefer
    )
    by_id = {ps.skill_id: ps for ps in remaining_links}

    weeks: list[TrajectoryWeek] = []
    current_items: list[TrajectoryWeekItem] = []
    current_hours = 0
    week_num = 1
    max_h = max(hours_per_week, 1)

    def flush() -> None:
        nonlocal current_items, current_hours, week_num
        if not current_items:
            return
        skills = [it.skill for it in current_items]
        weeks.append(
            TrajectoryWeek(
                week=week_num,
                title=f"Неделя {week_num}",
                items=list(current_items),
                skills=skills,
                estimated_hours=current_hours,
                focus=skills[0].title if skills else "",
            )
        )
        week_num += 1
        current_items = []
        current_hours = 0

    for sid in ordered_ids:
        ps = by_id[sid]
        skill = ps.skill
        brief = _brief(skill)
        resources = [_resource_brief(r) for r in res_map.get(sid, [])]
        left = skill.estimated_hours or 4
        chunk = 0
        while left > 0:
            if current_hours >= max_h:
                flush()
            take = min(max_h - current_hours, left)
            current_items.append(
                TrajectoryWeekItem(
                    skill=brief,
                    hours=take,
                    resources=resources,
                    continued=chunk > 0,
                )
            )
            current_hours += take
            left -= take
            chunk += 1
            if current_hours >= max_h:
                flush()
    flush()
    return weeks


async def build_trajectory(
    db: AsyncSession,
    user: User,
    profession_id: uuid.UUID | None = None,
    *,
    persist: bool = False,
    keep_done_skill_ids: set[uuid.UUID] | None = None,
) -> TrajectoryResponse:
    pid = profession_id or _require_target(user)
    profession = await get_profession_or_404(db, pid)
    hours_per_week = user.hours_per_week or 6

    links = list(
        await db.scalars(
            select(ProfessionSkill)
            .where(ProfessionSkill.profession_id == pid)
            .options(selectinload(ProfessionSkill.skill))
            .order_by(ProfessionSkill.position)
        )
    )
    skill_ids = [ps.skill_id for ps in links]
    deps_map = await _deps_for_skills(db, skill_ids)
    res_map = await _resources_for_skills(db, skill_ids)

    us_rows = await db.scalars(
        select(UserSkill).where(
            UserSkill.user_id == user.id,
            UserSkill.skill_id.in_(skill_ids or [uuid.uuid4()]),
        )
    )
    mastered_ids = {us.skill_id for us in us_rows if us.status in DONE}
    # Уже закрытые пункты плана остаются в неделях, чтобы прогресс не пропадал.
    keep = keep_done_skill_ids or set()
    remaining = [
        ps
        for ps in links
        if ps.skill_id not in mastered_ids or ps.skill_id in keep
    ]

    weeks = await _build_week_items(remaining, deps_map, res_map, hours_per_week)
    what = weeks[0].items if weeks else []

    if persist:
        await _persist_plan(db, user, profession, hours_per_week, weeks)

    return TrajectoryResponse(
        profession_id=profession.id,
        profession_title=profession.title,
        level=user.level.value if user.level else None,
        hours_per_week=hours_per_week,
        total_weeks=len(weeks),
        current_week=1,
        weeks=weeks,
        what_to_do_this_week=what,
    )


async def _persist_plan(
    db: AsyncSession,
    user: User,
    profession: Profession,
    hours_per_week: int,
    weeks: list[TrajectoryWeek],
) -> Plan:
    plan = await db.scalar(
        select(Plan)
        .where(Plan.user_id == user.id, Plan.profession_id == profession.id)
        .options(selectinload(Plan.items))
    )
    now = datetime.now(UTC)
    if plan is None:
        plan = Plan(
            user_id=user.id,
            profession_id=profession.id,
            hours_per_week=hours_per_week,
            total_weeks=len(weeks),
            current_week=1,
            generated_at=now,
        )
        db.add(plan)
        await db.flush()
        existing: dict[uuid.UUID, list[PlanItem]] = {}
    else:
        plan.hours_per_week = hours_per_week
        plan.generated_at = now
        # Навык может занимать несколько недель, поэтому храним все его части
        # по порядку — по ним же восстанавливаем статусы.
        existing = defaultdict(list)
        for it in sorted(plan.items, key=lambda x: (x.week_number, x.position)):
            existing[it.skill_id].append(it)

    plan.total_weeks = len(weeks)
    used: dict[uuid.UUID, int] = defaultdict(int)
    week_status: list[tuple[int, str]] = []
    # Upsert вместо delete+insert: статусы закрытых пунктов не теряются.
    for week in weeks:
        for pos, item in enumerate(week.items):
            skill_id = item.skill.id
            chunk = used[skill_id]
            used[skill_id] = chunk + 1
            chunks = existing.get(skill_id, [])
            old = chunks[chunk] if chunk < len(chunks) else None
            if old is not None:
                old.week_number = week.week
                old.position = pos
                old.estimated_hours = item.hours
                item.status = _as_plan_status(old.status)
            else:
                db.add(
                    PlanItem(
                        plan_id=plan.id,
                        skill_id=skill_id,
                        week_number=week.week,
                        estimated_hours=item.hours,
                        position=pos,
                        status=PlanItemStatus.PLANNED.value,
                    )
                )
                item.status = PlanItemStatus.PLANNED
            week_status.append((week.week, item.status.value))

    for skill_id, chunks in existing.items():
        for old in chunks[used[skill_id] :]:
            await db.delete(old)

    plan.current_week = _current_week_from_pairs(week_status)
    await db.commit()
    await db.refresh(plan)
    return plan


def _as_plan_status(value: str | PlanItemStatus) -> PlanItemStatus:
    try:
        return PlanItemStatus(value)
    except ValueError:
        return PlanItemStatus.PLANNED


def _current_week_from_pairs(pairs: list[tuple[int, str]]) -> int:
    pending = [week for week, st in pairs if st != PlanItemStatus.DONE.value]
    if pending:
        return min(pending)
    return max((week for week, _ in pairs), default=1)


def _resolve_current_week(items: list[PlanItem]) -> int:
    """Текущая неделя — первая, где есть незакрытые пункты."""
    pending = [
        it.week_number
        for it in items
        if _as_plan_status(it.status) != PlanItemStatus.DONE
    ]
    if pending:
        return min(pending)
    return max((it.week_number for it in items), default=1)


def _plan_matches_hours(plan: Plan, hours_per_week: int) -> bool:
    """Каждая неделя, кроме последней, должна быть заполнена ровно по норме.

    Нужно для старых планов, собранных без дробления навыков по неделям.
    """
    by_week: dict[int, int] = defaultdict(int)
    for it in plan.items:
        by_week[it.week_number] += it.estimated_hours
    if not by_week:
        return False
    last_week = max(by_week)
    for week, total in by_week.items():
        if week == last_week:
            if total <= 0 or total > hours_per_week:
                return False
        elif total != hours_per_week:
            return False
    return True


async def _load_plan(
    db: AsyncSession, user_id: uuid.UUID, profession_id: uuid.UUID
) -> Plan | None:
    return await db.scalar(
        select(Plan)
        .where(Plan.user_id == user_id, Plan.profession_id == profession_id)
        .options(selectinload(Plan.items).selectinload(PlanItem.skill))
    )


async def _sync_plan_with_user_skills(
    db: AsyncSession, user: User, plan: Plan
) -> bool:
    """Отметки «освоено» на карте переносим в пункты плана."""
    skill_ids = [it.skill_id for it in plan.items]
    if not skill_ids:
        return False
    rows = await db.scalars(
        select(UserSkill).where(
            UserSkill.user_id == user.id, UserSkill.skill_id.in_(skill_ids)
        )
    )
    mastered = {row.skill_id for row in rows if row.status in DONE}
    changed = False
    for item in plan.items:
        if item.skill_id in mastered and _as_plan_status(item.status) != PlanItemStatus.DONE:
            item.status = PlanItemStatus.DONE.value
            changed = True
    return changed


def _aggregate_skill_status(chunks: list[PlanItem]) -> SkillStatus:
    """Статус навыка по всем его частям в плане.

    Навык может занимать несколько недель: он освоен только когда закрыты
    все его части, и «в процессе», если закрыта или начата хотя бы одна.
    """
    statuses = [_as_plan_status(it.status) for it in chunks]
    if not statuses:
        return SkillStatus.NOT_STARTED
    if all(st == PlanItemStatus.DONE for st in statuses):
        return SkillStatus.MASTERED
    if any(st != PlanItemStatus.PLANNED for st in statuses):
        return SkillStatus.LEARNING
    return SkillStatus.NOT_STARTED


async def _sync_skill_status_from_plan(
    db: AsyncSession, user_id: uuid.UUID, plan: Plan, skill_id: uuid.UUID
) -> None:
    chunks = [it for it in plan.items if it.skill_id == skill_id]
    target = _aggregate_skill_status(chunks)
    us = await db.scalar(
        select(UserSkill).where(
            UserSkill.user_id == user_id, UserSkill.skill_id == skill_id
        )
    )
    if us is None:
        us = UserSkill(user_id=user_id, skill_id=skill_id)
        db.add(us)
    us.status = target.value


async def _plan_response(
    db: AsyncSession, user: User, plan: Plan
) -> TrajectoryResponse:
    """Собрать TrajectoryResponse из сохранённого плана (со статусами пунктов)."""
    profession = await get_profession_or_404(db, plan.profession_id)
    res_map = await _resources_for_skills(db, [it.skill_id for it in plan.items])
    by_week: dict[int, list[TrajectoryWeekItem]] = defaultdict(list)
    seen_skills: set[uuid.UUID] = set()
    for it in sorted(plan.items, key=lambda x: (x.week_number, x.position)):
        by_week[it.week_number].append(
            TrajectoryWeekItem(
                item_id=it.id,
                skill=_brief(it.skill),
                hours=it.estimated_hours,
                resources=[
                    _resource_brief(r) for r in res_map.get(it.skill_id, [])
                ],
                status=_as_plan_status(it.status),
                continued=it.skill_id in seen_skills,
            )
        )
        seen_skills.add(it.skill_id)

    weeks: list[TrajectoryWeek] = []
    for week_number in sorted(by_week):
        items = by_week[week_number]
        skills = [item.skill for item in items]
        weeks.append(
            TrajectoryWeek(
                week=week_number,
                title=f"Неделя {week_number}",
                items=items,
                skills=skills,
                estimated_hours=sum(item.hours for item in items),
                focus=skills[0].title if skills else "",
            )
        )

    current_week = min(
        plan.current_week or 1,
        plan.total_weeks or (weeks[-1].week if weeks else 1),
    )
    week_items = by_week.get(current_week) or (
        by_week[min(by_week)] if by_week else []
    )
    what = [item for item in week_items if item.status != PlanItemStatus.DONE]

    return TrajectoryResponse(
        profession_id=profession.id,
        profession_title=profession.title,
        level=user.level.value if user.level else None,
        hours_per_week=plan.hours_per_week,
        total_weeks=plan.total_weeks or len(weeks),
        current_week=current_week,
        weeks=weeks,
        what_to_do_this_week=what,
    )


async def get_or_build_plan(
    db: AsyncSession, user: User, profession_id: uuid.UUID | None = None
) -> TrajectoryResponse:
    """GET /me/plan и /me/trajectory — сохранённый план с прогрессом по пунктам."""
    pid = profession_id or _require_target(user)
    await get_profession_or_404(db, pid)

    plan = await _load_plan(db, user.id, pid)
    hours_per_week = user.hours_per_week or 6
    if (
        plan is None
        or not plan.items
        or plan.hours_per_week != hours_per_week
        or not _plan_matches_hours(plan, hours_per_week)
    ):
        keep = (
            {
                it.skill_id
                for it in plan.items
                if _as_plan_status(it.status) == PlanItemStatus.DONE
            }
            if plan is not None
            else set()
        )
        await build_trajectory(
            db, user, pid, persist=True, keep_done_skill_ids=keep
        )
        plan = await _load_plan(db, user.id, pid)
    if plan is None:  # план не построился: у профессии нет навыков
        return await build_trajectory(db, user, pid)

    if await _sync_plan_with_user_skills(db, user, plan):
        plan.current_week = _resolve_current_week(plan.items)
        await db.commit()

    return await _plan_response(db, user, plan)


async def set_plan_item_status(
    db: AsyncSession, user: User, item_id: uuid.UUID, data: PlanItemUpdate
) -> PlanItem:
    """PATCH /me/plan/items/{item_id} — отметить пункт плана (недели)."""
    plan = await db.scalar(
        select(Plan)
        .join(PlanItem, PlanItem.plan_id == Plan.id)
        .where(PlanItem.id == item_id, Plan.user_id == user.id)
        .options(selectinload(Plan.items))
    )
    if plan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Пункт плана не найден")
    item = next((it for it in plan.items if it.id == item_id), None)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Пункт плана не найден")

    item.status = data.status.value
    await _sync_skill_status_from_plan(db, user.id, plan, item.skill_id)
    plan.current_week = _resolve_current_week(plan.items)
    await db.commit()
    await db.refresh(item)
    return item


async def complete_plan_week(
    db: AsyncSession, user: User, week_number: int
) -> TrajectoryResponse:
    """POST /me/plan/weeks/{week_number}/complete — закрыть неделю целиком."""
    pid = _require_target(user)
    plan = await _load_plan(db, user.id, pid)
    if plan is None or not plan.items:
        await build_trajectory(db, user, pid, persist=True)
        plan = await _load_plan(db, user.id, pid)
    if plan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "План не найден")

    week_items = [it for it in plan.items if it.week_number == week_number]
    if not week_items:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"В плане нет недели {week_number}"
        )

    for item in week_items:
        item.status = PlanItemStatus.DONE.value
    for skill_id in {it.skill_id for it in week_items}:
        await _sync_skill_status_from_plan(db, user.id, plan, skill_id)
    plan.current_week = _resolve_current_week(plan.items)
    await db.commit()

    plan = await _load_plan(db, user.id, pid)
    if plan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "План не найден")
    return await _plan_response(db, user, plan)


async def recalculate_plan(db: AsyncSession, user: User) -> TrajectoryResponse:
    """POST /me/plan/recalculate — пересобрать с учётом текущего прогресса."""
    pid = _require_target(user)
    current = await _load_plan(db, user.id, pid)
    keep = (
        {
            it.skill_id
            for it in current.items
            if _as_plan_status(it.status) == PlanItemStatus.DONE
        }
        if current is not None
        else set()
    )
    await build_trajectory(db, user, pid, persist=True, keep_done_skill_ids=keep)
    plan = await _load_plan(db, user.id, pid)
    if plan is None:
        return await build_trajectory(db, user, pid)
    return await _plan_response(db, user, plan)


async def dashboard(db: AsyncSession, user: User) -> DashboardResponse:
    if user.target_profession_id is None:
        return DashboardResponse(
            kpi=DashboardKpi(
                hours_per_week=user.hours_per_week,
                level=user.level.value if user.level else None,
            ),
            next_steps=[],
            status_breakdown={},
        )

    gap = await gap_analysis(db, user, user.target_profession_id)
    traj = await build_trajectory(db, user, user.target_profession_id, persist=False)

    breakdown = {
        "mastered": len(gap.mastered),
        "learning": len(gap.learning),
        "missing": len(gap.missing),
        "not_started": len(gap.missing),
    }

    next_steps: list[DashboardNextStep] = []
    for item in traj.what_to_do_this_week[:3]:
        next_steps.append(
            DashboardNextStep(
                skill=item.skill,
                reason="В плане на эту неделю",
                resources=item.resources,
            )
        )
    if not next_steps:
        for m in gap.missing:
            if not m.locked:
                next_steps.append(
                    DashboardNextStep(
                        skill=m.skill,
                        reason="Доступен для изучения (предусловия выполнены)",
                    )
                )
            if len(next_steps) >= 3:
                break

    focus = traj.weeks[0].focus if traj.weeks else None

    return DashboardResponse(
        kpi=DashboardKpi(
            mastered_count=len(gap.mastered),
            learning_count=len(gap.learning),
            total_skills=gap.total_skills,
            progress_percent=gap.progress_percent,
            estimated_remaining_hours=gap.estimated_remaining_hours,
            hours_per_week=user.hours_per_week,
            level=user.level.value if user.level else None,
            target_profession_title=gap.profession_title,
        ),
        next_steps=next_steps,
        status_breakdown=breakdown,
        current_week_focus=focus,
    )

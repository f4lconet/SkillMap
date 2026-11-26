"""Журнал действий редакторов — лента «Последние изменения» в обзоре админки.

Одна запись `AdminEvent` пишется в той же транзакции, что и само изменение
контента: если мутация падает, история не расходится с данными.
"""
from __future__ import annotations

import uuid
from collections.abc import Mapping, Sequence

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AdminEvent, Profession, ProfessionSkill, User
from app.models.base import utcnow

TITLE_LIMIT = 300
DETAIL_LIMIT = 1000

ENTITY_PROFESSION = "profession"
ENTITY_SKILL = "skill"
ENTITY_DEPENDENCY = "dependency"
ENTITY_RESOURCE = "resource"

ACTION_CREATED = "created"
ACTION_UPDATED = "updated"
ACTION_DELETED = "deleted"
ACTION_PUBLISHED = "published"
ACTION_CHECKED = "checked"

PROFESSION_FIELD_LABELS: dict[str, str] = {
    "slug": "slug",
    "title": "название",
    "direction": "направление",
    "direction_id": "направление",
    "description": "описание",
    "short_description": "краткое описание",
    "tasks": "задачи",
    "suits_if": "кому подходит",
    "start_hint": "подсказка старта",
    "is_priority": "приоритет",
    "entry_level": "уровень входа",
    "status": "статус",
    "skills_ready": "готовность навыков",
    "estimated_weeks": "длительность",
}

SKILL_FIELD_LABELS: dict[str, str] = {
    "slug": "slug",
    "title": "название",
    "subtitle": "подзаголовок",
    "description": "описание",
    "category": "категория",
    "difficulty": "сложность",
    "layer": "слой",
    "estimated_hours": "время изучения",
    "pos_x": "позиция на карте",
    "pos_y": "позиция на карте",
}

RESOURCE_FIELD_LABELS: dict[str, str] = {
    "skill_id": "навык",
    "title": "название",
    "url": "ссылка",
    "resource_type": "тип",
    "is_free": "бесплатность",
    "provider": "провайдер",
    "lang": "язык",
    "description": "описание",
    "estimated_hours": "время изучения",
    "position": "порядок",
    "status": "статус",
}

DEPENDENCY_TYPE_LABELS: dict[str, str] = {
    "required": "обязательная",
    "recommended": "рекомендуемая",
    "optional": "необязательная",
}

RESOURCE_TYPE_LABELS: dict[str, str] = {
    "course": "курс",
    "book": "книга",
    "project": "проект",
    "article": "статья",
    "video": "видео",
    "docs": "документация",
}


def _cut(value: str, limit: int) -> str:
    text = (value or "").strip()
    return text if len(text) <= limit else text[: limit - 1] + "…"


def changed_labels(
    changes: Mapping[str, object], labels: Mapping[str, str]
) -> str:
    """Человекочитаемый перечень изменённых полей для записи журнала."""
    names = [labels.get(field, field) for field in changes]
    return ", ".join(dict.fromkeys(names))


async def professions_of_skill(
    db: AsyncSession, skill_id: uuid.UUID
) -> list[uuid.UUID]:
    return list(
        await db.scalars(
            select(ProfessionSkill.profession_id).where(
                ProfessionSkill.skill_id == skill_id
            )
        )
    )


async def touch_drafts(
    db: AsyncSession, profession_ids: Sequence[uuid.UUID]
) -> None:
    """Отмечает черновики профессий как сохранённые «только что»."""
    ids = list(dict.fromkeys(profession_ids))
    if not ids:
        return
    await db.execute(
        update(Profession)
        .where(Profession.id.in_(ids))
        .values(draft_saved_at=utcnow())
    )


async def record(
    db: AsyncSession,
    *,
    actor: User | None,
    entity_type: str,
    action: str,
    title: str,
    detail: str = "",
    entity_id: uuid.UUID | None = None,
    profession_id: uuid.UUID | None = None,
    skill_id: uuid.UUID | None = None,
    touch_draft: bool = True,
) -> AdminEvent:
    """Добавляет запись в журнал (без коммита — его делает вызывающий код)."""
    if touch_draft:
        if profession_id is not None:
            await touch_drafts(db, [profession_id])
        elif skill_id is not None:
            await touch_drafts(db, await professions_of_skill(db, skill_id))

    event = AdminEvent(
        actor_id=actor.id if actor is not None else None,
        actor_name=(actor.name if actor is not None else "") or "",
        entity_type=entity_type,
        entity_id=entity_id,
        profession_id=profession_id,
        skill_id=skill_id,
        action=action,
        title=_cut(title, TITLE_LIMIT),
        detail=_cut(detail, DETAIL_LIMIT),
    )
    db.add(event)
    return event


async def list_events(
    db: AsyncSession,
    *,
    profession_id: uuid.UUID | None = None,
    skill_id: uuid.UUID | None = None,
    entity_type: str | None = None,
    action: str | None = None,
    limit: int,
    offset: int,
) -> tuple[list[AdminEvent], int]:
    """Лента изменений; `profession_id` включает и события её навыков."""
    conditions = []
    if entity_type is not None:
        conditions.append(AdminEvent.entity_type == entity_type)
    if action is not None:
        conditions.append(AdminEvent.action == action)
    if profession_id is not None:
        conditions.append(
            or_(
                AdminEvent.profession_id == profession_id,
                AdminEvent.skill_id.in_(
                    select(ProfessionSkill.skill_id).where(
                        ProfessionSkill.profession_id == profession_id
                    )
                ),
            )
        )
    if skill_id is not None:
        conditions.append(AdminEvent.skill_id == skill_id)

    total = await db.scalar(select(func.count(AdminEvent.id)).where(*conditions))
    rows = await db.scalars(
        select(AdminEvent)
        .where(*conditions)
        .order_by(AdminEvent.created_at.desc(), AdminEvent.id)
        .limit(limit)
        .offset(offset)
    )
    return list(rows), total or 0

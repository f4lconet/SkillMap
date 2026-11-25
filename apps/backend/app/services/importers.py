"""Импорт навыков из GitHub и Stepik — приоритет Should, неделя 5.

Идея: внешние сервисы дают только *сигналы* (языки репозиториев, темы, названия
курсов). Дальше `app.services.import_mapping` сопоставляет их с навыками, а
пользователь подтверждает подсказки. Ничего не пишется в БД без явного
`apply` — это важно, чтобы импорт не портил уже пройденный онбординг.

Сеть изолирована в двух функциях (`fetch_github_signals`, `fetch_stepik_signals`),
поэтому маппинг и применение проверяются в тестах без обращений наружу.
"""

from __future__ import annotations

import uuid
from collections import Counter
from collections.abc import Sequence
from typing import Any

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import ProfessionSkill, Skill, SkillStatus, User, UserSkill
from app.schemas.importer import (
    ImportApplyRequest,
    ImportApplyResponse,
    ImportedSkill,
    ImportEvidence,
    ImportPreview,
    ImportSource,
    ImportSuggestion,
)
from app.services.import_mapping import (
    COURSE_CONFIDENCE,
    LANGUAGE_CONFIDENCE,
    SUMMARY_CONFIDENCE,
    TOPIC_CONFIDENCE,
    Match,
    Signal,
    collect_matches,
)

GITHUB_API_URL = "https://api.github.com"
GITHUB_PROFILE_URL = "https://github.com/{login}"
STEPIK_API_URL = "https://stepik.org/api/courses"
STEPIK_COURSE_URL = "https://stepik.org/course/{course_id}"

IMPORT_TIMEOUT = 15.0
MAX_REPOS = 100
MAX_REPOS_FOR_TOPICS = 20
MAX_STEPIK_COURSES = 50

UPSTREAM_UNAVAILABLE = "Внешний сервис недоступен, попробуйте позже"
GITHUB_RATE_LIMITED = "GitHub ограничил частоту запросов, попробуйте через минуту"
STEPIK_RATE_LIMITED = "Stepik ограничил частоту запросов, попробуйте через минуту"

__all__ = [
    "apply_import",
    "fetch_github_signals",
    "fetch_stepik_signals",
    "preview_import",
]


def _github_headers() -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "SkillMap",
    }
    # Токен не обязателен: он лишь поднимает лимит 60 → 5000 запросов в час
    token = get_settings().github_import_token
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


async def _get_json(
    url: str,
    *,
    params: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    not_found: str,
    rate_limited: str = UPSTREAM_UNAVAILABLE,
) -> Any:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url, params=params, headers=headers, timeout=IMPORT_TIMEOUT
            )
    except httpx.HTTPError as exc:
        raise HTTPException(503, UPSTREAM_UNAVAILABLE) from exc

    if response.status_code == 404:
        raise HTTPException(404, not_found)
    if response.status_code in {403, 429}:
        raise HTTPException(429, rate_limited)
    if response.status_code >= 400:
        raise HTTPException(502, UPSTREAM_UNAVAILABLE)
    try:
        return response.json()
    except ValueError as exc:  # сервис вернул не JSON
        raise HTTPException(502, UPSTREAM_UNAVAILABLE) from exc


async def fetch_github_signals(login: str) -> list[Signal]:
    """Языки и темы репозиториев публичного профиля GitHub."""
    headers = _github_headers()
    profile_url = GITHUB_PROFILE_URL.format(login=login)
    await _get_json(
        f"{GITHUB_API_URL}/users/{login}",
        headers=headers,
        not_found="Профиль GitHub не найден",
        rate_limited=GITHUB_RATE_LIMITED,
    )
    repos = await _get_json(
        f"{GITHUB_API_URL}/users/{login}/repos",
        params={"per_page": MAX_REPOS, "sort": "pushed", "type": "owner"},
        headers=headers,
        not_found="Профиль GitHub не найден",
        rate_limited=GITHUB_RATE_LIMITED,
    )

    own_repos = [
        repo
        for repo in repos
        if isinstance(repo, dict) and not repo.get("fork") and not repo.get("archived")
    ]

    signals: list[Signal] = []
    languages = Counter(
        repo["language"] for repo in own_repos if isinstance(repo.get("language"), str)
    )
    for language, _count in languages.most_common():
        signals.append(
            Signal(
                source="github",
                title=language,
                url=profile_url,
                confidence=LANGUAGE_CONFIDENCE,
            )
        )

    seen_topics: set[str] = set()
    for repo in own_repos[:MAX_REPOS_FOR_TOPICS]:
        for topic in repo.get("topics") or []:
            if not isinstance(topic, str) or topic in seen_topics:
                continue
            seen_topics.add(topic)
            signals.append(
                Signal(
                    source="github",
                    title=topic,
                    url=repo.get("html_url") or profile_url,
                    confidence=TOPIC_CONFIDENCE,
                )
            )
    return signals


async def fetch_stepik_signals(course_ids: Sequence[int]) -> list[Signal]:
    """Названия и описания публичных курсов Stepik по их id."""
    payload = await _get_json(
        STEPIK_API_URL,
        params={"ids[]": list(course_ids)[:MAX_STEPIK_COURSES]},
        not_found="Курсы Stepik не найдены",
        rate_limited=STEPIK_RATE_LIMITED,
    )
    courses = payload.get("courses") if isinstance(payload, dict) else None
    if not courses:
        raise HTTPException(404, "Курсы Stepik не найдены")

    signals: list[Signal] = []
    for course in courses:
        if not isinstance(course, dict) or not course.get("title"):
            continue
        url = STEPIK_COURSE_URL.format(course_id=course.get("id", ""))
        signals.append(
            Signal(
                source="stepik", title=course["title"], url=url, confidence=COURSE_CONFIDENCE
            )
        )
        summary = course.get("summary")
        if isinstance(summary, str) and summary:
            # Описание — самый мягкий сигнал: помогает, когда название общее
            signals.append(
                Signal(
                    source="stepik",
                    title=summary,
                    url=url,
                    confidence=SUMMARY_CONFIDENCE,
                )
            )
    return signals


async def _candidate_skills(
    db: AsyncSession, user: User, profession_id: uuid.UUID | None
) -> list[Skill]:
    target = profession_id or user.target_profession_id
    if target is None:
        return list(await db.scalars(select(Skill).order_by(Skill.slug)))
    return list(
        await db.scalars(
            select(Skill)
            .join(ProfessionSkill, ProfessionSkill.skill_id == Skill.id)
            .where(ProfessionSkill.profession_id == target)
            .order_by(Skill.slug)
        )
    )


async def _mastered_skill_ids(db: AsyncSession, user: User) -> set[uuid.UUID]:
    rows = await db.scalars(
        select(UserSkill.skill_id).where(
            UserSkill.user_id == user.id,
            UserSkill.status == SkillStatus.MASTERED.value,
        )
    )
    return set(rows)


def _to_suggestion(match: Match) -> ImportSuggestion:
    return ImportSuggestion(
        skill_id=match.skill_id,
        slug=match.slug,
        title=match.title,
        confidence=match.confidence,
        evidence=[
            ImportEvidence(
                source=signal.source,
                title=signal.title,
                url=signal.url,
                confidence=signal.confidence,
            )
            for signal in match.evidence
        ],
    )


async def preview_import(
    db: AsyncSession,
    user: User,
    *,
    source: ImportSource,
    account: str,
    signals: Sequence[Signal],
    profession_id: uuid.UUID | None = None,
) -> ImportPreview:
    """Сопоставляет сигналы с навыками, не меняя состояние пользователя."""
    skills = await _candidate_skills(db, user, profession_id)
    matches, unmatched = collect_matches(signals, skills)

    mastered_ids = await _mastered_skill_ids(db, user)
    suggestions = [
        _to_suggestion(match) for match in matches if match.skill_id not in mastered_ids
    ]
    already = sorted(
        match.slug for match in matches if match.skill_id in mastered_ids
    )
    return ImportPreview(
        source=source,
        account=account,
        total_signals=len(signals),
        suggestions=suggestions,
        unmatched=unmatched,
        already_mastered=already,
    )


async def apply_import(
    db: AsyncSession, user: User, data: ImportApplyRequest
) -> ImportApplyResponse:
    """Отмечает выбранные пользователем навыки как освоенные с указанием источника."""
    skills = {
        skill.id: skill
        for skill in await db.scalars(select(Skill).where(Skill.id.in_(data.skill_ids)))
    }
    missing = [str(skill_id) for skill_id in data.skill_ids if skill_id not in skills]
    if missing:
        raise HTTPException(404, "Навык не найден")

    existing = {
        us.skill_id: us
        for us in await db.scalars(
            select(UserSkill).where(
                UserSkill.user_id == user.id, UserSkill.skill_id.in_(data.skill_ids)
            )
        )
    }
    applied: list[ImportedSkill] = []
    for skill_id in data.skill_ids:
        us = existing.get(skill_id)
        if us is None:
            us = UserSkill(user_id=user.id, skill_id=skill_id)
            db.add(us)
            existing[skill_id] = us
        us.status = SkillStatus.MASTERED.value
        us.source = data.source
        if data.self_score is not None:
            us.self_score = data.self_score
        applied.append(ImportedSkill(skill_id=skill_id, slug=skills[skill_id].slug))

    await db.commit()

    total_mastered = len(
        (
            await db.scalars(
                select(UserSkill.skill_id).where(
                    UserSkill.user_id == user.id,
                    UserSkill.status == SkillStatus.MASTERED.value,
                )
            )
        ).all()
    )
    return ImportApplyResponse(
        source=data.source, applied=applied, total_mastered=total_mastered
    )

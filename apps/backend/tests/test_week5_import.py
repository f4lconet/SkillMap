"""Тесты импорта навыков из GitHub и Stepik (неделя 5, п.3 — приоритет Should).

Две части:
  * маппинг сигналов в навыки — чистые функции без сети, проверяем
    детерминированно на синтетических навыках;
  * HTTP-эндпоинты — с подменой `fetch_*_signals`, поэтому в тестах нет
    обращений к api.github.com и stepik.org.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select

from app.models import Skill, UserSkill
from app.services import importers as importers_service
from app.services.import_mapping import (
    COURSE_CONFIDENCE,
    LANGUAGE_CONFIDENCE,
    Signal,
    collect_matches,
)


@dataclass(frozen=True)
class FakeSkill:
    """Минимальный SkillLike: маппингу нужны только id, slug и title."""

    slug: str
    title: str

    @property
    def id(self) -> uuid.UUID:
        return uuid.uuid5(uuid.NAMESPACE_URL, self.slug)


def _skills(*pairs: tuple[str, str]) -> list[FakeSkill]:
    return [FakeSkill(slug=slug, title=title) for slug, title in pairs]


# ------------------------------- Маппинг -----------------------------------


def test_language_signal_maps_to_language_skill():
    skills = _skills(("py-basics", "Основы Python"), ("js-basics", "Основы JavaScript"))
    matches, unmatched = collect_matches(
        [Signal("github", "Python", confidence=LANGUAGE_CONFIDENCE)], skills
    )

    assert unmatched == []
    assert [match.slug for match in matches] == ["py-basics"]
    assert matches[0].confidence == LANGUAGE_CONFIDENCE
    assert len(matches[0].evidence) == 1


def test_language_without_skill_is_not_guessed():
    """«Go» есть в GitHub, но навыка под него нет — показываем как есть."""
    skills = _skills(("git-cli", "Git"), ("sql-queries", "SQL"))
    matches, unmatched = collect_matches([Signal("github", "Go")], skills)

    assert matches == []
    assert unmatched == ["Go"]


def test_ambiguous_token_is_dropped():
    """Ключ, встречающийся у 4 навыков, ничего не доказывает."""
    skills = _skills(
        ("cache-a", "Кэш A"),
        ("cache-b", "Кэш B"),
        ("cache-c", "Кэш C"),
        ("cache-d", "Кэш D"),
    )
    matches, unmatched = collect_matches([Signal("github", "Cache")], skills)

    assert matches == []
    assert unmatched == ["Cache"]


def test_curated_keywords_resolve_repeated_alias():
    """React есть у 4 навыков, но курируемое слово указывает ровно на один."""
    skills = _skills(
        ("react", "React"),
        ("react-concepts", "Концепции React"),
        ("react-native", "React Native"),
        ("react-hooks", "Хуки React"),
    )
    matches, _ = collect_matches([Signal("github", "React")], skills)

    assert [match.slug for match in matches] == ["react"]


def test_confidence_accumulates_as_noisy_or():
    """Два независимых сигнала дают больше уверенности, чем каждый по отдельности."""
    skills = _skills(("py-basics", "Основы Python"))
    matches, _ = collect_matches(
        [
            Signal("stepik", "Python", confidence=COURSE_CONFIDENCE),
            Signal("github", "Python", confidence=LANGUAGE_CONFIDENCE),
        ],
        skills,
    )

    assert len(matches) == 1
    # 1 - (1 - 0.6) * (1 - 0.85) = 0.94
    assert matches[0].confidence == 0.94
    assert len(matches[0].evidence) == 2


def test_matches_sorted_by_confidence():
    skills = _skills(("py-basics", "Основы Python"), ("git-cli", "Git"))
    matches, _ = collect_matches(
        [
            Signal("stepik", "Git", confidence=COURSE_CONFIDENCE),
            Signal("github", "Python", confidence=LANGUAGE_CONFIDENCE),
        ],
        skills,
    )

    assert [match.slug for match in matches] == ["py-basics", "git-cli"]


# ------------------------------ Эндпоинты ----------------------------------


@pytest_asyncio.fixture
async def python_skill(session_factory) -> uuid.UUID:
    async with session_factory() as db:
        skill = Skill(slug="py-basics", title="Основы Python", category="Языки")
        db.add(skill)
        await db.commit()
        await db.refresh(skill)
        return skill.id


def _stub_github(monkeypatch, signals):
    async def fake(login: str):
        assert login == "octocat"
        return signals

    monkeypatch.setattr(importers_service, "fetch_github_signals", fake)


@pytest.mark.asyncio
async def test_github_preview_lists_suggestions(
    auth_client: AsyncClient, python_skill, monkeypatch
):
    _stub_github(monkeypatch, [Signal("github", "Python", confidence=LANGUAGE_CONFIDENCE)])

    r = await auth_client.post(
        "/api/v1/me/import/github/preview", json={"login": "@octocat"}
    )

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["source"] == "github"
    assert body["account"] == "octocat"
    assert body["total_signals"] == 1
    assert [s["slug"] for s in body["suggestions"]] == ["py-basics"]
    assert body["suggestions"][0]["evidence"][0]["title"] == "Python"


@pytest.mark.asyncio
async def test_github_preview_does_not_write_progress(
    auth_client: AsyncClient, python_skill, session_factory, monkeypatch
):
    _stub_github(monkeypatch, [Signal("github", "Python", confidence=LANGUAGE_CONFIDENCE)])

    await auth_client.post("/api/v1/me/import/github/preview", json={"login": "octocat"})

    async with session_factory() as db:
        assert (await db.scalars(select(UserSkill))).all() == []


@pytest.mark.asyncio
async def test_preview_marks_already_mastered(
    auth_client: AsyncClient, python_skill, monkeypatch
):
    r = await auth_client.post(
        "/api/v1/me/skills/bulk",
        json={"skills": [{"skill_id": str(python_skill), "status": "mastered"}]},
    )
    assert r.status_code == 200, r.text
    _stub_github(monkeypatch, [Signal("github", "Python", confidence=LANGUAGE_CONFIDENCE)])

    r = await auth_client.post(
        "/api/v1/me/import/github/preview", json={"login": "octocat"}
    )

    body = r.json()
    assert body["already_mastered"] == ["py-basics"]
    assert body["suggestions"] == []


@pytest.mark.asyncio
async def test_stepik_preview_uses_course_titles(
    auth_client: AsyncClient, python_skill, monkeypatch
):
    async def fake(course_ids):
        assert list(course_ids) == [67, 512]
        return [
            Signal("stepik", "Python: основы и применение", confidence=COURSE_CONFIDENCE)
        ]

    monkeypatch.setattr(importers_service, "fetch_stepik_signals", fake)

    r = await auth_client.post(
        "/api/v1/me/import/stepik/preview", json={"course_ids": [67, 512]}
    )

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["source"] == "stepik"
    assert body["account"] == "67, 512"
    assert [s["slug"] for s in body["suggestions"]] == ["py-basics"]


@pytest.mark.asyncio
async def test_apply_marks_mastered_with_source(
    auth_client: AsyncClient, python_skill, session_factory
):
    payload = {"skill_ids": [str(python_skill)], "source": "github", "self_score": 4}

    r = await auth_client.post("/api/v1/me/import/apply", json=payload)
    assert r.status_code == 200, r.text
    assert r.json()["total_mastered"] == 1
    assert r.json()["applied"] == [{"skill_id": str(python_skill), "slug": "py-basics"}]

    r = await auth_client.post("/api/v1/me/import/apply", json=payload)
    assert r.status_code == 200, r.text
    assert r.json()["total_mastered"] == 1

    async with session_factory() as db:
        rows = (await db.scalars(select(UserSkill))).all()
        assert len(rows) == 1
        assert rows[0].status == "mastered"
        assert rows[0].source == "github"
        assert rows[0].self_score == 4


@pytest.mark.asyncio
async def test_apply_unknown_skill_returns_404(auth_client: AsyncClient):
    r = await auth_client.post(
        "/api/v1/me/import/apply", json={"skill_ids": [str(uuid.uuid4())]}
    )
    assert r.status_code == 404, r.text


@pytest.mark.asyncio
async def test_import_requires_auth(client: AsyncClient):
    r = await client.post("/api/v1/me/import/github/preview", json={"login": "octocat"})
    assert r.status_code == 401, r.text


@pytest.mark.asyncio
async def test_invalid_github_login_rejected(auth_client: AsyncClient):
    r = await auth_client.post(
        "/api/v1/me/import/github/preview", json={"login": "не логин!"}
    )
    assert r.status_code == 422, r.text


@pytest.mark.asyncio
async def test_stepik_fetch_parses_courses(monkeypatch):
    """Проверяем разбор ответа Stepik без реального запроса."""
    payload = {
        "courses": [
            {
                "id": 63054,
                "title": "Интерактивный тренажер по SQL",
                "summary": "Практика SQL",
            },
            {"id": 67, "title": ""},
        ]
    }

    async def fake_get_json(url, **kwargs):
        assert url == importers_service.STEPIK_API_URL
        assert kwargs["params"] == {"ids[]": [63054, 67]}
        return payload

    monkeypatch.setattr(importers_service, "_get_json", fake_get_json)

    signals = await importers_service.fetch_stepik_signals([63054, 67])

    assert [s.title for s in signals] == [
        "Интерактивный тренажер по SQL",
        "Практика SQL",
    ]
    assert signals[0].url == "https://stepik.org/course/63054"

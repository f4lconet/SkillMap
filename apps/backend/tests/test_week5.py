"""Тесты недели 5: стабилизация MVP и контракты с фронтендом.

Покрывают то, что появилось на неделе 5:
  * границы пагинации в публичном каталоге и админке (неделя 5, п.1);
  * валидацию URL ресурса (админка ругается, а не падает 500);
  * контракт публичной карты и PDF-экспорта (неделя 5, п.2);
  * проверки контента для остальных профессий (неделя 5, п.4).
"""
from __future__ import annotations

import copy

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import func, select

from app.api.pagination import MAX_LIMIT, MAX_OFFSET, clamp_page
from app.models import Profession, ProfessionStatus, Skill, UserRole
from app.services.content import content_stats, load_content, load_content_data
from app.services.content_validation import (
    ContentValidationError,
    content_report,
    validate_content,
)
from tests.conftest import PASSWORD, bearer, create_user


@pytest_asyncio.fixture
async def editor_headers(client: AsyncClient, session_factory):
    await create_user(session_factory, "editor-w5@example.ru", role=UserRole.EDITOR)
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "editor-w5@example.ru", "password": PASSWORD},
    )
    assert r.status_code == 200, r.text
    return bearer(r)


# ------------------------------ Пагинация ----------------------------------


def test_clamp_page_is_defensive():
    """Сервисы не доверяют параметрам: даже внутренний вызов не попросит всё."""
    assert clamp_page(0, -5) == clamp_page(1, 0)
    big = clamp_page(10_000, 999_999)
    assert big.limit == MAX_LIMIT
    assert big.offset == MAX_OFFSET
    assert clamp_page(500, 10, max_limit=50).limit == 50


@pytest.mark.asyncio
async def test_public_catalog_pagination_bounds(client: AsyncClient, professions):
    for params in ({"limit": 51}, {"limit": 0}, {"limit": -1}):
        r = await client.get("/api/v1/professions", params=params)
        assert r.status_code == 422, params

    for params in ({"offset": -1}, {"offset": MAX_OFFSET + 1}):
        r = await client.get("/api/v1/professions", params=params)
        assert r.status_code == 422, params

    r = await client.get("/api/v1/professions", params={"limit": 50})
    assert r.status_code == 200, r.text
    assert r.json()["limit"] == 50

    # смещение за концом коллекции — пустая страница, но total честный
    r = await client.get("/api/v1/professions", params={"limit": 5, "offset": 500})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["items"] == []
    assert body["total"] == 3  # черновик в каталог не попадает


@pytest.mark.asyncio
async def test_admin_list_pagination_bounds(client: AsyncClient, editor_headers):
    paths = (
        "/api/v1/admin/professions",
        "/api/v1/admin/skills",
        "/api/v1/admin/dependencies",
        "/api/v1/admin/resources",
    )
    for path in paths:
        r = await client.get(path, params={"limit": MAX_LIMIT + 1}, headers=editor_headers)
        assert r.status_code == 422, path
        r = await client.get(path, params={"offset": MAX_OFFSET + 1}, headers=editor_headers)
        assert r.status_code == 422, path
        # админке по-прежнему доступны страницы по 200 — фронт этим пользуется
        r = await client.get(path, params={"limit": MAX_LIMIT}, headers=editor_headers)
        assert r.status_code == 200, path
        assert r.json()["limit"] == MAX_LIMIT

    r = await client.post(
        "/api/v1/admin/resources/check-links",
        params={"limit": MAX_LIMIT + 1},
        headers=editor_headers,
    )
    assert r.status_code == 422, r.text


# ------------------------- Обработка ошибок админки -------------------------


@pytest.mark.asyncio
async def test_resource_url_scheme_is_validated(
    client: AsyncClient, editor_headers
):
    skill = await client.post(
        "/api/v1/admin/skills",
        json={"slug": "w5-url-skill", "title": "Навык для ссылок"},
        headers=editor_headers,
    )
    assert skill.status_code == 201, skill.text
    skill_id = skill.json()["id"]

    r = await client.post(
        "/api/v1/admin/resources",
        json={"skill_id": skill_id, "title": "Плохая", "url": "javascript:alert(1)"},
        headers=editor_headers,
    )
    assert r.status_code == 422, r.text

    r = await client.post(
        "/api/v1/admin/resources",
        json={"skill_id": skill_id, "title": "Хорошая", "url": "https://example.com/a"},
        headers=editor_headers,
    )
    assert r.status_code == 201, r.text
    resource_id = r.json()["id"]

    r = await client.patch(
        f"/api/v1/admin/resources/{resource_id}",
        json={"url": "file:///etc/passwd"},
        headers=editor_headers,
    )
    assert r.status_code == 422, r.text

    r = await client.patch(
        f"/api/v1/admin/resources/{resource_id}",
        json={"url": "http://example.com/b"},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_duplicate_slugs_return_conflict(client: AsyncClient, editor_headers):
    payload = {"slug": "w5-dup", "title": "Дубль"}
    r = await client.post("/api/v1/admin/professions", json=payload, headers=editor_headers)
    assert r.status_code == 201, r.text

    r = await client.post("/api/v1/admin/professions", json=payload, headers=editor_headers)
    assert r.status_code == 409, r.text

    other = await client.post(
        "/api/v1/admin/professions",
        json={"slug": "w5-dup-other", "title": "Другая"},
        headers=editor_headers,
    )
    assert other.status_code == 201, other.text
    r = await client.patch(
        f"/api/v1/admin/professions/{other.json()['id']}",
        json={"slug": "w5-dup"},
        headers=editor_headers,
    )
    assert r.status_code == 409, r.text

    skill = {"slug": "w5-dup-skill", "title": "Дубль навыка"}
    r = await client.post("/api/v1/admin/skills", json=skill, headers=editor_headers)
    assert r.status_code == 201, r.text
    r = await client.post("/api/v1/admin/skills", json=skill, headers=editor_headers)
    assert r.status_code == 409, r.text


# ------------------- Контракты: публичная карта и экспорт -------------------


EXPORT_TOP_KEYS = {"meta", "user", "profession", "map", "gap", "plan", "notes"}
EXPORT_META_KEYS = {"app", "version", "generated_at", "share_url"}
PUBLIC_MAP_KEYS = {
    "username",
    "owner_name",
    "owner_level",
    "profession_id",
    "profession_title",
    "shared_at",
    "map",
    "gap",
    "plan",
}


@pytest.mark.asyncio
async def test_export_contract_shape(
    auth_client: AsyncClient, published_profession_id, sample_skill_id
):
    r = await auth_client.patch(
        "/api/v1/me",
        json={
            "target_profession_id": str(published_profession_id),
            "hours_per_week": 6,
            "level": "beginner",
        },
    )
    assert r.status_code == 200, r.text

    r = await auth_client.get("/api/v1/me/export")
    assert r.status_code == 200, r.text
    payload = r.json()

    # фронт рендерит PDF по этим ключам — набор не должен «плыть»
    assert set(payload) == EXPORT_TOP_KEYS
    assert set(payload["meta"]) == EXPORT_META_KEYS
    assert payload["meta"]["version"] == "2026-11-w5"
    assert payload["meta"]["share_url"] is None  # шаринг ещё выключен
    assert set(payload["user"]) == {
        "name",
        "email",
        "level",
        "hours_per_week",
        "target_profession_title",
    }
    assert set(payload["profession"]) == {
        "id",
        "slug",
        "title",
        "direction",
        "short_description",
        "entry_level",
        "skills_count",
        "estimated_weeks",
        "is_priority",
        "skills_ready",
        "description",
        "tasks",
        "suits_if",
        "start_hint",
    }
    assert set(payload["map"]) == {
        "profession_id",
        "profession_title",
        "skills_ready",
        "skills",
        "total_skills",
        "mastered_count",
        "learning_count",
        "progress_percent",
    }
    assert set(payload["gap"]) == {
        "profession_id",
        "profession_title",
        "total_skills",
        "mastered",
        "learning",
        "missing",
        "missing_count",
        "progress_percent",
        "estimated_remaining_hours",
        "match_percent",
    }
    assert set(payload["plan"]) == {
        "profession_id",
        "profession_title",
        "level",
        "hours_per_week",
        "total_weeks",
        "current_week",
        "weeks",
        "what_to_do_this_week",
    }
    assert isinstance(payload["notes"], list)

    # после включения шаринга ссылка в meta ведёт на человекопонятный адрес
    state = (await auth_client.post("/api/v1/me/share")).json()
    payload = (await auth_client.get("/api/v1/me/export")).json()
    assert payload["meta"]["share_url"].endswith(f"/u/{state['username']}")

    r = await auth_client.get(f"/api/v1/public/u/{state['username']}")
    assert r.status_code == 200, r.text
    public = r.json()
    assert set(public) == PUBLIC_MAP_KEYS
    assert "email" not in public
    assert set(public["gap"]) == {
        "total_skills",
        "mastered_count",
        "learning_count",
        "missing_count",
        "match_percent",
        "estimated_remaining_hours",
    }
    assert set(public["plan"]) == {
        "hours_per_week",
        "total_weeks",
        "current_week",
        "focus",
    }


# --------------------- Контент: проверки и пере-загрузка --------------------


@pytest.mark.asyncio
async def test_analyst_content_passes_validation():
    data = load_content_data()
    report = content_report(data)

    assert report["errors"] == 0, [i for i in report["issues"]]
    assert report["totals"]["professions"] >= 10
    stats = content_stats(data)
    assert report["totals"]["skills"] == stats["skills"]
    # у каждой профессии есть навыки и часы — с этим можно идти к аналитику
    assert all(p["skills"] > 0 for p in report["professions"])
    assert all(p["hours"] > 0 for p in report["professions"])


def test_validation_detects_broken_content():
    data = {
        "directions": [{"id": "it", "title": "IT"}],
        "professions": [
            {"slug": "good", "title": "Хорошая", "direction": "it", "skills_count": 2},
            {"slug": "empty", "title": "Пустая", "direction": "it"},
        ],
        "skills": [
            {"id": "a", "title": "A", "professions": ["good"]},
            {"id": "b", "title": "B", "professions": ["good", "ghost"]},
            {"id": "c", "title": "C"},
        ],
        "dependencies": [
            {"skill_id": "a", "prerequisite_id": "b", "type": "required"},
            {"skill_id": "b", "prerequisite_id": "a", "type": "required"},
            {"skill_id": "c", "prerequisite_id": "c", "type": "required"},
            {"skill_id": "a", "prerequisite_id": "nope", "type": "required"},
        ],
        "resources": [{"skill_id": "b", "title": "R", "url": ""}],
    }

    issues = validate_content(data)
    codes = {i.code for i in issues if i.level == "error"}
    assert {"unknown-profession", "empty-profession", "self-dependency", "cycle",
            "unknown-skill"} <= codes
    warnings = {i.code for i in issues if i.level == "warning"}
    assert "orphan-skill" in warnings
    assert "resource-without-url" in warnings
    assert "skill-without-resources" in warnings


@pytest.mark.asyncio
async def test_load_content_rejects_broken_content(session_factory):
    data = copy.deepcopy(load_content_data())
    data["skills"][0].setdefault("professions", []).append("no-such-profession")

    async with session_factory() as db:
        with pytest.raises(ContentValidationError):
            await load_content(db, data)
        assert await db.scalar(select(func.count()).select_from(Skill)) == 0
        assert await db.scalar(select(func.count()).select_from(Profession)) == 0


@pytest.mark.asyncio
async def test_reseed_keeps_editor_changes(session_factory):
    """Повторный seed обновляет названия, но не перетирает статусы из админки."""
    data = load_content_data()
    async with session_factory() as db:
        await load_content(db, data)
        await db.commit()

        profession = await db.scalar(
            select(Profession).where(Profession.slug == "data-analyst")
        )
        profession.status = ProfessionStatus.DRAFT
        await db.commit()

        # контент обновился — название приезжает, статус остаётся ручным
        data["professions"] = [
            {**p, "title": p["title"] + " (v2)"}
            if p["slug"] == "data-analyst"
            else p
            for p in data["professions"]
        ]
        await load_content(db, data)
        await db.commit()

        await db.refresh(profession)
        assert profession.title.endswith("(v2)")
        assert profession.status == ProfessionStatus.DRAFT

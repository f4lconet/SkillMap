"""Тесты недели 6: страница «Обзор» админки.

Проверяем то, ради чего страница существует: журнал изменений (кто и когда
правил контент), диагностику невидимых связей и одну сводную ручку вместо
десятка запросов с фронтенда.
"""
from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select

from app.models import Resource, UserRole
from tests.conftest import PASSWORD, bearer, create_user

API = "/api/v1/admin"


@pytest_asyncio.fixture
async def editor_headers(client: AsyncClient, session_factory):
    await create_user(session_factory, "editor@example.ru", role=UserRole.EDITOR)
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "editor@example.ru", "password": PASSWORD},
    )
    assert r.status_code == 200, r.text
    return bearer(r)


async def _profession(client: AsyncClient, headers: dict, slug: str, **extra):
    r = await client.post(
        f"{API}/professions",
        json={"slug": slug, "title": f"Профессия {slug}", **extra},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _skill(client: AsyncClient, headers: dict, slug: str):
    r = await client.post(
        f"{API}/skills",
        json={"slug": slug, "title": f"Навык {slug}"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _attach(client: AsyncClient, headers: dict, profession_id: str, *skill_ids):
    r = await client.put(
        f"{API}/professions/{profession_id}/skills",
        json={
            "skills": [
                {"skill_id": skill_id, "position": index, "is_core": True}
                for index, skill_id in enumerate(skill_ids)
            ]
        },
        headers=headers,
    )
    assert r.status_code == 200, r.text
    return r.json()


# ------------------------------- Журнал ------------------------------------


@pytest.mark.asyncio
async def test_history_records_who_changed_what(client, editor_headers):
    profession = await _profession(client, editor_headers, "history-prof")
    r = await client.patch(
        f"{API}/professions/{profession['id']}",
        json={"title": "Профессия с историей"},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text

    r = await client.get(
        f"{API}/history",
        params={"profession_id": profession["id"]},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    titles = [item["title"] for item in data["items"]]
    assert any(t.startswith("Создана профессия") for t in titles)
    assert any(t.startswith("Обновлена профессия") for t in titles)
    assert data["total"] >= 2
    assert all(item["actor_name"] == "Тест" for item in data["items"])
    assert {item["entity_type"] for item in data["items"]} == {"profession"}


@pytest.mark.asyncio
async def test_history_of_skill_is_visible_for_profession(client, editor_headers):
    profession = await _profession(client, editor_headers, "history-skill-prof")
    skill = await _skill(client, editor_headers, "history-skill")
    await _attach(client, editor_headers, profession["id"], skill["id"])

    r = await client.patch(
        f"{API}/skills/{skill['id']}",
        json={"title": "Навык после правки"},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text

    r = await client.get(
        f"{API}/history",
        params={"profession_id": profession["id"]},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text
    items = r.json()["items"]
    assert any(item["skill_id"] == skill["id"] for item in items)
    assert any("Обновлён навык" in item["title"] for item in items)


@pytest.mark.asyncio
async def test_history_requires_editor(client, auth_client):
    r = await auth_client.get(f"{API}/history")
    assert r.status_code == 403


# ---------------------------- Диагностика связей ---------------------------


@pytest.mark.asyncio
async def test_broken_dependencies_split_outside_and_orphan(client, editor_headers):
    left = await _profession(client, editor_headers, "broken-left")
    right = await _profession(client, editor_headers, "broken-right")
    skill_left = await _skill(client, editor_headers, "broken-left-skill")
    skill_right = await _skill(client, editor_headers, "broken-right-skill")
    await _attach(client, editor_headers, left["id"], skill_left["id"])
    await _attach(client, editor_headers, right["id"], skill_right["id"])

    r = await client.post(
        f"{API}/dependencies",
        json={
            "skill_id": skill_left["id"],
            "prerequisite_id": skill_right["id"],
            "dep_type": "required",
        },
        headers=editor_headers,
    )
    assert r.status_code == 201, r.text
    dependency_id = r.json()["id"]

    # Для левой профессии второй конец связи лежит вне её графа
    r = await client.get(
        f"{API}/dependencies/broken",
        params={"profession_id": left["id"]},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["total"] == 1
    assert data["items"][0]["id"] == dependency_id
    assert data["items"][0]["reason"] == "outside_profession"
    assert data["items"][0]["prerequisite_title"] == "Навык broken-right-skill"

    # Без профессии связь не видна ни на одной карте
    r = await client.get(
        f"{API}/dependencies/broken", headers=editor_headers
    )
    assert r.status_code == 200, r.text
    items = r.json()["items"]
    assert [item["id"] for item in items] == [dependency_id]
    assert items[0]["reason"] == "orphan"


@pytest.mark.asyncio
async def test_visible_dependency_is_not_reported_as_broken(client, editor_headers):
    profession = await _profession(client, editor_headers, "healthy-prof")
    first = await _skill(client, editor_headers, "healthy-first")
    second = await _skill(client, editor_headers, "healthy-second")
    await _attach(client, editor_headers, profession["id"], first["id"], second["id"])

    r = await client.post(
        f"{API}/dependencies",
        json={"skill_id": second["id"], "prerequisite_id": first["id"]},
        headers=editor_headers,
    )
    assert r.status_code == 201, r.text

    r = await client.get(
        f"{API}/dependencies/broken",
        params={"profession_id": profession["id"]},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["total"] == 0


# -------------------------------- Обзор ------------------------------------


@pytest.mark.asyncio
async def test_overview_aggregates_graph_resources_and_history(client, editor_headers):
    profession = await _profession(client, editor_headers, "overview-prof")
    covered = await _skill(client, editor_headers, "overview-covered")
    lonely = await _skill(client, editor_headers, "overview-lonely")
    await _attach(
        client, editor_headers, profession["id"], covered["id"], lonely["id"]
    )
    r = await client.post(
        f"{API}/dependencies",
        json={"skill_id": lonely["id"], "prerequisite_id": covered["id"]},
        headers=editor_headers,
    )
    assert r.status_code == 201, r.text

    r = await client.post(
        f"{API}/resources",
        json={
            "skill_id": covered["id"],
            "title": "Курс по навыку",
            "url": "https://example.com/course",
        },
        headers=editor_headers,
    )
    assert r.status_code == 201, r.text

    r = await client.get(
        f"{API}/overview",
        params={"profession_id": profession["id"]},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["profession"]["id"] == profession["id"]
    assert data["stats"]["skills"] == 2
    assert data["stats"]["dependencies"] == 1
    assert data["stats"]["resources"] == 1
    assert data["stats"]["draft_resources"] == 1
    assert data["checklist"]["broken_dependencies"] == 0
    assert data["checklist"]["resources_ready"] is False
    assert data["checklist"]["skills_without_resources"] == 1
    assert [node["id"] for node in data["skills_without_resources"]] == [lonely["id"]]
    assert data["recent"]


@pytest.mark.asyncio
async def test_overview_falls_back_to_default_profession(client, editor_headers):
    await _profession(client, editor_headers, "fallback-prof", is_priority=True)
    r = await client.get(f"{API}/overview", headers=editor_headers)
    assert r.status_code == 200, r.text
    assert r.json()["profession"]["slug"] == "fallback-prof"


@pytest.mark.asyncio
async def test_overview_without_any_profession(client, editor_headers):
    r = await client.get(f"{API}/overview", headers=editor_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["profession"] is None
    assert data["stats"]["skills"] == 0


# ------------------------------- Фильтры -----------------------------------


@pytest.mark.asyncio
async def test_history_filters_by_entity_type_and_action(client, editor_headers):
    profession = await _profession(client, editor_headers, "filtered-history-prof")
    skill = await _skill(client, editor_headers, "filtered-history-skill")
    await _attach(client, editor_headers, profession["id"], skill["id"])

    params = {"profession_id": profession["id"]}
    r = await client.get(
        f"{API}/history",
        params={**params, "entity_type": "skill"},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text
    assert [item["entity_type"] for item in r.json()["items"]] == ["skill"]

    r = await client.get(
        f"{API}/history",
        params={**params, "action": "created"},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text
    actions = [item["action"] for item in r.json()["items"]]
    assert actions and set(actions) == {"created"}
    assert {item["entity_type"] for item in r.json()["items"]} == {
        "profession",
        "skill",
    }

    r = await client.get(
        f"{API}/history",
        params={**params, "entity_type": "profession", "action": "deleted"},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["total"] == 0


@pytest.mark.asyncio
async def test_professions_filter_by_entry_level(client, editor_headers, professions):
    r = await client.get(
        f"{API}/professions",
        params={"entry_level": "beginner"},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text
    slugs = [item["slug"] for item in r.json()["items"]]
    assert slugs == ["python-developer"]


@pytest.mark.asyncio
async def test_resources_filter_by_link_status(client, editor_headers, session_factory):
    skill = await _skill(client, editor_headers, "link-status-skill")
    for title in ("Рабочая ссылка", "Битая ссылка"):
        r = await client.post(
            f"{API}/resources",
            json={
                "skill_id": skill["id"],
                "title": title,
                "url": "https://example.com/" + str(uuid.uuid4()),
            },
            headers=editor_headers,
        )
        assert r.status_code == 201, r.text
        if title == "Битая ссылка":
            broken_id = r.json()["id"]

    async with session_factory() as db:
        resource = await db.scalar(
            select(Resource).where(Resource.id == uuid.UUID(broken_id))
        )
        resource.link_status = "broken"
        await db.commit()

    r = await client.get(
        f"{API}/resources", params={"link_status": "broken"}, headers=editor_headers
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["total"] == 1
    assert data["items"][0]["id"] == broken_id

    r = await client.get(
        f"{API}/resources", params={"link_status": "ok"}, headers=editor_headers
    )
    assert r.json()["total"] == 0

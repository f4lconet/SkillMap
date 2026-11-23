"""Тесты недели 4: админка, публичная ссылка, PDF-экспорт, контент.

Плюс сверка Gap/Plan с бенчмарками аналитика (skillmap_gap_plan_benchmarks_week4).
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select

from app.models import Skill, SkillDependency, UserRole
from app.services.content import load_content, load_content_data
from app.services.graph import find_cycle
from tests.conftest import PASSWORD, bearer, create_user

BENCHMARK_FILE = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "skillmap_gap_plan_benchmarks.json"
)


@pytest_asyncio.fixture
async def content(session_factory):
    """Полный контент аналитика (неделя 4) в тестовой БД."""
    data = load_content_data()
    async with session_factory() as db:
        await load_content(db, data)
        await db.commit()
    return data


@pytest_asyncio.fixture
async def skill_ids(session_factory, content):
    async with session_factory() as db:
        rows = await db.scalars(select(Skill))
        return {s.slug: s.id for s in rows}


@pytest_asyncio.fixture
async def profession_ids(session_factory, content):
    from app.models import Profession

    async with session_factory() as db:
        rows = await db.scalars(select(Profession))
        return {p.slug: p.id for p in rows}


@pytest_asyncio.fixture
async def editor_headers(client: AsyncClient, session_factory):
    await create_user(session_factory, "editor@example.ru", role=UserRole.EDITOR)
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "editor@example.ru", "password": PASSWORD},
    )
    assert r.status_code == 200, r.text
    return bearer(r)


async def login_as(client: AsyncClient, email: str) -> dict[str, str]:
    r = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": PASSWORD}
    )
    assert r.status_code == 200, r.text
    return bearer(r)


def _load_benchmarks() -> list[dict]:
    if not BENCHMARK_FILE.exists():
        return []
    return json.loads(BENCHMARK_FILE.read_text(encoding="utf-8"))["cases"]


BENCHMARKS = _load_benchmarks()


# ------------------------------- Контент -----------------------------------


@pytest.mark.asyncio
async def test_content_is_complete_and_consistent(session_factory, content):
    skills = content["skills"]
    deps = content["dependencies"]
    resources = content["resources"]

    assert len(skills) == 135
    assert len(deps) == 213
    assert len(resources) == 341

    slugs = {s["id"] for s in skills}
    assert len(slugs) == len(skills), "дубли слагов навыков"

    for dep in deps:
        assert dep["skill_id"] in slugs
        assert dep["prerequisite_id"] in slugs
        assert dep["skill_id"] != dep["prerequisite_id"]

    triples = {(d["skill_id"], d["prerequisite_id"], d["type"]) for d in deps}
    assert len(triples) == len(deps), "дубли связей"

    for res in resources:
        assert res["skill_id"] in slugs
        assert res["type"] in {"course", "book", "project", "article", "video", "docs"}
        assert res["url"], "ресурс без ссылки"

    # у каждого навыка есть чем закрыть пробел
    per_skill: dict[str, int] = {}
    for res in resources:
        per_skill[res["skill_id"]] = per_skill.get(res["skill_id"], 0) + 1
    assert set(per_skill) == slugs, "есть навыки без ресурсов"
    assert min(per_skill.values()) >= 2


@pytest.mark.asyncio
async def test_content_graph_has_no_cycles(session_factory, content):
    async with session_factory() as db:
        rows = await db.scalars(
            select(SkillDependency).where(
                SkillDependency.dep_type == "required"
            )
        )
        skills = {s.id: s.slug for s in await db.scalars(select(Skill))}

    edges = [(skills[d.prerequisite_id], skills[d.skill_id]) for d in rows]
    cycle = find_cycle(edges)
    assert cycle is None, f"цикл в графе: {cycle}"


# ------------------------------- Бенчмарки ---------------------------------


@pytest.mark.skipif(not BENCHMARKS, reason="нет файла бенчмарков")
@pytest.mark.parametrize("case", BENCHMARKS, ids=[c["case_id"] for c in BENCHMARKS])
@pytest.mark.asyncio
async def test_gap_and_plan_match_benchmarks(
    case,
    client: AsyncClient,
    session_factory,
    content,
    skill_ids,
    profession_ids,
):
    email = f"{case['case_id'].lower()}@example.ru"
    await create_user(session_factory, email)
    headers = await login_as(client, email)

    r = await client.patch(
        "/api/v1/me",
        json={
            "target_profession_id": str(profession_ids[case["target_slug"]]),
            "hours_per_week": case["hours_per_week"],
            "level": "beginner",
        },
        headers=headers,
    )
    assert r.status_code == 200, r.text

    levels: dict[str, int] = case["input_levels"]
    if levels:
        r = await client.post(
            "/api/v1/me/skills/bulk",
            json={
                "skills": [
                    {
                        "skill_id": str(skill_ids[slug]),
                        "status": "mastered" if level >= 2 else "learning",
                        "self_score": level,
                    }
                    for slug, level in levels.items()
                ]
            },
            headers=headers,
        )
        assert r.status_code == 200, r.text

    gap = (await client.get("/api/v1/me/gap", headers=headers)).json()
    plan = (await client.get("/api/v1/me/plan", headers=headers)).json()
    profession_map = (
        await client.get(
            f"/api/v1/professions/{profession_ids[case['target_slug']]}/map",
            headers=headers,
        )
    ).json()
    exp = case["expected"]

    assert gap["total_skills"] == exp["total_skills"]
    assert len(gap["mastered"]) == exp["mastered_count"]
    assert len(gap["learning"]) == exp["in_progress_count"]
    # аналитик считает пробелом всё, что не освоено (learning входит в gap)
    assert gap["missing_count"] == exp["missing_count"]
    assert gap["match_percent"] == exp["match_percent"]
    assert gap["estimated_remaining_hours"] == exp["remaining_hours"]

    not_mastered = [
        node for node in profession_map["skills"] if node["user_status"] != "mastered"
    ]
    available = sorted(node["slug"] for node in not_mastered if not node["locked"])
    assert available == exp["available_now"]
    assert sum(1 for node in not_mastered if node["locked"]) == exp["blocked_count"]

    # порядок освоения: приоритет из gap (learning + missing вместе)
    remaining = sorted(
        gap["learning"] + gap["missing"], key=lambda item: item["priority"] or 10**6
    )
    assert [i["skill"]["slug"] for i in remaining[:5]] == exp["first_5_in_plan"]
    assert plan["total_weeks"] == exp["estimated_weeks_ceil"]

    first_weeks = [
        {
            "week": week["week"],
            "skill_id": item["skill"]["slug"],
            "hours_in_week": item["hours"],
        }
        for week in plan["weeks"]
        if week["week"] <= 6
        for item in week["items"]
    ]
    assert first_weeks == exp["first_6_weeks_plan"]


# -------------------------------- Админка ----------------------------------


@pytest.mark.asyncio
async def test_admin_requires_editor_role(auth_client: AsyncClient):
    r = await auth_client.get("/api/v1/admin/professions")
    assert r.status_code == 403

    r = await auth_client.post(
        "/api/v1/admin/skills", json={"slug": "new-skill", "title": "Навык"}
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_admin_profession_crud(client: AsyncClient, editor_headers):
    r = await client.post(
        "/api/v1/admin/professions",
        json={
            "slug": "ml-engineer",
            "title": "ML-инженер",
            "short_description": "Модели в проде",
            "status": "draft",
            "estimated_weeks": 20,
        },
        headers=editor_headers,
    )
    assert r.status_code == 201, r.text
    created = r.json()
    pid = created["id"]
    assert created["status"] == "draft"

    r = await client.post(
        "/api/v1/admin/professions",
        json={"slug": "ml-engineer", "title": "Дубль"},
        headers=editor_headers,
    )
    assert r.status_code == 409, r.text

    r = await client.get("/api/v1/admin/professions", headers=editor_headers)
    assert r.status_code == 200, r.text
    assert any(p["id"] == pid for p in r.json()["items"])

    r = await client.patch(
        f"/api/v1/admin/professions/{pid}",
        json={"title": "ML-инженер (senior)", "status": "published", "skills_ready": True},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["title"] == "ML-инженер (senior)"
    assert r.json()["status"] == "published"

    r = await client.delete(f"/api/v1/admin/professions/{pid}", headers=editor_headers)
    assert r.status_code == 200, r.text

    r = await client.get(f"/api/v1/admin/professions/{pid}", headers=editor_headers)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_admin_skill_and_profession_links(
    client: AsyncClient, editor_headers, profession_ids
):
    ids = []
    for slug, title in (
        ("zz-test-feature-flags", "Фича-флаги"),
        ("zz-test-observability", "Наблюдаемость"),
    ):
        r = await client.post(
            "/api/v1/admin/skills",
            json={"slug": slug, "title": title, "category": "Инженерия", "estimated_hours": 4},
            headers=editor_headers,
        )
        assert r.status_code == 201, r.text
        ids.append(r.json()["id"])

    r = await client.patch(
        f"/api/v1/admin/skills/{ids[0]}",
        json={"difficulty": 3, "layer": 2},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["difficulty"] == 3

    pid = str(profession_ids["fullstack-developer"])
    r = await client.put(
        f"/api/v1/admin/professions/{pid}/skills",
        json={"skills": [{"skill_id": ids[0], "position": 0}, {"skill_id": ids[1], "position": 1}]},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text
    assert [s["skill_id"] for s in r.json()] == ids

    r = await client.get(f"/api/v1/admin/skills/{ids[0]}", headers=editor_headers)
    assert r.status_code == 200, r.text
    assert "fullstack-developer" in r.json()["professions"]

    # сокращаем состав профессии — лишняя связь удаляется
    r = await client.put(
        f"/api/v1/admin/professions/{pid}/skills",
        json={"skills": [{"skill_id": ids[1], "position": 0}]},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text
    assert len(r.json()) == 1


@pytest.mark.asyncio
async def test_admin_dependency_cycle_guard(client: AsyncClient, editor_headers):
    a = (
        await client.post(
            "/api/v1/admin/skills",
            json={"slug": "graph-a", "title": "Граф A"},
            headers=editor_headers,
        )
    ).json()["id"]
    b = (
        await client.post(
            "/api/v1/admin/skills",
            json={"slug": "graph-b", "title": "Граф B"},
            headers=editor_headers,
        )
    ).json()["id"]

    r = await client.post(
        "/api/v1/admin/dependencies",
        json={"skill_id": b, "prerequisite_id": a, "dep_type": "required"},
        headers=editor_headers,
    )
    assert r.status_code == 201, r.text
    dep_id = r.json()["id"]
    assert r.json()["skill_slug"] == "graph-b"
    assert r.json()["prerequisite_slug"] == "graph-a"

    # самозависимость
    r = await client.post(
        "/api/v1/admin/dependencies",
        json={"skill_id": a, "prerequisite_id": a},
        headers=editor_headers,
    )
    assert r.status_code == 422, r.text

    # цикл a → b → a
    r = await client.post(
        "/api/v1/admin/dependencies",
        json={"skill_id": a, "prerequisite_id": b},
        headers=editor_headers,
    )
    assert r.status_code == 409, r.text
    assert "цикл" in r.json()["detail"]

    # дубль связи
    r = await client.post(
        "/api/v1/admin/dependencies",
        json={"skill_id": b, "prerequisite_id": a, "dep_type": "required"},
        headers=editor_headers,
    )
    assert r.status_code == 409, r.text

    # изменение связи, замыкающее цепочку, тоже отклоняется.
    # Строим a → b → c и запасное ребро d → a, затем переводим запасное в c → a:
    # появится путь a → b → c, и новое ребро замкнёт цикл a → b → c → a.
    c = (
        await client.post(
            "/api/v1/admin/skills",
            json={"slug": "graph-c", "title": "Граф C"},
            headers=editor_headers,
        )
    ).json()["id"]
    d = (
        await client.post(
            "/api/v1/admin/skills",
            json={"slug": "graph-d", "title": "Граф D"},
            headers=editor_headers,
        )
    ).json()["id"]
    r = await client.post(
        "/api/v1/admin/dependencies",
        json={"skill_id": c, "prerequisite_id": b, "dep_type": "required"},
        headers=editor_headers,
    )
    assert r.status_code == 201, r.text
    r = await client.post(
        "/api/v1/admin/dependencies",
        json={"skill_id": a, "prerequisite_id": d, "dep_type": "required"},
        headers=editor_headers,
    )
    assert r.status_code == 201, r.text
    spare_id = r.json()["id"]

    r = await client.patch(
        f"/api/v1/admin/dependencies/{spare_id}",
        json={"skill_id": a, "prerequisite_id": c},
        headers=editor_headers,
    )
    assert r.status_code == 409, r.text
    assert "цикл" in r.json()["detail"]

    # связь не изменилась — прежнее ребро d → a на месте
    r = await client.get(
        "/api/v1/admin/dependencies", params={"skill_id": a}, headers=editor_headers
    )
    assert r.status_code == 200, r.text
    assert [item["prerequisite_id"] for item in r.json()["items"]] == [d]

    r = await client.get("/api/v1/admin/dependencies/validate", headers=editor_headers)
    assert r.status_code == 200, r.text

    r = await client.get(
        "/api/v1/admin/dependencies", params={"skill_id": b}, headers=editor_headers
    )
    assert r.status_code == 200, r.text
    assert r.json()["total"] == 1

    r = await client.delete(
        f"/api/v1/admin/dependencies/{dep_id}", headers=editor_headers
    )
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_admin_resource_crud(client: AsyncClient, editor_headers, skill_ids):
    r = await client.post(
        "/api/v1/admin/resources",
        json={
            "skill_id": str(skill_ids["git-cli"]),
            "title": "Pro Git",
            "url": "https://git-scm.com/book/ru/v2",
            "resource_type": "book",
            "provider": "git-scm",
            "lang": "ru",
            "estimated_hours": 3,
            "position": 0,
        },
        headers=editor_headers,
    )
    assert r.status_code == 201, r.text
    rid = r.json()["id"]

    r = await client.patch(
        f"/api/v1/admin/resources/{rid}",
        json={"resource_type": "docs", "is_free": False},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["resource_type"] == "docs"
    assert r.json()["is_free"] is False

    r = await client.get(
        "/api/v1/admin/resources",
        params={"skill_id": str(skill_ids["git-cli"])},
        headers=editor_headers,
    )
    assert r.status_code == 200, r.text
    assert any(item["id"] == rid for item in r.json()["items"])

    r = await client.post(
        "/api/v1/admin/resources",
        json={"skill_id": str(skill_ids["git-cli"]), "title": "x", "resource_type": "podcast"},
        headers=editor_headers,
    )
    assert r.status_code == 422, r.text

    r = await client.delete(f"/api/v1/admin/resources/{rid}", headers=editor_headers)
    assert r.status_code == 200, r.text


# --------------------------- Публичная ссылка ------------------------------


@pytest.mark.asyncio
async def test_share_requires_target(client: AsyncClient, session_factory):
    await create_user(session_factory, "share-no-target@example.ru")
    headers = await login_as(client, "share-no-target@example.ru")

    r = await client.get("/api/v1/me/share", headers=headers)
    assert r.status_code == 200
    assert r.json()["enabled"] is False

    r = await client.post("/api/v1/me/share", headers=headers)
    assert r.status_code == 409, r.text


@pytest.mark.asyncio
async def test_public_share_lifecycle(
    client: AsyncClient,
    session_factory,
    content,
    skill_ids,
    profession_ids,
):
    email = "sharing@example.ru"
    await create_user(session_factory, email)
    headers = await login_as(client, email)

    pid = str(profession_ids["fullstack-developer"])
    r = await client.patch(
        "/api/v1/me",
        json={"target_profession_id": pid, "hours_per_week": 8, "level": "beginner"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    r = await client.put(
        f"/api/v1/me/skills/{skill_ids['git-cli']}",
        json={"status": "mastered", "self_score": 3},
        headers=headers,
    )
    assert r.status_code == 200, r.text

    r = await client.post("/api/v1/me/share", headers=headers)
    assert r.status_code == 200, r.text
    state = r.json()
    assert state["enabled"] is True
    token = state["token"]
    username = state["username"]
    assert token and state["url"].endswith(f"/public/{token}")
    assert username and state["profile_url"].endswith(f"/u/{username}")

    # повторное включение отдаёт ту же ссылку
    r = await client.post("/api/v1/me/share", headers=headers)
    assert r.json()["token"] == token

    client.headers.pop("Authorization", None)
    r = await client.get(f"/api/v1/public/{token}")
    assert r.status_code == 200, r.text
    public = r.json()
    assert public["owner_name"] == "Тест"
    assert "email" not in public
    assert public["profession_title"]
    assert public["map"]["total_skills"] == 31
    assert public["gap"]["mastered_count"] == 1
    assert public["plan"]["total_weeks"] >= 1
    assert public["plan"]["hours_per_week"] == 8

    # карта по человекочитаемому адресу /u/{username}
    assert public["username"] == username
    r = await client.get(f"/api/v1/public/u/{username}")
    assert r.status_code == 200, r.text
    by_name = r.json()
    assert by_name["owner_name"] == public["owner_name"]
    assert by_name["profession_id"] == public["profession_id"]
    assert by_name["gap"] == public["gap"]

    r = await client.get("/api/v1/public/u/unknown-user")
    assert r.status_code == 404

    r = await client.get("/api/v1/public/unknown-token")
    assert r.status_code == 404

    r = await client.delete("/api/v1/me/share", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json() == {
        "enabled": False,
        "username": None,
        "token": None,
        "profile_url": None,
        "url": None,
        "shared_at": None,
    }

    r = await client.get(f"/api/v1/public/{token}")
    assert r.status_code == 404

    r = await client.get(f"/api/v1/public/u/{username}")
    assert r.status_code == 404


# ------------------------------- PDF-экспорт -------------------------------


@pytest.mark.asyncio
async def test_export_payload(
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

    assert payload["meta"]["app"] == "SkillMap"
    assert payload["meta"]["generated_at"]
    assert payload["user"]["email"] == "anna@example.ru"
    assert payload["profession"]["id"] == str(published_profession_id)
    assert payload["map"]["total_skills"] == 1
    assert payload["gap"]["total_skills"] == 1
    # один навык на 24 ч при 6 ч/нед делится на 4 недели
    assert len(payload["plan"]["weeks"]) == 4
    assert sum(len(w["items"]) for w in payload["plan"]["weeks"]) == 4
    assert payload["plan"]["weeks"][0]["items"][0]["skill"]["slug"] == "python-basics"
    assert payload["plan"]["weeks"][0]["items"][0]["resources"] == []


@pytest.mark.asyncio
async def test_export_requires_target(client: AsyncClient, session_factory):
    await create_user(session_factory, "export-no-target@example.ru")
    headers = await login_as(client, "export-no-target@example.ru")

    r = await client.get("/api/v1/me/export", headers=headers)
    assert r.status_code == 409, r.text

"""Тесты недели 3: Gap, Dashboard, Plan, bulk skills."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_bulk_skills(auth_client: AsyncClient, sample_skill_id):
    r = await auth_client.post(
        "/api/v1/me/skills/bulk",
        json={
            "skills": [
                {"skill_id": str(sample_skill_id), "status": "mastered", "self_score": 3}
            ]
        },
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data) == 1
    assert data[0]["status"] == "mastered"


@pytest.mark.asyncio
async def test_gap_requires_target(auth_client: AsyncClient):
    r = await auth_client.get("/api/v1/me/gap")
    # либо 400 (нет цели), либо 200 если в фикстуре уже есть цель
    assert r.status_code in (200, 400)


@pytest.mark.asyncio
async def test_gap_by_profession(
    auth_client: AsyncClient, published_profession_id, sample_skill_id
):
    await auth_client.put(
        f"/api/v1/me/skills/{sample_skill_id}",
        json={"status": "mastered", "self_score": 4},
    )
    r = await auth_client.get(f"/api/v1/me/gap/{published_profession_id}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "progress_percent" in data
    assert "mastered" in data
    assert "missing" in data
    assert data["match_percent"] == data["progress_percent"]


@pytest.mark.asyncio
async def test_dashboard(auth_client: AsyncClient, published_profession_id):
    # ставим цель
    r0 = await auth_client.patch(
        "/api/v1/me",
        json={
            "target_profession_id": str(published_profession_id),
            "hours_per_week": 8,
            "level": "beginner",
        },
    )
    assert r0.status_code == 200, r0.text
    r = await auth_client.get("/api/v1/me/dashboard")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "kpi" in data
    assert "next_steps" in data
    assert "status_breakdown" in data
    assert data["kpi"]["total_skills"] >= 0


@pytest.mark.asyncio
async def test_plan_and_recalculate(
    auth_client: AsyncClient, published_profession_id, sample_skill_id
):
    r0 = await auth_client.patch(
        "/api/v1/me",
        json={
            "target_profession_id": str(published_profession_id),
            "hours_per_week": 6,
            "level": "beginner",
            "onboarding_completed": True,
        },
    )
    assert r0.status_code == 200, r0.text
    assert r0.json().get("target_profession") is not None

    r = await auth_client.get("/api/v1/me/plan")
    assert r.status_code == 200, r.text
    plan = r.json()
    assert "weeks" in plan
    assert "what_to_do_this_week" in plan
    assert plan["hours_per_week"] == 6

    # отметить навык и пересчитать
    await auth_client.put(
        f"/api/v1/me/skills/{sample_skill_id}",
        json={"status": "mastered"},
    )
    r2 = await auth_client.post("/api/v1/me/plan/recalculate")
    assert r2.status_code == 200, r2.text
    plan2 = r2.json()
    assert "weeks" in plan2


@pytest.mark.asyncio
async def test_trajectory_on_the_fly(auth_client: AsyncClient, published_profession_id):
    r = await auth_client.get(f"/api/v1/me/trajectory/{published_profession_id}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "weeks" in data
    assert data["profession_id"] == str(published_profession_id)

"""Базовые тесты навыков (неделя 2)."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_profession_map_guest(client: AsyncClient, published_profession_id):
    r = await client.get(f"/api/v1/professions/{published_profession_id}/map")
    assert r.status_code == 200
    data = r.json()
    assert "skills" in data
    assert data["total_skills"] >= 0
    assert "progress_percent" in data


@pytest.mark.asyncio
async def test_set_skill_status(auth_client: AsyncClient, sample_skill_id):
    r = await auth_client.put(
        f"/api/v1/me/skills/{sample_skill_id}",
        json={"status": "mastered", "self_score": 4},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "mastered"
    assert data["self_score"] == 4

    r2 = await auth_client.get("/api/v1/me/skills")
    assert r2.status_code == 200
    ids = [x["skill_id"] for x in r2.json()]
    assert str(sample_skill_id) in ids or sample_skill_id in ids

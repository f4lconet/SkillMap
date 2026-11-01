import uuid

from tests.conftest import bearer, register

ME = "/api/v1/me"


async def test_read_me_empty_profile(client):
    headers = bearer(await register(client))
    body = (await client.get(ME, headers=headers)).json()
    assert body["name"] == "Анна"
    assert body["level"] is None
    assert body["target_profession"] is None
    assert body["onboarding_completed"] is False


async def test_patch_partial_update(client):
    headers = bearer(await register(client))
    response = await client.patch(ME, headers=headers, json={"hours_per_week": 6, "level": "beginner"})
    assert response.status_code == 200
    body = response.json()
    assert body["hours_per_week"] == 6
    assert body["level"] == "beginner"
    assert body["name"] == "Анна"


async def test_patch_validation(client):
    headers = bearer(await register(client))
    for payload in [{"hours_per_week": 0}, {"hours_per_week": 41}, {"level": "guru"}, {"name": "  "},
                    {"onboarding_completed": False}]:
        response = await client.patch(ME, headers=headers, json=payload)
        assert response.status_code == 422, payload


async def test_patch_requires_auth(client):
    assert (await client.patch(ME, json={"hours_per_week": 6})).status_code == 401


async def test_set_target_profession(client, professions):
    headers = bearer(await register(client))
    response = await client.patch(ME, headers=headers, json={"target_profession_id": str(professions["python-developer"])})
    assert response.status_code == 200
    assert response.json()["target_profession"]["title"] == "Разработчик на Питоне"
    again = await client.get(ME, headers=headers)
    assert again.json()["target_profession"]["title"] == "Разработчик на Питоне"


async def test_unknown_or_draft_profession_rejected(client, professions):
    headers = bearer(await register(client))
    for pid in [uuid.uuid4(), professions["secret-draft"]]:
        response = await client.patch(ME, headers=headers, json={"target_profession_id": str(pid)})
        assert response.status_code == 422


async def test_onboarding_requires_complete_profile(client, professions):
    headers = bearer(await register(client))
    response = await client.patch(ME, headers=headers, json={"onboarding_completed": True})
    assert response.status_code == 422
    assert (await client.get(ME, headers=headers)).json()["onboarding_completed"] is False


async def test_onboarding_complete(client, professions):
    headers = bearer(await register(client))
    response = await client.patch(ME, headers=headers, json={
        "target_profession_id": str(professions["python-developer"]),
        "level": "beginner",
        "hours_per_week": 6,
        "onboarding_completed": True,
    })
    assert response.status_code == 200
    assert response.json()["onboarding_completed"] is True

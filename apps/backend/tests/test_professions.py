import uuid

P = "/api/v1/professions"


async def test_catalog_is_public_and_hides_drafts(client, professions):
    response = await client.get(P)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    titles = [i["title"] for i in body["items"]]
    assert "Черновик профессии" not in titles
    assert titles == sorted(titles)
    card = body["items"][0]
    assert {"id", "slug", "title", "direction", "skills_count", "estimated_weeks"} <= card.keys()


async def test_search_and_filter(client, professions):
    found = (await client.get(P, params={"q": "PYTHON"})).json()
    assert [i["slug"] for i in found["items"]] == ["python-developer"]
    by_direction = (await client.get(P, params={"direction": "Аналитика"})).json()
    assert [i["slug"] for i in by_direction["items"]] == ["data-analyst"]


async def test_search_escapes_like_symbols(client, professions):
    assert (await client.get(P, params={"q": "%"})).json()["total"] == 1  # только «100%» в описании
    assert (await client.get(P, params={"q": "_"})).json()["total"] == 0


async def test_pagination(client, professions):
    page = (await client.get(P, params={"limit": 2, "offset": 2})).json()
    assert page["total"] == 3
    assert len(page["items"]) == 1
    assert (await client.get(P, params={"limit": 100})).status_code == 422


async def test_directions(client, professions):
    assert (await client.get(f"{P}/directions")).json() == ["Аналитика", "Разработка", "Управление"]


async def test_detail_and_404(client, professions):
    ok = await client.get(f"{P}/{professions['python-developer']}")
    assert ok.status_code == 200
    assert ok.json()["description"] == "Серверные приложения на Python"
    assert (await client.get(f"{P}/{professions['secret-draft']}")).status_code == 404
    assert (await client.get(f"{P}/{uuid.uuid4()}")).status_code == 404

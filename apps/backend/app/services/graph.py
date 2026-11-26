"""Структурные проверки графа навыков — неделя 4.

Используется админкой при сохранении связей между навыками: граф должен
оставаться ациклическим, иначе топологическая сортировка в плане и
Gap Analysis теряет смысл.
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from collections.abc import Hashable

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SkillDependency


def find_cycle[NodeT: Hashable](
    edges: list[tuple[NodeT, NodeT]],
) -> list[NodeT] | None:
    """Ищет цикл в направленном графе prerequisite → skill.

    Возвращает путь цикла (первый узел повторён в конце) или None.
    Работает с любыми хешируемыми узлами: UUID в БД, slug в контенте.
    """
    graph: dict[NodeT, list[NodeT]] = defaultdict(list)
    nodes: set[NodeT] = set()
    for skill_id, prerequisite_id in edges:
        graph[prerequisite_id].append(skill_id)
        nodes.add(skill_id)
        nodes.add(prerequisite_id)

    color: dict[NodeT, int] = {}
    stack: list[NodeT] = []

    def dfs(node: NodeT) -> list[NodeT] | None:
        color[node] = 1
        stack.append(node)
        for nxt in graph.get(node, []):
            state = color.get(nxt, 0)
            if state == 1:
                return stack[stack.index(nxt) :] + [nxt]
            if state == 0:
                found = dfs(nxt)
                if found is not None:
                    return found
        stack.pop()
        color[node] = 2
        return None

    for node in nodes:
        if color.get(node, 0) == 0:
            found = dfs(node)
            if found is not None:
                return found
    return None


def path_exists(
    edges: list[tuple[uuid.UUID, uuid.UUID]],
    source: uuid.UUID,
    target: uuid.UUID,
) -> bool:
    """Есть ли путь source → target по направлению prerequisite → skill."""
    graph: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    for skill_id, prerequisite_id in edges:
        graph[prerequisite_id].append(skill_id)
    seen = {source}
    queue = [source]
    while queue:
        node = queue.pop()
        if node == target:
            return True
        for nxt in graph.get(node, []):
            if nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)
    return False


async def _all_edges(
    db: AsyncSession, *, exclude_id: uuid.UUID | None = None
) -> list[tuple[uuid.UUID, uuid.UUID]]:
    rows = await db.execute(
        select(
            SkillDependency.id,
            SkillDependency.skill_id,
            SkillDependency.prerequisite_id,
        )
    )
    return [
        (skill_id, prerequisite_id)
        for dep_id, skill_id, prerequisite_id in rows
        if dep_id != exclude_id
    ]


async def ensure_edge_is_safe(
    db: AsyncSession,
    skill_id: uuid.UUID,
    prerequisite_id: uuid.UUID,
    *,
    exclude_id: uuid.UUID | None = None,
) -> None:
    """Проверяет, что связь prerequisite → skill не создаёт цикл."""
    if skill_id == prerequisite_id:
        raise HTTPException(
            422,
            "Навык не может зависеть от самого себя",
        )
    edges = await _all_edges(db, exclude_id=exclude_id)
    if path_exists(edges, skill_id, prerequisite_id):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Связь создаёт цикл в графе навыков",
        )


async def find_graph_cycle(db: AsyncSession) -> list[uuid.UUID] | None:
    """Цикл во всём графе навыков или None — диагностика для админки."""
    return find_cycle(await _all_edges(db))


async def ensure_graph_has_no_cycles(db: AsyncSession) -> None:
    """Проверка всего графа — для публикации контента и диагностики."""
    cycle = await find_graph_cycle(db)
    if cycle is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "В графе навыков найден цикл: " + " → ".join(str(n) for n in cycle),
        )

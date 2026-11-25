"""Единые границы пагинации для всех списочных ручек (неделя 5).

Зачем: до недели 5 каждый эндпоинт объявлял свои границы (50 / 200 / 500),
а `offset` вообще не ограничивался сверху — запрос с огромным смещением
заставлял БД читать и отбрасывать всю таблицу. Здесь границы собраны в
одном месте и продублированы защитным клампингом в сервисах, чтобы
внутренние вызовы (скрипты, импорт, тесты) тоже не могли запросить всё.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Query

# Публичный каталог маленький и отдаётся целиком одной страницей.
PUBLIC_MAX_LIMIT = 50
DEFAULT_PUBLIC_LIMIT = 20

# Админка: таблицы навыков/связей/ресурсов на порядок больше каталога.
MAX_LIMIT = 200
DEFAULT_ADMIN_LIMIT = 50
DEFAULT_ADMIN_LARGE_LIMIT = 200

# Дальше — только через фильтры (q, skill_id, profession_id), не через offset.
MAX_OFFSET = 10_000

PublicLimitQuery = Annotated[
    int,
    Query(ge=1, le=PUBLIC_MAX_LIMIT, description=f"Размер страницы, 1..{PUBLIC_MAX_LIMIT}"),
]
LimitQuery = Annotated[
    int,
    Query(ge=1, le=MAX_LIMIT, description=f"Размер страницы, 1..{MAX_LIMIT}"),
]
OffsetQuery = Annotated[
    int,
    Query(ge=0, le=MAX_OFFSET, description=f"Смещение, 0..{MAX_OFFSET}"),
]


@dataclass(frozen=True)
class Page:
    limit: int
    offset: int


def clamp_page(limit: int, offset: int, *, max_limit: int = MAX_LIMIT) -> Page:
    """Защитный клампинг для сервисов: HTTP-границы уже проверил FastAPI."""
    safe_limit = max(1, min(int(limit), max_limit))
    safe_offset = max(0, min(int(offset), MAX_OFFSET))
    return Page(limit=safe_limit, offset=safe_offset)


__all__ = [
    "DEFAULT_ADMIN_LARGE_LIMIT",
    "DEFAULT_ADMIN_LIMIT",
    "DEFAULT_PUBLIC_LIMIT",
    "MAX_LIMIT",
    "MAX_OFFSET",
    "PUBLIC_MAX_LIMIT",
    "LimitQuery",
    "OffsetQuery",
    "Page",
    "PublicLimitQuery",
    "clamp_page",
]

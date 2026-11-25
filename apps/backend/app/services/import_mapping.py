"""Сопоставление внешних сигналов (GitHub, Stepik) с навыками SkillMap.

Модуль намеренно не знает ни про сеть, ни про БД: на вход идут «сигналы»
(язык репозитория, тема, название курса), на выходе — навыки с уверенностью.
Это позволяет прогонять маппинг в тестах без обращений к внешним API.

Слои маппинга (от точного к мягкому):
1. `LANGUAGE_SKILLS` — точное совпадение с языком GitHub;
2. `EXTRA_KEYWORDS` — курируемые ключевые слова, которых нет в названиях навыков
   (django, k8s, tensorflow…), включая многословные фразы;
3. индекс алиасов из самого контента: сегменты slug + латинские и русские слова
   названия навыка.

Итоговая уверенность считается по схеме noisy-OR: `1 - Π(1 - c_i)`.
"""

from __future__ import annotations

import re
import uuid
from collections import defaultdict
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from typing import Protocol

MAX_CONFIDENCE = 0.95
# Алиас, встречающийся в большем числе навыков, слишком общий, чтобы что-то доказывать
MAX_ALIAS_FANOUT = 3
MIN_LATIN_LEN = 3
MIN_CYRILLIC_LEN = 5
CYRILLIC_STEM_LEN = 5

# Уверенность по типу сигнала
LANGUAGE_CONFIDENCE = 0.85
COURSE_CONFIDENCE = 0.6
TOPIC_CONFIDENCE = 0.5
SUMMARY_CONFIDENCE = 0.35

_LATIN_RE = re.compile(r"[a-z][a-z0-9+#]*(?:[.\-][a-z0-9+#]+)*")
_SPLIT_RE = re.compile(r"[^0-9a-zа-яё+#]+")

# Слова, которые встречаются почти в каждом названии и ничего не различают
_STOPWORDS = frozenset(
    {
        "basics",
        "basic",
        "advanced",
        "concepts",
        "intro",
        "introduction",
        "guide",
        "practice",
        "the",
        "and",
        "for",
        "with",
        "основы",
        "основа",
        "введение",
        "базовый",
        "продвинутый",
        "применение",
        "практика",
        "практикум",
        "курс",
        "тренажер",
        "интерактивный",
        "полный",
        "быстрый",
        "старт",
        "для",
        "начинающих",
        "новичков",
        "часть",
        "уровень",
    }
)

# Языки GitHub → навыки. Точное совпадение, поэтому уверенность высокая.
# Пустой кортеж = язык поддерживается GitHub, но навыка под него в контенте нет:
# такой сигнал попадёт в `unmatched`, а не привяжется наугад.
LANGUAGE_SKILLS: dict[str, tuple[str, ...]] = {
    "python": ("py-basics",),
    "javascript": ("js-basics",),
    "typescript": ("typescript",),
    "html": ("html-semantic",),
    "css": ("css-layout",),
    "scss": ("css-layout",),
    "sass": ("css-layout",),
    "shell": ("shell-scripting",),
    "bash": ("shell-scripting",),
    "powershell": ("shell-scripting",),
    "dockerfile": ("docker-basics",),
    "hcl": ("terraform",),
    "jupyter notebook": ("jupyter",),
    "sql": ("sql-queries",),
    "plpgsql": ("sql-queries",),
    "go": (),
    "rust": (),
    "java": (),
    "kotlin": (),
    "swift": (),
    "ruby": (),
    "php": (),
    "c": (),
    "c++": (),
    "c#": (),
    "vue": (),
    "svelte": (),
    "makefile": (),
}

# Ключевые слова, которые не выводятся из названий навыков: внешние инструменты,
# библиотеки и сокращения, встречающиеся в названиях репозиториев и курсов.
EXTRA_KEYWORDS: dict[str, tuple[str, ...]] = {
    # Слова с неоднозначными алиасами: без явного правила «React» тянул бы за собой
    # и react-concepts, и react-native, а «Python» — сразу py-basics и py-oop.
    "python": ("py-basics",),
    "javascript": ("js-basics",),
    "typescript": ("typescript",),
    "html": ("html-semantic",),
    "css": ("css-layout",),
    "sql": ("sql-queries",),
    "git": ("git-cli",),
    "github": ("git-cli",),
    "docker": ("docker-basics",),
    "linux": ("linux-basics",),
    "react": ("react",),
    "node": ("nodejs",),
    "postgresql": ("postgresql",),
    "figma": ("figma-basics",),
    # Python / ML
    "tensorflow": ("deep-learning",),
    "keras": ("deep-learning",),
    "opencv": ("cv-basics",),
    "matplotlib": ("data-viz",),
    "seaborn": ("data-viz",),
    "plotly": ("data-viz",),
    "scikit learn": ("sklearn",),
    "spacy": ("nlp-basics",),
    "transformers": ("nlp-basics",),
    "xgboost": ("trees-ensembles",),
    "lightgbm": ("trees-ensembles",),
    "catboost": ("trees-ensembles",),
    "airflow": ("mlops-basics",),
    "mlflow": ("mlops-basics",),
    # Backend / инфраструктура
    "django": ("node-framework",),
    "fastapi": ("node-framework",),
    "flask": ("node-framework",),
    "express": ("node-framework",),
    "next js": ("node-framework",),
    "nextjs": ("node-framework",),
    "postgres": ("postgresql",),
    "mongo": ("db-schema",),
    "redis": ("cache-queues",),
    "kafka": ("cache-queues",),
    "rabbitmq": ("cache-queues",),
    "celery": ("cache-queues",),
    "k8s": ("kubernetes",),
    "helm": ("kubernetes",),
    "github actions": ("ci-cd",),
    "gitlab ci": ("ci-cd",),
    "jenkins": ("ci-cd",),
    "prometheus": ("observability",),
    "grafana": ("observability",),
    "nginx": ("nginx-proxy",),
    "traefik": ("nginx-proxy",),
    "openapi": ("api-contracts",),
    "swagger": ("api-contracts",),
    "jwt": ("auth",),
    "oauth": ("auth",),
    # Фронтенд / тесты / дизайн
    "tailwind": ("css-layout",),
    "webpack": ("build-tools",),
    "vite": ("build-tools",),
    "eslint": ("build-tools",),
    "jest": ("frontend-testing",),
    "vitest": ("frontend-testing",),
    "playwright": ("qa-automation",),
    "cypress": ("qa-automation",),
    "selenium": ("qa-automation",),
    "pytest": ("backend-testing",),
    "postman": ("api-testing",),
    "jmeter": ("load-testing",),
    "k6": ("load-testing",),
    "react native": ("react-native",),
    "expo": ("react-native",),
    "a11y": ("accessibility",),
}


class SkillLike(Protocol):
    id: uuid.UUID
    slug: str
    title: str


@dataclass(frozen=True, slots=True)
class Signal:
    """Внешний факт о пользователе, который может подтверждать навык."""

    source: str
    title: str
    url: str = ""
    confidence: float = COURSE_CONFIDENCE


@dataclass(slots=True)
class Match:
    """Навык, подтверждённый одним или несколькими сигналами."""

    skill_id: uuid.UUID
    slug: str
    title: str
    confidence: float = 0.0
    evidence: list[Signal] = field(default_factory=list)


def normalize(text: str) -> str:
    """Приводит текст к нижнему регистру, схлопывая все разделители в пробел."""
    return _SPLIT_RE.sub(" ", text.lower().replace("ё", "е")).strip()


def _stem(token: str) -> str:
    if _LATIN_RE.fullmatch(token) is not None:
        return token
    return token[:CYRILLIC_STEM_LEN] if len(token) >= MIN_CYRILLIC_LEN else token


def _is_usable(token: str) -> bool:
    if token in _STOPWORDS or _stem(token) in _STOPWORDS:
        return False
    if _LATIN_RE.fullmatch(token) is not None:
        return len(token) >= MIN_LATIN_LEN
    return len(token) >= MIN_CYRILLIC_LEN


def keywords(text: str) -> list[str]:
    """Значимые ключи текста: латиница как есть, кириллица — усечённая основа."""
    result: list[str] = []
    for token in normalize(text).split():
        if not _is_usable(token):
            continue
        stem = _stem(token)
        if stem not in result:
            result.append(stem)
    return result


def _slug_keywords(slug: str) -> list[str]:
    return [part for part in slug.split("-") if len(part) >= MIN_LATIN_LEN]


def build_alias_index(skills: Iterable[SkillLike]) -> dict[str, frozenset[uuid.UUID]]:
    """Строит индекс `ключ → навыки`, отбрасывая слишком общие ключи."""
    raw: dict[str, set[uuid.UUID]] = defaultdict(set)
    for skill in skills:
        for token in set(_slug_keywords(skill.slug)) | set(keywords(skill.title)):
            raw[token].add(skill.id)
    return {
        token: frozenset(ids)
        for token, ids in raw.items()
        if 0 < len(ids) <= MAX_ALIAS_FANOUT
    }


def _phrases(text: str) -> list[str]:
    """Двух- и трёхсловные фразы нормализованного текста (для `EXTRA_KEYWORDS`)."""
    tokens = normalize(text).split()
    phrases: list[str] = []
    for size in (3, 2):
        for start in range(len(tokens) - size + 1):
            phrases.append(" ".join(tokens[start : start + size]))
    return phrases


def curated_slugs(text: str) -> list[str]:
    """Slug-и навыков из курируемых таблиц (`LANGUAGE_SKILLS`, `EXTRA_KEYWORDS`).

    Сначала проверяется совпадение целиком (язык GitHub), затем — отдельные слова
    и двух-трёхсловные фразы (названия курсов и темы репозиториев).
    """
    norm = normalize(text)
    slugs: list[str] = list(LANGUAGE_SKILLS.get(norm, ()))
    words = norm.split()
    slugs.extend(EXTRA_KEYWORDS.get(norm, ()))
    for token in words:
        slugs.extend(EXTRA_KEYWORDS.get(token, ()))
    for phrase in _phrases(text):
        slugs.extend(EXTRA_KEYWORDS.get(phrase, ()))
    return _dedupe(slugs)


def resolve_ids(
    signal: Signal,
    index: dict[str, frozenset[uuid.UUID]],
    slug_ids: dict[str, uuid.UUID],
) -> set[uuid.UUID]:
    """Навыки, которые подтверждает сигнал: сначала курируемые таблицы, потом алиасы."""
    ids = {slug_ids[slug] for slug in curated_slugs(signal.title) if slug in slug_ids}
    if ids:
        return ids
    if normalize(signal.title) in LANGUAGE_SKILLS:
        # Известный язык без навыка в контенте — не угадываем по алиасам
        return set()
    for token in keywords(signal.title):
        ids |= index.get(token, frozenset())
    return ids


def collect_matches(
    signals: Iterable[Signal],
    skills: Sequence[SkillLike],
) -> tuple[list[Match], list[str]]:
    """Сопоставляет сигналы с навыками.

    Возвращает `(matches, unmatched)`; `unmatched` — заголовки сигналов, которые
    не удалось привязать ни к одному навыку (их показываем пользователю как есть).
    """
    slug_ids = {skill.slug: skill.id for skill in skills}
    by_id = {skill.id: skill for skill in skills}
    index = build_alias_index(skills)

    matches: dict[uuid.UUID, Match] = {}
    unmatched: list[str] = []

    for signal in signals:
        hit_ids = resolve_ids(signal, index, slug_ids)
        if not hit_ids:
            unmatched.append(signal.title)
            continue
        for skill_id in hit_ids:
            skill = by_id[skill_id]
            match = matches.get(skill_id)
            if match is None:
                match = Match(skill_id=skill_id, slug=skill.slug, title=skill.title)
                matches[skill_id] = match
            match.evidence.append(signal)
            match.confidence = round(
                min(
                    MAX_CONFIDENCE,
                    1.0 - (1.0 - match.confidence) * (1.0 - signal.confidence),
                ),
                2,
            )

    return sorted(matches.values(), key=lambda m: (-m.confidence, m.slug)), unmatched


def _dedupe(values: Iterable[str]) -> list[str]:
    result: list[str] = []
    for value in values:
        if value not in result:
            result.append(value)
    return result

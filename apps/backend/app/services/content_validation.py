"""Проверки контента аналитика до загрузки в БД — неделя 5.

`load_content` исторически молча пропускал битые ссылки: неизвестный навык в
зависимости или ресурсе просто игнорировался, а цикл в графе всплывал уже
после импорта и ломал топологическую сортировку плана. Здесь собраны все
проверки, которые аналитик может прогнать сам:

    uv run python -m app.scripts.validate_content

Ошибки (error) блокируют загрузку, предупреждения (warning) — только сигнал.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Any, Literal

from app.services.graph import find_cycle

IssueLevel = Literal["error", "warning"]
ContentData = dict[str, Any]

LEVEL_LABELS: dict[str, str] = {"error": "ОШИБКА", "warning": "предупреждение"}


@dataclass(frozen=True)
class ContentIssue:
    level: IssueLevel
    code: str
    message: str

    def __str__(self) -> str:
        return f"[{LEVEL_LABELS[self.level]}] {self.message}"

    def as_dict(self) -> dict[str, str]:
        return {"level": self.level, "code": self.code, "message": self.message}


class ContentValidationError(ValueError):
    """Контент не прошёл проверку — загружать его в БД нельзя."""

    def __init__(self, issues: list[ContentIssue]) -> None:
        self.issues = issues
        errors = [i for i in issues if i.level == "error"]
        details = "; ".join(i.message for i in errors[:5])
        super().__init__(
            f"Контент не прошёл проверку ({len(errors)} ошибок): {details}"
        )

    @property
    def errors(self) -> list[ContentIssue]:
        return [i for i in self.issues if i.level == "error"]


def _duplicates(values: list[str]) -> list[str]:
    return [value for value, count in Counter(values).items() if count > 1]


def validate_content(data: ContentData) -> list[ContentIssue]:
    """Возвращает список проблем контента: сначала ошибки, потом предупреждения."""
    errors: list[ContentIssue] = []
    warnings: list[ContentIssue] = []

    skills = data.get("skills", [])
    professions = data.get("professions", [])
    dependencies = data.get("dependencies", [])
    resources = data.get("resources", [])

    skill_ids = [s.get("id", "") for s in skills]
    profession_slugs = [p.get("slug", "") for p in professions]
    skill_set = {sid for sid in skill_ids if sid}
    profession_set = {slug for slug in profession_slugs if slug}

    # --- идентификаторы -------------------------------------------------
    for dup in _duplicates(skill_ids):
        errors.append(
            ContentIssue("error", "duplicate-skill", f"Навык «{dup}» описан дважды")
        )
    for dup in _duplicates(profession_slugs):
        errors.append(
            ContentIssue(
                "error", "duplicate-profession", f"Профессия «{dup}» описана дважды"
            )
        )
    for sid in skill_ids:
        if not sid:
            errors.append(
                ContentIssue("error", "empty-skill-id", "У навыка не заполнено поле id")
            )

    # --- профессии ↔ навыки ---------------------------------------------
    skills_per_profession: dict[str, list[str]] = defaultdict(list)
    for skill in skills:
        own_professions = skill.get("professions") or []
        if not own_professions:
            warnings.append(
                ContentIssue(
                    "warning",
                    "orphan-skill",
                    f"Навык «{skill.get('id', '?')}» не входит ни в одну профессию",
                )
            )
        for slug in own_professions:
            if slug not in profession_set:
                errors.append(
                    ContentIssue(
                        "error",
                        "unknown-profession",
                        f"Навык «{skill.get('id', '?')}» ссылается на "
                        f"неизвестную профессию «{slug}»",
                    )
                )
                continue
            skills_per_profession[slug].append(skill.get("id", ""))

    for profession in professions:
        slug = profession.get("slug", "?")
        actual = len(skills_per_profession.get(slug, []))
        declared = profession.get("skills_count")
        if actual == 0:
            errors.append(
                ContentIssue(
                    "error",
                    "empty-profession",
                    f"У профессии «{slug}» нет ни одного навыка",
                )
            )
        elif declared is not None and int(declared) != actual:
            warnings.append(
                ContentIssue(
                    "warning",
                    "profession-skills-count",
                    f"Профессия «{slug}»: skills_count={declared}, "
                    f"фактически {actual}",
                )
            )

    # --- зависимости ------------------------------------------------------
    triples: list[tuple[str, str, str]] = []
    edges: list[tuple[str, str]] = []
    for dep in dependencies:
        skill_id = dep.get("skill_id", "")
        prerequisite_id = dep.get("prerequisite_id", "")
        dep_type = dep.get("type") or "required"
        triples.append((skill_id, prerequisite_id, dep_type))

        if skill_id == prerequisite_id:
            errors.append(
                ContentIssue(
                    "error",
                    "self-dependency",
                    f"Навык «{skill_id}» зависит от самого себя",
                )
            )
        for label, value in (
            ("зависимости", skill_id),
            ("предусловия", prerequisite_id),
        ):
            if value not in skill_set:
                errors.append(
                    ContentIssue(
                        "error",
                        "unknown-skill",
                        f"В {label} указан неизвестный навык «{value}»",
                    )
                )
        edges.append((skill_id, prerequisite_id))

    for dup in _duplicates([f"{a}|{b}|{c}" for a, b, c in triples]):
        errors.append(
            ContentIssue("error", "duplicate-dependency", f"Связь повторяется: {dup}")
        )

    cycle = find_cycle(edges) if edges else None
    if cycle is not None:
        errors.append(
            ContentIssue(
                "error",
                "cycle",
                "Найден цикл в графе навыков: " + " → ".join(cycle),
            )
        )

    # --- ресурсы ----------------------------------------------------------
    resources_per_skill: Counter[str] = Counter()
    for res in resources:
        skill_id = res.get("skill_id", "")
        resources_per_skill[skill_id] += 1
        if skill_id not in skill_set:
            errors.append(
                ContentIssue(
                    "error",
                    "unknown-skill",
                    f"Ресурс «{res.get('title', '?')}» привязан к "
                    f"неизвестному навыку «{skill_id}»",
                )
            )
        if not (res.get("url") or "").strip():
            warnings.append(
                ContentIssue(
                    "warning",
                    "resource-without-url",
                    f"Ресурс «{res.get('title', '?')}» без ссылки",
                )
            )

    for sid in sorted(skill_set):
        if resources_per_skill[sid] == 0:
            warnings.append(
                ContentIssue(
                    "warning",
                    "skill-without-resources",
                    f"У навыка «{sid}» нет учебных ресурсов",
                )
            )

    return errors + warnings


def content_report(data: ContentData) -> dict[str, Any]:
    """Сводка для аналитика: цифры по контенту + список проблем."""
    skills = data.get("skills", [])
    professions = data.get("professions", [])
    dependencies = data.get("dependencies", [])
    resources = data.get("resources", [])

    hours_by_profession: dict[str, int] = defaultdict(int)
    skills_by_profession: dict[str, int] = defaultdict(int)
    resources_by_skill: Counter[str] = Counter()
    for res in resources:
        resources_by_skill[res.get("skill_id", "")] += 1
    for skill in skills:
        hours = int(skill.get("hours") or 0)
        for slug in skill.get("professions") or []:
            skills_by_profession[slug] += 1
            hours_by_profession[slug] += hours

    issues = validate_content(data)
    per_profession = [
        {
            "slug": p.get("slug", ""),
            "title": p.get("title", ""),
            "skills": skills_by_profession.get(p.get("slug", ""), 0),
            "hours": hours_by_profession.get(p.get("slug", ""), 0),
        }
        for p in professions
    ]

    return {
        "meta": data.get("meta", {}),
        "totals": {
            "professions": len(professions),
            "skills": len(skills),
            "dependencies": len(dependencies),
            "resources": len(resources),
            "skills_without_resources": sum(
                1 for s in skills if resources_by_skill[s.get("id", "")] == 0
            ),
        },
        "professions": per_profession,
        "issues": [i.as_dict() for i in issues],
        "errors": sum(1 for i in issues if i.level == "error"),
        "warnings": sum(1 for i in issues if i.level == "warning"),
    }


def format_report(report: dict[str, Any]) -> str:
    """Текстовая версия отчёта для CLI."""
    totals = report["totals"]
    lines = [
        "Контент SkillMap",
        f"  профессий: {totals['professions']}",
        f"  навыков:   {totals['skills']}",
        f"  связей:    {totals['dependencies']}",
        f"  ресурсов:  {totals['resources']}",
        "",
        "По профессиям:",
    ]
    for p in report["professions"]:
        lines.append(
            f"  {p['slug']:<22} навыков {p['skills']:>3}  часов {p['hours']:>4}"
        )
    issues = report["issues"]
    lines.append("")
    if not issues:
        lines.append("Проверки пройдены, ошибок нет.")
        return "\n".join(lines)

    lines.append(f"Проблемы: ошибок {report['errors']}, предупреждений {report['warnings']}")
    for issue in issues:
        lines.append(
            f"  [{LEVEL_LABELS[issue['level']]}] {issue['message']}"
        )
    return "\n".join(lines)


__all__ = [
    "ContentIssue",
    "ContentValidationError",
    "content_report",
    "format_report",
    "validate_content",
]

"""Проверка контента аналитика: python -m app.scripts.validate_content

Гоняет структурные проверки (битые ссылки, дубли, циклы, профессии без
навыков) без подключения к БД. Код возврата 1, если есть ошибки — можно
вставлять в CI перед `app.scripts.seed`.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.services.content import load_content_data
from app.services.content_validation import content_report, format_report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Проверка контента SkillMap")
    parser.add_argument("--path", type=Path, default=None, help="путь к JSON")
    parser.add_argument(
        "--json", action="store_true", help="вывести отчёт в JSON"
    )
    parser.add_argument(
        "--warnings-as-errors",
        action="store_true",
        help="считать предупреждения ошибками",
    )
    args = parser.parse_args(argv)

    data = load_content_data(args.path)
    report = content_report(data)

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(format_report(report))

    failed = report["errors"] > 0 or (
        args.warnings_as_errors and report["warnings"] > 0
    )
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

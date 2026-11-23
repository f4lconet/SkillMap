"""week4: длинные названия ресурсов из контента аналитика

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-23
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Максимальная длина title в контенте — 351 символ, колонки на 300 не хватало
    op.alter_column(
        "resources",
        "title",
        existing_type=sa.String(300),
        type_=sa.String(500),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "resources",
        "title",
        existing_type=sa.String(500),
        type_=sa.String(300),
        existing_nullable=False,
    )

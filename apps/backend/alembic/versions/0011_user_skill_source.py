"""week5: источник навыка для импорта GitHub/Stepik

Revision ID: 0011
Revises: 0010
Create Date: 2026-11-30
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # NULL = навык отмечен вручную или через квиз; github/stepik — из импорта
    op.add_column(
        "user_skills", sa.Column("source", sa.String(20), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("user_skills", "source")

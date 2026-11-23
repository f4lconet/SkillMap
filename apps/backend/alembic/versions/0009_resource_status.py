"""week4: статусы ресурсов в админке — публикация и проверка ссылок

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-23
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Редакторский статус: draft | published | needs_review
    op.add_column(
        "resources",
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
    )
    # Состояние ссылки: unknown | ok | broken
    op.add_column(
        "resources",
        sa.Column("link_status", sa.String(20), nullable=False, server_default="unknown"),
    )
    op.add_column(
        "resources",
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "resources",
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_resources_status", "resources", ["status"])

    # Уже загруженный контент считается опубликованным, иначе вся база
    # выглядела бы черновиками после миграции
    op.execute(
        "UPDATE resources SET status = 'published', "
        "published_at = COALESCE(created_at, now())"
    )


def downgrade() -> None:
    op.drop_index("ix_resources_status", table_name="resources")
    op.drop_column("resources", "published_at")
    op.drop_column("resources", "last_checked_at")
    op.drop_column("resources", "link_status")
    op.drop_column("resources", "status")

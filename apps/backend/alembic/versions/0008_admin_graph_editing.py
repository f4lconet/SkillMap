"""week4: редактор графа в админке — координаты узлов, подзаголовок, публикация

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-30
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Позиция узла на карте редактора: NULL = раскладка по layer/position
    op.add_column(
        "skills",
        sa.Column("subtitle", sa.String(200), nullable=False, server_default=""),
    )
    op.add_column("skills", sa.Column("pos_x", sa.Integer(), nullable=True))
    op.add_column("skills", sa.Column("pos_y", sa.Integer(), nullable=True))

    op.add_column(
        "professions",
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("professions", sa.Column("published_by_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_professions_published_by",
        "professions",
        "users",
        ["published_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.add_column(
        "professions",
        sa.Column("content_version", sa.Integer(), nullable=False, server_default="1"),
    )


def downgrade() -> None:
    op.drop_column("professions", "content_version")
    op.drop_constraint(
        "fk_professions_published_by", "professions", type_="foreignkey"
    )
    op.drop_column("professions", "published_by_id")
    op.drop_column("professions", "published_at")
    op.drop_column("skills", "pos_y")
    op.drop_column("skills", "pos_x")
    op.drop_column("skills", "subtitle")

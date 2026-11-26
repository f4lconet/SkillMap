"""week5: журнал действий редакторов и метка сохранения черновика

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-26
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0012"
down_revision: str | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Когда редактор последний раз сохранял черновик профессии
    op.add_column(
        "professions",
        sa.Column("draft_saved_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "admin_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "actor_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("actor_name", sa.String(200), nullable=False, server_default=""),
        sa.Column(
            "entity_type", sa.String(20), nullable=False, server_default="profession"
        ),
        sa.Column("entity_id", sa.Uuid(), nullable=True),
        sa.Column(
            "profession_id",
            sa.Uuid(),
            sa.ForeignKey("professions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "skill_id",
            sa.Uuid(),
            sa.ForeignKey("skills.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action", sa.String(20), nullable=False, server_default="updated"),
        sa.Column("title", sa.String(300), nullable=False, server_default=""),
        sa.Column("detail", sa.Text(), nullable=False, server_default=""),
    )
    op.create_index(
        "ix_admin_events_created_at", "admin_events", ["created_at"], unique=False
    )
    op.create_index(
        "ix_admin_events_profession_id", "admin_events", ["profession_id"], unique=False
    )
    op.create_index(
        "ix_admin_events_skill_id", "admin_events", ["skill_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_admin_events_skill_id", table_name="admin_events")
    op.drop_index("ix_admin_events_profession_id", table_name="admin_events")
    op.drop_index("ix_admin_events_created_at", table_name="admin_events")
    op.drop_table("admin_events")
    op.drop_column("professions", "draft_saved_at")

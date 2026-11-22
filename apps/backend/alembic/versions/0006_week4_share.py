"""week4: публичная ссылка на карту (users.share_token)

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-22
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("share_token", sa.String(64), nullable=True))
    op.add_column(
        "users",
        sa.Column(
            "share_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
    )
    op.add_column(
        "users", sa.Column("shared_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index("ix_users_share_token", "users", ["share_token"], unique=True)

    op.add_column(
        "resources",
        sa.Column("lang", sa.String(8), nullable=False, server_default=sa.text("'ru'")),
    )


def downgrade() -> None:
    op.drop_column("resources", "lang")
    op.drop_index("ix_users_share_token", table_name="users")
    op.drop_column("users", "shared_at")
    op.drop_column("users", "share_enabled")
    op.drop_column("users", "share_token")

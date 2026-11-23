"""week5: человекочитаемый username для публичной карты (/u/{username})

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-23
"""

from __future__ import annotations

import re
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_INVALID = re.compile(r"[^a-z0-9-]+")


def _slug(source: str) -> str:
    value = _INVALID.sub("-", (source or "").strip().lower()).strip("-")
    value = value[:32].strip("-")
    return value if len(value) >= 3 else "user"


def upgrade() -> None:
    op.add_column("users", sa.Column("username", sa.String(32), nullable=True))
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    # Бэкфилл: username из локальной части email с разрешением коллизий
    conn = op.get_bind()
    rows = conn.execute(
        sa.text("SELECT id, email FROM users ORDER BY created_at")
    ).fetchall()
    taken: set[str] = set()
    for user_id, email in rows:
        base = _slug((email or "").split("@")[0])
        candidate, n = base, 1
        while candidate in taken:
            n += 1
            suffix = f"-{n}"
            candidate = f"{base[: 32 - len(suffix)]}{suffix}"
        taken.add(candidate)
        conn.execute(
            sa.text("UPDATE users SET username = :username WHERE id = :id"),
            {"username": candidate, "id": user_id},
        )


def downgrade() -> None:
    op.drop_index("ix_users_username", table_name="users")
    op.drop_column("users", "username")

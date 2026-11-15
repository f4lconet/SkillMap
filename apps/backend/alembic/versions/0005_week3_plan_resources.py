"""week3: resources, plans, plan_items

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-15
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "resources",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("skill_id", sa.Uuid(), sa.ForeignKey("skills.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("url", sa.String(1000), nullable=False, server_default=""),
        sa.Column("resource_type", sa.String(30), nullable=False, server_default="course"),
        sa.Column("is_free", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("provider", sa.String(100), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("estimated_hours", sa.Integer(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_resources_skill_id", "resources", ["skill_id"])

    op.create_table(
        "plans",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "profession_id",
            sa.Uuid(),
            sa.ForeignKey("professions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("hours_per_week", sa.Integer(), nullable=False, server_default="6"),
        sa.Column("total_weeks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("current_week", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "profession_id", name="uq_user_profession_plan"),
    )
    op.create_index("ix_plans_user_id", "plans", ["user_id"])
    op.create_index("ix_plans_profession_id", "plans", ["profession_id"])

    op.create_table(
        "plan_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("plan_id", sa.Uuid(), sa.ForeignKey("plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("skill_id", sa.Uuid(), sa.ForeignKey("skills.id", ondelete="CASCADE"), nullable=False),
        sa.Column("week_number", sa.Integer(), nullable=False),
        sa.Column("estimated_hours", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="planned"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_plan_items_plan_id", "plan_items", ["plan_id"])
    op.create_index("ix_plan_items_skill_id", "plan_items", ["skill_id"])
    op.create_index("ix_plan_items_week_number", "plan_items", ["week_number"])


def downgrade() -> None:
    op.drop_index("ix_plan_items_week_number", table_name="plan_items")
    op.drop_index("ix_plan_items_skill_id", table_name="plan_items")
    op.drop_index("ix_plan_items_plan_id", table_name="plan_items")
    op.drop_table("plan_items")
    op.drop_index("ix_plans_profession_id", table_name="plans")
    op.drop_index("ix_plans_user_id", table_name="plans")
    op.drop_table("plans")
    op.drop_index("ix_resources_skill_id", table_name="resources")
    op.drop_table("resources")

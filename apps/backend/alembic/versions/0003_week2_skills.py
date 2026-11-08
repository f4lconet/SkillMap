"""Week 2: skills, profession_skills, user_skills

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-06
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "skills",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "difficulty",
            postgresql.ENUM(
                "beginner", "intermediate", "advanced", name="level", create_type=False
            ),
            nullable=True,
        ),
        sa.Column(
            "resources",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("estimated_hours", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_skills_slug", "skills", ["slug"], unique=True)

    op.create_table(
        "profession_skills",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "profession_id",
            sa.Uuid(),
            sa.ForeignKey("professions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "skill_id",
            sa.Uuid(),
            sa.ForeignKey("skills.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_core", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "prerequisite_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("profession_id", "skill_id", name="uq_profession_skill"),
    )
    op.create_index("ix_profession_skills_profession_id", "profession_skills", ["profession_id"])
    op.create_index("ix_profession_skills_skill_id", "profession_skills", ["skill_id"])

    op.create_table(
        "user_skills",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "skill_id",
            sa.Uuid(),
            sa.ForeignKey("skills.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="not_started"),
        sa.Column("self_score", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "skill_id", name="uq_user_skill"),
    )
    op.create_index("ix_user_skills_user_id", "user_skills", ["user_id"])
    op.create_index("ix_user_skills_skill_id", "user_skills", ["skill_id"])
    op.create_index("ix_user_skills_status", "user_skills", ["status"])


def downgrade() -> None:
    op.drop_index("ix_user_skills_status", table_name="user_skills")
    op.drop_index("ix_user_skills_skill_id", table_name="user_skills")
    op.drop_index("ix_user_skills_user_id", table_name="user_skills")
    op.drop_table("user_skills")
    op.drop_index("ix_profession_skills_skill_id", table_name="profession_skills")
    op.drop_index("ix_profession_skills_profession_id", table_name="profession_skills")
    op.drop_table("profession_skills")
    op.drop_index("ix_skills_slug", table_name="skills")
    op.drop_table("skills")

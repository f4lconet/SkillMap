"""Align schema with skillmap_content.json (week 2 content)

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    dep_type = postgresql.ENUM(
        "required", "recommended", name="dependency_type", create_type=False
    )
    dep_type.create(bind, checkfirst=True)

    # directions
    op.create_table(
        "directions",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # skills: add category, layer; change difficulty to int
    # drop old difficulty (enum) if exists, add int
    op.add_column("skills", sa.Column("category", sa.String(100), nullable=False, server_default=""))
    op.add_column("skills", sa.Column("layer", sa.Integer(), nullable=False, server_default="0"))
    op.create_index("ix_skills_category", "skills", ["category"])

    # difficulty was level enum — replace with int 1–5
    with op.batch_alter_table("skills") as batch:
        batch.drop_column("difficulty")
    op.add_column(
        "skills",
        sa.Column("difficulty", sa.Integer(), nullable=False, server_default="1"),
    )
    # resources column may exist from 0003 — drop if we don't use it in content
    # keep estimated_hours

    # profession: direction_id, skills_ready
    op.add_column(
        "professions",
        sa.Column("direction_id", sa.String(50), sa.ForeignKey("directions.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_professions_direction_id", "professions", ["direction_id"])
    op.add_column(
        "professions",
        sa.Column("skills_ready", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    # skill_dependencies
    op.create_table(
        "skill_dependencies",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("skill_id", sa.Uuid(), sa.ForeignKey("skills.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "prerequisite_id",
            sa.Uuid(),
            sa.ForeignKey("skills.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("dep_type", dep_type, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("skill_id", "prerequisite_id", "dep_type", name="uq_skill_dep"),
    )
    op.create_index("ix_skill_dependencies_skill_id", "skill_dependencies", ["skill_id"])
    op.create_index(
        "ix_skill_dependencies_prerequisite_id", "skill_dependencies", ["prerequisite_id"]
    )

    # profession_skills: drop prerequisite_ids if was in 0003
    try:
        op.drop_column("profession_skills", "prerequisite_ids")
    except Exception:
        pass


def downgrade() -> None:
    op.drop_index("ix_skill_dependencies_prerequisite_id", table_name="skill_dependencies")
    op.drop_index("ix_skill_dependencies_skill_id", table_name="skill_dependencies")
    op.drop_table("skill_dependencies")
    op.drop_column("professions", "skills_ready")
    op.drop_index("ix_professions_direction_id", table_name="professions")
    op.drop_column("professions", "direction_id")
    op.drop_index("ix_skills_category", table_name="skills")
    op.drop_column("skills", "layer")
    op.drop_column("skills", "category")
    # difficulty reverse is lossy — skip
    op.drop_table("directions")
    op.execute("DROP TYPE IF EXISTS dependency_type")

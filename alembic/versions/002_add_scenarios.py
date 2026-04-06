"""Add scenarios and scenario scoping

Revision ID: 002
Revises: 001
Create Date: 2026-04-06

"""
from __future__ import annotations

import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute("CREATE TYPE scenario_type AS ENUM ('drill', 'real_event', 'training', 'other')")

    op.create_table(
        "scenarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False, unique=True),
        sa.Column(
            "type",
            sa.Enum("drill", "real_event", "training", "other", name="scenario_type", create_type=False),
            nullable=False,
            server_default="drill",
        ),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_scenarios_name", "scenarios", ["name"])

    connection = op.get_bind()
    default_id = uuid.uuid4()
    connection.execute(
        sa.text(
            """
            INSERT INTO scenarios (id, name, type, description)
            VALUES (:id, 'default', 'drill', 'Auto-generated default scenario')
            ON CONFLICT (name) DO NOTHING
            """
        ),
        {"id": default_id},
    )
    default_scenario_id = connection.execute(sa.text("SELECT id FROM scenarios WHERE name='default' LIMIT 1")).scalar_one()

    for table_name in ["measurements", "visitors", "missions", "labels"]:
        op.add_column(table_name, sa.Column("scenario_id", postgresql.UUID(as_uuid=True), nullable=True))
        connection.execute(
            sa.text(f"UPDATE {table_name} SET scenario_id = :scenario_id WHERE scenario_id IS NULL"),
            {"scenario_id": default_scenario_id},
        )
        op.alter_column(table_name, "scenario_id", nullable=False)
        op.create_foreign_key(
            f"fk_{table_name}_scenario_id",
            source_table=table_name,
            referent_table="scenarios",
            local_cols=["scenario_id"],
            remote_cols=["id"],
            ondelete="CASCADE",
        )

    op.create_index("ix_measurements_scenario_id", "measurements", ["scenario_id"])
    op.create_index("ix_visitors_scenario_id", "visitors", ["scenario_id"])
    op.create_index("ix_missions_scenario_id", "missions", ["scenario_id"])
    op.create_index("ix_labels_scenario_id", "labels", ["scenario_id"])

    op.execute("ALTER TABLE labels DROP CONSTRAINT IF EXISTS labels_name_key")
    op.create_unique_constraint("uq_labels_scenario_name", "labels", ["scenario_id", "name"])


def downgrade() -> None:
    op.drop_constraint("uq_labels_scenario_name", "labels", type_="unique")
    op.create_unique_constraint("labels_name_key", "labels", ["name"])

    op.drop_index("ix_labels_scenario_id", table_name="labels")
    op.drop_index("ix_missions_scenario_id", table_name="missions")
    op.drop_index("ix_visitors_scenario_id", table_name="visitors")
    op.drop_index("ix_measurements_scenario_id", table_name="measurements")

    for table_name in ["labels", "missions", "visitors", "measurements"]:
        op.drop_constraint(f"fk_{table_name}_scenario_id", table_name, type_="foreignkey")
        op.drop_column(table_name, "scenario_id")

    op.drop_index("ix_scenarios_name", table_name="scenarios")
    op.drop_table("scenarios")
    op.execute("DROP TYPE IF EXISTS scenario_type")

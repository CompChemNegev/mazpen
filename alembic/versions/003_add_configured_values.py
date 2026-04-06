"""Add configured values table for database-backed enum replacements.

Revision ID: 003
Revises: 002
Create Date: 2026-04-06

"""
from __future__ import annotations

import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | None = None
depends_on: str | None = None


def _insert_seed_values() -> None:
    connection = op.get_bind()
    seed_rows = [
        # Existing enum-backed categories
        ("scenario_type", "drill", "Drill", "Simulation and training drill", 0),
        ("scenario_type", "real_event", "Real Event", "Live operational event", 1),
        ("scenario_type", "training", "Training", "Focused training scenario", 2),
        ("scenario_type", "other", "Other", "Custom scenario type", 3),
        ("mission_status", "planned", "Planned", "Mission is planned", 0),
        ("mission_status", "active", "Active", "Mission is active", 1),
        ("mission_status", "completed", "Completed", "Mission is completed", 2),
        ("mission_status", "cancelled", "Cancelled", "Mission is cancelled", 3),
        ("user_role", "admin", "Admin", "Full system access", 0),
        ("user_role", "operator", "Operator", "Operational access", 1),
        ("user_role", "viewer", "Viewer", "Read-only access", 2),
        # Planned configurable categories
        ("measurement_status", "valid", "Valid", "Measurement is valid", 0),
        ("measurement_status", "invalid", "Invalid", "Measurement is invalid", 1),
        ("team_role", "leader", "Leader", "Team leader role", 0),
        ("team_role", "member", "Member", "Team member role", 1),
        ("measurement_type", "temperature", "Temperature", "Temperature measurement", 0),
        ("measurement_type", "humidity", "Humidity", "Humidity measurement", 1),
        ("measurement_type", "co2", "CO2", "Carbon dioxide measurement", 2),
        ("measurement_type", "noise", "Noise", "Noise level measurement", 3),
        ("instrument_type", "sensor_fixed", "Fixed Sensor", "Stationary instrument", 0),
        ("instrument_type", "sensor_mobile", "Mobile Sensor", "Mobile instrument", 1),
        ("measurement_unit", "celsius", "Celsius", "Temperature unit", 0),
        ("measurement_unit", "percent", "Percent", "Percentage unit", 1),
        ("measurement_unit", "ppm", "PPM", "Parts per million", 2),
    ]

    for category, key, label, description, sort_order in seed_rows:
        connection.execute(
            sa.text(
                """
                INSERT INTO configured_values
                (id, category, key, label, description, is_active, sort_order, metadata, created_at, updated_at)
                VALUES (:id, :category, :key, :label, :description, true, :sort_order, '{}'::jsonb, NOW(), NOW())
                ON CONFLICT (category, key) DO NOTHING
                """
            ),
            {
                "id": uuid.uuid4(),
                "category": category,
                "key": key,
                "label": label,
                "description": description,
                "sort_order": sort_order,
            },
        )


def upgrade() -> None:
    op.create_table(
        "configured_values",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("label", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("category", "key", name="uq_configured_values_category_key"),
    )
    op.create_index("ix_configured_values_category", "configured_values", ["category"])
    op.create_index(
        "ix_configured_values_category_active",
        "configured_values",
        ["category", "is_active"],
    )

    _insert_seed_values()


def downgrade() -> None:
    op.drop_index("ix_configured_values_category_active", table_name="configured_values")
    op.drop_index("ix_configured_values_category", table_name="configured_values")
    op.drop_table("configured_values")

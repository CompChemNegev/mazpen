"""MVP domain simplification: remove labels/instruments/measurement_types, add teams, and update mission/visitor/measurement structures.

Revision ID: 005
Revises: 004
Create Date: 2026-04-06

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "005"
down_revision: str | None = "004"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Teams and members
    op.create_table(
        "teams",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("scenario_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("scenario_id", "name", name="uq_teams_scenario_name"),
    )
    op.create_index("ix_teams_scenario_id", "teams", ["scenario_id"])

    op.create_table(
        "team_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("username", sa.String(length=120), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="member"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("team_id", "username", name="uq_team_members_team_username"),
    )
    op.create_index("ix_team_members_team_id", "team_members", ["team_id"])

    # Missions: generic geometry + team + instrument type
    op.add_column("missions", sa.Column("instrument_type", sa.String(length=100), nullable=True))
    op.add_column("missions", sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_missions_team_id",
        "missions",
        "teams",
        ["team_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_missions_team_id", "missions", ["team_id"])
    op.execute(
        "ALTER TABLE missions ALTER COLUMN target_area TYPE geometry(GEOMETRY,4326) USING target_area::geometry"
    )

    # Measurements: replace FK-based type/instrument and add status/team strings
    op.add_column("measurements", sa.Column("measurement_type", sa.String(length=100), nullable=True))
    op.add_column("measurements", sa.Column("instrument_type", sa.String(length=100), nullable=True))
    op.add_column("measurements", sa.Column("status", sa.String(length=50), nullable=False, server_default="valid"))
    op.add_column("measurements", sa.Column("team", sa.String(length=100), nullable=False, server_default="unknown"))

    op.execute(
        """
        UPDATE measurements m
        SET measurement_type = mt.name
        FROM measurement_types mt
        WHERE m.measurement_type_id = mt.id AND m.measurement_type IS NULL
        """
    )
    op.execute(
        """
        UPDATE measurements m
        SET instrument_type = i.type
        FROM instruments i
        WHERE m.instrument_id = i.id AND m.instrument_type IS NULL
        """
    )
    op.execute("UPDATE measurements SET measurement_type = 'unknown' WHERE measurement_type IS NULL")
    op.execute("UPDATE measurements SET instrument_type = 'unknown' WHERE instrument_type IS NULL")

    op.alter_column("measurements", "measurement_type", nullable=False)
    op.alter_column("measurements", "instrument_type", nullable=False)

    # Visitor tracks: recorded_at -> start/end
    op.add_column("visitor_tracks", sa.Column("start_time", sa.DateTime(timezone=True), nullable=True))
    op.add_column("visitor_tracks", sa.Column("end_time", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE visitor_tracks SET start_time = recorded_at WHERE start_time IS NULL")
    op.execute("UPDATE visitor_tracks SET end_time = recorded_at WHERE end_time IS NULL")
    op.alter_column("visitor_tracks", "start_time", nullable=False)
    op.alter_column("visitor_tracks", "end_time", nullable=False)
    op.drop_column("visitor_tracks", "recorded_at")
    op.create_index("ix_visitor_tracks_start_time", "visitor_tracks", ["start_time"])
    op.create_index("ix_visitor_tracks_end_time", "visitor_tracks", ["end_time"])

    # Remove obsolete label association and label tables
    op.drop_table("measurement_labels")
    op.drop_table("labels")

    # Remove obsolete assignment table
    op.drop_table("mission_instrument_assignments")

    # Drop obsolete measurement FK columns/indexes and old entity tables
    op.drop_index("ix_measurements_measurement_type_id", table_name="measurements")
    op.drop_index("ix_measurements_instrument_id", table_name="measurements")
    op.drop_constraint("measurements_measurement_type_id_fkey", "measurements", type_="foreignkey")
    op.drop_constraint("measurements_instrument_id_fkey", "measurements", type_="foreignkey")
    op.drop_column("measurements", "measurement_type_id")
    op.drop_column("measurements", "instrument_id")
    op.create_index("ix_measurements_team", "measurements", ["team"])
    op.create_index("ix_measurements_status", "measurements", ["status"])

    op.drop_table("measurement_types")
    op.drop_table("instruments")


def downgrade() -> None:
    raise NotImplementedError("Downgrade is intentionally unsupported for this large structural migration.")

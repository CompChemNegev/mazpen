"""Initial schema with PostGIS

Revision ID: 001
Revises:
Create Date: 2026-04-05

"""
from __future__ import annotations

import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

revision: str = "001"
down_revision: str | None = None
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Enable PostGIS extension
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis_topology")

    # ── Enums ────────────────────────────────────────────────────────────────
    mission_status = postgresql.ENUM(
        'planned', 'active', 'completed', 'cancelled',
        name='mission_status', create_type=False,
    )
    mission_status.create(op.get_bind(), checkfirst=True)

    user_role = postgresql.ENUM(
        'admin', 'operator', 'viewer',
        name='user_role', create_type=False,
    )
    user_role.create(op.get_bind(), checkfirst=True)

    # ── measurement_types ────────────────────────────────────────────────────
    op.create_table(
        "measurement_types",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("unit", sa.String(50), nullable=False),
    )
    op.create_index("ix_measurement_types_name", "measurement_types", ["name"])

    # ── instruments ──────────────────────────────────────────────────────────
    op.create_table(
        "instruments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("calibration_date", sa.DateTime(timezone=True), nullable=True),
    )

    # ── missions ─────────────────────────────────────────────────────────────
    op.create_table(
        "missions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.String(1000), nullable=True),
        sa.Column(
            "status",
            mission_status,
            nullable=False,
            server_default="planned",
        ),
        sa.Column(
            "target_area",
            geoalchemy2.Geography(geometry_type="POLYGON", srid=4326),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_missions_status", "missions", ["status"])
    op.create_index(
        "ix_missions_target_area", "missions", ["target_area"], postgresql_using="gist"
    )

    # ── measurements ─────────────────────────────────────────────────────────
    op.create_table(
        "measurements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "location",
            geoalchemy2.Geography(geometry_type="POINT", srid=4326),
            nullable=False,
        ),
        sa.Column(
            "measurement_type_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("measurement_types.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("value", sa.Float, nullable=False),
        sa.Column("unit", sa.String(50), nullable=False),
        sa.Column(
            "instrument_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("instruments.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "mission_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("missions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "metadata",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_measurements_timestamp", "measurements", ["timestamp"])
    op.create_index("ix_measurements_measurement_type_id", "measurements", ["measurement_type_id"])
    op.create_index("ix_measurements_instrument_id", "measurements", ["instrument_id"])
    op.create_index("ix_measurements_mission_id", "measurements", ["mission_id"])
    op.create_index(
        "ix_measurements_location", "measurements", ["location"], postgresql_using="gist"
    )

    # ── visitors ──────────────────────────────────────────────────────────────
    op.create_table(
        "visitors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column(
            "demographics",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("tags", postgresql.ARRAY(sa.String(100)), nullable=True),
    )

    # ── body_measurements ─────────────────────────────────────────────────────
    op.create_table(
        "body_measurements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column(
            "visitor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("visitors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("value", sa.Float, nullable=False),
        sa.Column("unit", sa.String(50), nullable=False),
    )
    op.create_index("ix_body_measurements_visitor_id", "body_measurements", ["visitor_id"])
    op.create_index("ix_body_measurements_timestamp", "body_measurements", ["timestamp"])

    # ── visitor_tracks ────────────────────────────────────────────────────────
    op.create_table(
        "visitor_tracks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column(
            "visitor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("visitors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "geom",
            geoalchemy2.Geography(geometry_type="LINESTRING", srid=4326),
            nullable=False,
        ),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_visitor_tracks_visitor_id", "visitor_tracks", ["visitor_id"])
    op.create_index(
        "ix_visitor_tracks_geom", "visitor_tracks", ["geom"], postgresql_using="gist"
    )

    # ── mission_instrument_assignments ─────────────────────────────────────────
    op.create_table(
        "mission_instrument_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column(
            "mission_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("missions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "instrument_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("instruments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_mission_assignments_mission_id", "mission_instrument_assignments", ["mission_id"])
    op.create_index("ix_mission_assignments_instrument_id", "mission_instrument_assignments", ["instrument_id"])

    # ── labels ────────────────────────────────────────────────────────────────
    op.create_table(
        "labels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("description", sa.String(500), nullable=True),
    )
    op.create_index("ix_labels_name", "labels", ["name"])

    # ── measurement_labels ────────────────────────────────────────────────────
    op.create_table(
        "measurement_labels",
        sa.Column(
            "measurement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("measurements.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "label_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("labels.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("reason", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("measurement_id", "label_id", name="uq_measurement_label"),
    )
    op.create_index("ix_measurement_labels_measurement_id", "measurement_labels", ["measurement_id"])
    op.create_index("ix_measurement_labels_label_id", "measurement_labels", ["label_id"])

    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column(
            "role",
            user_role,
            nullable=False,
            server_default="viewer",
        ),
        sa.Column("hashed_password", sa.String(200), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])


def downgrade() -> None:
    op.drop_table("measurement_labels")
    op.drop_table("labels")
    op.drop_table("mission_instrument_assignments")
    op.drop_table("visitor_tracks")
    op.drop_table("body_measurements")
    op.drop_table("visitors")
    op.drop_table("measurements")
    op.drop_table("missions")
    op.drop_table("instruments")
    op.drop_table("measurement_types")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS mission_status")
    op.execute("DROP TYPE IF EXISTS user_role")

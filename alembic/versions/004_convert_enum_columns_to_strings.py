"""Convert legacy enum-backed columns to string columns.

Revision ID: 004
Revises: 003
Create Date: 2026-04-06

"""
from __future__ import annotations

from alembic import op


revision: str = "004"
down_revision: str | None = "003"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Convert enum-backed columns to plain VARCHAR for DB-configured values.
    op.execute(
        "ALTER TABLE missions ALTER COLUMN status TYPE VARCHAR(50) USING status::text"
    )
    op.execute(
        "ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text"
    )
    op.execute(
        "ALTER TABLE scenarios ALTER COLUMN type TYPE VARCHAR(50) USING type::text"
    )

    op.execute("ALTER TABLE missions ALTER COLUMN status SET DEFAULT 'planned'")
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'viewer'")
    op.execute("ALTER TABLE scenarios ALTER COLUMN type SET DEFAULT 'drill'")

    # Drop old enum types if they exist from previous revisions.
    op.execute("DROP TYPE IF EXISTS mission_status")
    op.execute("DROP TYPE IF EXISTS user_role")
    op.execute("DROP TYPE IF EXISTS scenario_type")


def downgrade() -> None:
    raise NotImplementedError(
        "Downgrade is intentionally unsupported to keep runtime/domain enums removed from the codebase."
    )

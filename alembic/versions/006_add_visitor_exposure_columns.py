"""Add optional visitor exposure columns.

Revision ID: 006
Revises: 005
Create Date: 2026-04-06

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision: str = "006"
down_revision: str | None = "005"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("visitors", sa.Column("internal_exposure", sa.Float(), nullable=True))
    op.add_column("visitors", sa.Column("external_exposure", sa.Float(), nullable=True))


def downgrade() -> None:
    raise NotImplementedError("Downgrade is intentionally unsupported.")

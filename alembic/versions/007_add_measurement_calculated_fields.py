"""Add calculated measurement fields and seed configured values.

Revision ID: 007
Revises: 006
Create Date: 2026-04-06

"""
from __future__ import annotations

import uuid

from alembic import op
import sqlalchemy as sa


revision: str = "007"
down_revision: str | None = "006"
branch_labels: str | None = None
depends_on: str | None = None


def _insert_calculated_field_type_seed_values() -> None:
    connection = op.get_bind()
    seed_rows = [
        (
            "calculated_field_type",
            "dose_rate",
            "Dose Rate",
            "Calculated dose rate value",
            0,
        ),
        (
            "calculated_field_type",
            "risk_score",
            "Risk Score",
            "Calculated risk score value",
            1,
        ),
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
    op.add_column("measurements", sa.Column("calculated_field", sa.Float(), nullable=True))
    op.add_column(
        "measurements", sa.Column("calculated_field_type", sa.String(length=50), nullable=True)
    )
    _insert_calculated_field_type_seed_values()


def downgrade() -> None:
    raise NotImplementedError("Downgrade is intentionally unsupported.")

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.measurement import Measurement


class Label(Base):
    __tablename__ = "labels"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    measurement_labels: Mapped[list["MeasurementLabel"]] = relationship(
        "MeasurementLabel", back_populates="label"
    )


class MeasurementLabel(Base):
    __tablename__ = "measurement_labels"
    __table_args__ = (
        UniqueConstraint("measurement_id", "label_id", name="uq_measurement_label"),
        Index("ix_measurement_labels_measurement_id", "measurement_id"),
        Index("ix_measurement_labels_label_id", "label_id"),
    )

    measurement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("measurements.id", ondelete="CASCADE"),
        primary_key=True,
    )
    label_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("labels.id", ondelete="CASCADE"),
        primary_key=True,
    )
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    measurement: Mapped["Measurement"] = relationship(
        "Measurement", back_populates="labels"
    )
    label: Mapped["Label"] = relationship("Label", back_populates="measurement_labels")

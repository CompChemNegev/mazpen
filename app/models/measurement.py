from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from geoalchemy2 import Geography
from sqlalchemy import DateTime, Float, ForeignKey, Index, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.mission import Mission
    from app.models.label import MeasurementLabel


class MeasurementType(Base):
    __tablename__ = "measurement_types"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)

    measurements: Mapped[list["Measurement"]] = relationship(
        "Measurement", back_populates="measurement_type"
    )


class Instrument(Base):
    __tablename__ = "instruments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    calibration_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    measurements: Mapped[list["Measurement"]] = relationship(
        "Measurement", back_populates="instrument"
    )


class Measurement(Base):
    __tablename__ = "measurements"
    __table_args__ = (
        Index("ix_measurements_timestamp", "timestamp"),
        Index("ix_measurements_measurement_type_id", "measurement_type_id"),
        Index("ix_measurements_instrument_id", "instrument_id"),
        Index("ix_measurements_mission_id", "mission_id"),
        Index("ix_measurements_location", "location", postgresql_using="gist"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location: Mapped[Any] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=False
    )
    measurement_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("measurement_types.id", ondelete="RESTRICT"),
        nullable=False,
    )
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    instrument_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("instruments.id", ondelete="RESTRICT"),
        nullable=False,
    )
    mission_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("missions.id", ondelete="SET NULL"),
        nullable=True,
    )
    metadata_: Mapped[dict] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    measurement_type: Mapped["MeasurementType"] = relationship(
        "MeasurementType", back_populates="measurements"
    )
    instrument: Mapped["Instrument"] = relationship(
        "Instrument", back_populates="measurements"
    )
    mission: Mapped["Mission | None"] = relationship(
        "Mission", back_populates="measurements"
    )
    labels: Mapped[list["MeasurementLabel"]] = relationship(
        "MeasurementLabel",
        back_populates="measurement",
        cascade="all, delete-orphan",
    )

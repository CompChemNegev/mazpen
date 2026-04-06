from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from geoalchemy2 import Geography
from sqlalchemy import DateTime, Float, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.scenario import Scenario


class Visitor(Base):
    __tablename__ = "visitors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    scenario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scenarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    demographics: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    tags: Mapped[list[str] | None] = mapped_column(
        ARRAY(String(100)), nullable=True
    )
    internal_exposure: Mapped[float | None] = mapped_column(
        Float, nullable=True, default=None
    )
    external_exposure: Mapped[float | None] = mapped_column(
        Float, nullable=True, default=None
    )

    body_measurements: Mapped[list["BodyMeasurement"]] = relationship(
        "BodyMeasurement", back_populates="visitor", cascade="all, delete-orphan"
    )
    scenario: Mapped["Scenario"] = relationship("Scenario", back_populates="visitors")
    tracks: Mapped[list["VisitorTrack"]] = relationship(
        "VisitorTrack", back_populates="visitor", cascade="all, delete-orphan"
    )


class BodyMeasurement(Base):
    __tablename__ = "body_measurements"
    __table_args__ = (
        Index("ix_body_measurements_visitor_id", "visitor_id"),
        Index("ix_body_measurements_timestamp", "timestamp"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    visitor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("visitors.id", ondelete="CASCADE"),
        nullable=False,
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)

    visitor: Mapped["Visitor"] = relationship("Visitor", back_populates="body_measurements")


class VisitorTrack(Base):
    __tablename__ = "visitor_tracks"
    __table_args__ = (
        Index("ix_visitor_tracks_visitor_id", "visitor_id"),
        Index("ix_visitor_tracks_start_time", "start_time"),
        Index("ix_visitor_tracks_end_time", "end_time"),
        Index("ix_visitor_tracks_geom", "geom", postgresql_using="gist"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    visitor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("visitors.id", ondelete="CASCADE"),
        nullable=False,
    )
    geom: Mapped[Any] = mapped_column(
        Geography(geometry_type="LINESTRING", srid=4326), nullable=False
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    end_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    visitor: Mapped["Visitor"] = relationship("Visitor", back_populates="tracks")

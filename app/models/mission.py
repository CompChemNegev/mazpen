from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from geoalchemy2 import Geography
from sqlalchemy import DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.measurement import Measurement, Instrument
    from app.models.scenario import Scenario


class MissionStatus(str, enum.Enum):
    PLANNED = "planned"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Mission(Base):
    __tablename__ = "missions"
    __table_args__ = (
        Index("ix_missions_scenario_id", "scenario_id"),
        Index("ix_missions_status", "status"),
        Index("ix_missions_target_area", "target_area", postgresql_using="gist"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    scenario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scenarios.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    status: Mapped[MissionStatus] = mapped_column(
        Enum(
            MissionStatus,
            name="mission_status",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
        default=MissionStatus.PLANNED,
    )
    target_area: Mapped[Any | None] = mapped_column(
        Geography(geometry_type="POLYGON", srid=4326), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    measurements: Mapped[list["Measurement"]] = relationship(
        "Measurement", back_populates="mission"
    )
    scenario: Mapped["Scenario"] = relationship("Scenario", back_populates="missions")
    assignments: Mapped[list["MissionInstrumentAssignment"]] = relationship(
        "MissionInstrumentAssignment",
        back_populates="mission",
        cascade="all, delete-orphan",
    )


class MissionInstrumentAssignment(Base):
    __tablename__ = "mission_instrument_assignments"
    __table_args__ = (
        Index("ix_mission_assignments_mission_id", "mission_id"),
        Index("ix_mission_assignments_instrument_id", "instrument_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("missions.id", ondelete="CASCADE"),
        nullable=False,
    )
    instrument_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("instruments.id", ondelete="CASCADE"),
        nullable=False,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    mission: Mapped["Mission"] = relationship("Mission", back_populates="assignments")
    instrument: Mapped["Instrument"] = relationship("Instrument")

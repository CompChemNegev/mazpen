from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.label import Label
    from app.models.measurement import Measurement
    from app.models.mission import Mission
    from app.models.visitor import Visitor


class ScenarioType(str, enum.Enum):
    DRILL = "drill"
    REAL_EVENT = "real_event"
    TRAINING = "training"
    OTHER = "other"


class Scenario(Base):
    __tablename__ = "scenarios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    type: Mapped[ScenarioType] = mapped_column(
        Enum(ScenarioType, name="scenario_type"),
        nullable=False,
        default=ScenarioType.DRILL,
    )
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    measurements: Mapped[list["Measurement"]] = relationship("Measurement", back_populates="scenario")
    visitors: Mapped[list["Visitor"]] = relationship("Visitor", back_populates="scenario")
    missions: Mapped[list["Mission"]] = relationship("Mission", back_populates="scenario")
    labels: Mapped[list["Label"]] = relationship("Label", back_populates="scenario")

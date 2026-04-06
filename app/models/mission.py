from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.measurement import Measurement
    from app.models.scenario import Scenario
    from app.models.team import Team


class Mission(Base):
    __tablename__ = "missions"
    __table_args__ = (
        Index("ix_missions_scenario_id", "scenario_id"),
        Index("ix_missions_status", "status"),
        Index("ix_missions_team_id", "team_id"),
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
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="planned")
    instrument_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="SET NULL"),
        nullable=True,
    )
    target_area: Mapped[Any | None] = mapped_column(
        Geometry(geometry_type="GEOMETRY", srid=4326), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    measurements: Mapped[list["Measurement"]] = relationship(
        "Measurement", back_populates="mission"
    )
    scenario: Mapped["Scenario"] = relationship("Scenario", back_populates="missions")
    team: Mapped["Team | None"] = relationship("Team", back_populates="missions")

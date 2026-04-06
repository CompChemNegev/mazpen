from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.measurement import Measurement
    from app.models.mission import Mission
    from app.models.team import Team
    from app.models.visitor import Visitor


class Scenario(Base):
    __tablename__ = "scenarios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="drill")
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    measurements: Mapped[list["Measurement"]] = relationship("Measurement", back_populates="scenario")
    visitors: Mapped[list["Visitor"]] = relationship("Visitor", back_populates="scenario")
    missions: Mapped[list["Mission"]] = relationship("Mission", back_populates="scenario")
    teams: Mapped[list["Team"]] = relationship("Team", back_populates="scenario")

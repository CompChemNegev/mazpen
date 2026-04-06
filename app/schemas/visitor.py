from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class VisitorCreate(BaseModel):
    demographics: dict[str, Any] = Field(default_factory=dict)
    tags: Optional[list[str]] = None


class VisitorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    demographics: dict[str, Any]
    tags: Optional[list[str]]


# ── BodyMeasurement ────────────────────────────────────────────────────────────

class BodyMeasurementCreate(BaseModel):
    timestamp: datetime
    type: str = Field(..., max_length=100)
    value: float
    unit: str = Field(..., max_length=50)


class BodyMeasurementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    visitor_id: uuid.UUID
    timestamp: datetime
    type: str
    value: float
    unit: str


# ── VisitorTrack ───────────────────────────────────────────────────────────────

class VisitorTrackCreate(BaseModel):
    geom: dict[str, Any] = Field(
        ...,
        description='GeoJSON LineString: {"type":"LineString","coordinates":[[lon,lat],...]}',
    )


class VisitorTrackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    visitor_id: uuid.UUID
    geom: Optional[dict[str, Any]]
    recorded_at: datetime

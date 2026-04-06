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
    scenario_id: uuid.UUID
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
    start_time: datetime
    end_time: datetime


class VisitorTrackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    visitor_id: uuid.UUID
    geom: Optional[dict[str, Any]]
    start_time: datetime
    end_time: datetime


# ── VisitorExposure ───────────────────────────────────────────────────────────────

class VisitorExposureCreate(BaseModel):
    internal_exposure: float = Field(..., description="Internal exposure value for the visitor")
    external_exposure: float = Field(..., description="External exposure value for the visitor")


class VisitorExposureUpdate(BaseModel):
    internal_exposure: float | None = Field(
        default=None,
        description="Updated internal exposure value for the visitor",
    )
    external_exposure: float | None = Field(
        default=None,
        description="Updated external exposure value for the visitor",
    )


class VisitorExposureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    visitor_id: uuid.UUID
    created_at: datetime
    internal_exposure: float
    external_exposure: float



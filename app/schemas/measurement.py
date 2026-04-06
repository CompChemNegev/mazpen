from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── MeasurementType ──────────────────────────────────────────────────────────

class MeasurementTypeCreate(BaseModel):
    name: str = Field(..., max_length=100)
    unit: str = Field(..., max_length=50)


class MeasurementTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    unit: str


# ── Instrument ────────────────────────────────────────────────────────────────

class InstrumentCreate(BaseModel):
    name: str = Field(..., max_length=200)
    type: str = Field(..., max_length=100)
    calibration_date: Optional[datetime] = None


class InstrumentUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    type: Optional[str] = Field(default=None, max_length=100)
    calibration_date: Optional[datetime] = None


class InstrumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: str
    calibration_date: Optional[datetime]


# ── Measurement ───────────────────────────────────────────────────────────────

class MeasurementCreate(BaseModel):
    timestamp: datetime
    location: dict[str, Any] = Field(
        ..., description='GeoJSON Point: {"type":"Point","coordinates":[lon,lat]}'
    )
    measurement_type_id: uuid.UUID
    value: float
    unit: str = Field(..., max_length=50)
    instrument_id: uuid.UUID
    mission_id: Optional[uuid.UUID] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class MeasurementUpdate(BaseModel):
    timestamp: Optional[datetime] = None
    location: Optional[dict[str, Any]] = None
    value: Optional[float] = None
    unit: Optional[str] = Field(default=None, max_length=50)
    mission_id: Optional[uuid.UUID] = None
    metadata: Optional[dict[str, Any]] = None


class MeasurementLabelInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    label_id: uuid.UUID
    reason: Optional[str]
    created_at: datetime
    label: "LabelResponse"


class MeasurementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scenario_id: uuid.UUID
    timestamp: datetime
    location: Optional[dict[str, Any]]
    measurement_type_id: uuid.UUID
    value: float
    unit: str
    instrument_id: uuid.UUID
    mission_id: Optional[uuid.UUID]
    metadata: dict[str, Any]
    created_at: datetime
    measurement_type: MeasurementTypeResponse
    instrument: InstrumentResponse


# ── Measurement filter params ─────────────────────────────────────────────────

class MeasurementFilterParams(BaseModel):
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    lat_min: Optional[float] = Field(default=None, ge=-90, le=90)
    lat_max: Optional[float] = Field(default=None, ge=-90, le=90)
    lon_min: Optional[float] = Field(default=None, ge=-180, le=180)
    lon_max: Optional[float] = Field(default=None, ge=-180, le=180)
    measurement_type_id: Optional[uuid.UUID] = None
    mission_id: Optional[uuid.UUID] = None
    label_ids: Optional[list[uuid.UUID]] = None


# Avoid circular import — import after class definition
from app.schemas.label import LabelResponse  # noqa: E402

MeasurementLabelInfo.model_rebuild()
MeasurementResponse.model_rebuild()

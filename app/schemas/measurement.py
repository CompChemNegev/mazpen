from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ── Measurement ───────────────────────────────────────────────────────────────

class MeasurementCreate(BaseModel):
    timestamp: datetime
    location: dict[str, Any] = Field(
        ..., description='GeoJSON Point: {"type":"Point","coordinates":[lon,lat]}'
    )
    measurement_type: str = Field(..., max_length=100)
    instrument_type: str = Field(..., max_length=100)
    status: str = Field(default="valid", max_length=50)
    team: str = Field(..., max_length=100)
    value: float
    unit: str = Field(..., max_length=50)
    calculated_field: Optional[float] = None
    calculated_field_type: Optional[str] = Field(default=None, max_length=50)
    mission_id: Optional[uuid.UUID] = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator(
        "measurement_type",
        "instrument_type",
        "status",
        "team",
        "unit",
        "calculated_field_type",
    )
    @classmethod
    def normalize_strings(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip().lower()


class MeasurementUpdate(BaseModel):
    timestamp: Optional[datetime] = None
    location: Optional[dict[str, Any]] = None
    measurement_type: Optional[str] = Field(default=None, max_length=100)
    instrument_type: Optional[str] = Field(default=None, max_length=100)
    status: Optional[str] = Field(default=None, max_length=50)
    team: Optional[str] = Field(default=None, max_length=100)
    value: Optional[float] = None
    unit: Optional[str] = Field(default=None, max_length=50)
    calculated_field: Optional[float] = None
    calculated_field_type: Optional[str] = Field(default=None, max_length=50)
    mission_id: Optional[uuid.UUID] = None
    metadata: Optional[dict[str, Any]] = None

    @field_validator(
        "measurement_type",
        "instrument_type",
        "status",
        "team",
        "unit",
        "calculated_field_type",
    )
    @classmethod
    def normalize_optional_strings(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip().lower()


class MeasurementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scenario_id: uuid.UUID
    timestamp: datetime
    location: Optional[dict[str, Any]]
    measurement_type: str
    instrument_type: str
    status: str
    team: str
    value: float
    unit: str
    calculated_field: Optional[float]
    calculated_field_type: Optional[str]
    mission_id: Optional[uuid.UUID]
    metadata: dict[str, Any]
    created_at: datetime


# ── Measurement filter params ─────────────────────────────────────────────────

class MeasurementFilterParams(BaseModel):
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    lat_min: Optional[float] = Field(default=None, ge=-90, le=90)
    lat_max: Optional[float] = Field(default=None, ge=-90, le=90)
    lon_min: Optional[float] = Field(default=None, ge=-180, le=180)
    lon_max: Optional[float] = Field(default=None, ge=-180, le=180)
    measurement_type: Optional[str] = None
    status: Optional[str] = None
    team: Optional[str] = None
    calculated_field_type: Optional[str] = None
    mission_id: Optional[uuid.UUID] = None

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MissionCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    status: str = Field(default="planned", max_length=50)
    instrument_type: Optional[str] = Field(default=None, max_length=100)
    team_id: Optional[uuid.UUID] = None
    target_area: Optional[dict[str, Any]] = Field(
        default=None,
        description='GeoJSON geometry: Point | LineString | Polygon',
    )

    @field_validator("status", "instrument_type")
    @classmethod
    def normalize_status(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip().lower()


class MissionUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    status: Optional[str] = Field(default=None, max_length=50)
    instrument_type: Optional[str] = Field(default=None, max_length=100)
    team_id: Optional[uuid.UUID] = None
    target_area: Optional[dict[str, Any]] = None

    @field_validator("status", "instrument_type")
    @classmethod
    def normalize_status(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip().lower()


class MissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scenario_id: uuid.UUID
    name: str
    description: Optional[str]
    status: str
    instrument_type: Optional[str]
    team_id: Optional[uuid.UUID]
    target_area: Optional[dict[str, Any]]
    created_at: datetime

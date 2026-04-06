from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.mission import MissionStatus


class MissionCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    status: MissionStatus = MissionStatus.PLANNED
    target_area: Optional[dict[str, Any]] = Field(
        default=None,
        description='GeoJSON Polygon: {"type":"Polygon","coordinates":[[[lon,lat],...]]}',
    )


class MissionUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    status: Optional[MissionStatus] = None
    target_area: Optional[dict[str, Any]] = None


class MissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: Optional[str]
    status: MissionStatus
    target_area: Optional[dict[str, Any]]
    created_at: datetime


class MissionAssignmentCreate(BaseModel):
    instrument_id: uuid.UUID


class MissionAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    mission_id: uuid.UUID
    instrument_id: uuid.UUID
    assigned_at: datetime

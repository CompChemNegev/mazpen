from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.scenario import ScenarioType


class ScenarioCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    type: ScenarioType = ScenarioType.DRILL
    description: str | None = Field(default=None, max_length=500)


class ScenarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: ScenarioType
    description: str | None
    created_at: datetime

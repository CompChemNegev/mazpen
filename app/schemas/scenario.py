from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ScenarioCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    type: str = Field(default="drill", max_length=50)
    description: str | None = Field(default=None, max_length=500)

    @field_validator("type")
    @classmethod
    def normalize_type(cls, value: str) -> str:
        return value.strip().lower()


class ScenarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: str
    description: str | None
    created_at: datetime

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TeamMemberCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=120)
    role: str = Field(default="member", max_length=50)

    @field_validator("username", "role")
    @classmethod
    def normalize_values(cls, value: str) -> str:
        return value.strip().lower()


class TeamMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    team_id: uuid.UUID
    username: str
    role: str
    created_at: datetime


class TeamCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    members: list[TeamMemberCreate] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return value.strip().lower()


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip().lower()


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scenario_id: uuid.UUID
    name: str
    description: Optional[str]
    created_at: datetime
    members: list[TeamMemberResponse] = Field(default_factory=list)

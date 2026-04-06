from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


CATEGORY_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,99}$")
KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_\-]{0,99}$")


class ConfiguredValueBase(BaseModel):
    category: str = Field(..., min_length=2, max_length=100)
    key: str = Field(..., min_length=1, max_length=100)
    label: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool = True
    sort_order: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not CATEGORY_PATTERN.match(normalized):
            raise ValueError("category must match [a-z][a-z0-9_]{1,99}")
        return normalized

    @field_validator("key")
    @classmethod
    def validate_key(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not KEY_PATTERN.match(normalized):
            raise ValueError("key must match [a-z][a-z0-9_-]{0,99}")
        return normalized


class ConfiguredValueCreate(ConfiguredValueBase):
    pass


class ConfiguredValueUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None
    sort_order: int | None = None
    metadata: dict[str, Any] | None = None


class ConfiguredValueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category: str
    key: str
    label: str
    description: str | None
    is_active: bool
    sort_order: int
    metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime

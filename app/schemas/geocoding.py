from __future__ import annotations

from pydantic import BaseModel, Field


class GeocodingSuggestion(BaseModel):
    display_name: str = Field(..., max_length=500)
    lat: float
    lon: float

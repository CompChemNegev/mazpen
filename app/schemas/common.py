from __future__ import annotations

from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    sort: str = Field(default="created_at")
    sort_dir: str = Field(default="desc", pattern="^(asc|desc)$")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    limit: int
    pages: int

    @classmethod
    def create(
        cls,
        items: list[Any],
        total: int,
        params: PaginationParams,
    ) -> "PaginatedResponse[Any]":
        pages = ((total - 1) // params.limit + 1) if total > 0 else 0
        return cls(
            items=items,
            total=total,
            page=params.page,
            limit=params.limit,
            pages=pages,
        )


class GeoJSONPoint(BaseModel):
    type: str = "Point"
    coordinates: list[float] = Field(
        ...,
        min_length=2,
        max_length=3,
        description="[longitude, latitude] or [longitude, latitude, altitude]",
    )


class GeoJSONLineString(BaseModel):
    type: str = "LineString"
    coordinates: list[list[float]] = Field(
        ..., min_length=2, description="Array of [longitude, latitude] positions"
    )


class GeoJSONPolygon(BaseModel):
    type: str = "Polygon"
    coordinates: list[list[list[float]]] = Field(
        ..., description="Array of rings (exterior + holes)"
    )

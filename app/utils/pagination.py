from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Page number (1-based)")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page")
    sort: str = Field(default="created_at", description="Field to sort by")
    sort_dir: str = Field(default="desc", pattern="^(asc|desc)$", description="Sort direction")

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

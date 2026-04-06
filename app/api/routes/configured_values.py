from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminOnly, CurrentUser
from app.core.database import get_db
from app.schemas.configured_value import (
    ConfiguredValueCreate,
    ConfiguredValueResponse,
    ConfiguredValueUpdate,
)
from app.services.configured_value_service import ConfiguredValueService

router = APIRouter(prefix="/configured-values", tags=["Configured Values"])


@router.get("", response_model=list[ConfiguredValueResponse])
async def list_configured_values(
    _: CurrentUser,
    category: str = Query(..., min_length=2, max_length=100),
    include_inactive: bool = Query(default=False),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
) -> list[ConfiguredValueResponse]:
    """List configured values by category."""
    service = ConfiguredValueService(db)
    values = await service.list_values(
        category=category.lower(),
        include_inactive=include_inactive,
        skip=skip,
        limit=limit,
    )
    return [
        ConfiguredValueResponse(
            id=v.id,
            category=v.category,
            key=v.key,
            label=v.label,
            description=v.description,
            is_active=v.is_active,
            sort_order=v.sort_order,
            metadata=v.metadata_,
            created_at=v.created_at,
            updated_at=v.updated_at,
        )
        for v in values
    ]


@router.get("/{category}/{key}", response_model=ConfiguredValueResponse)
async def get_configured_value(
    category: str,
    key: str,
    _: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ConfiguredValueResponse:
    """Get a single configured value by category and key."""
    service = ConfiguredValueService(db)
    value = await service.get_value(category.lower(), key.lower())
    return ConfiguredValueResponse(
        id=value.id,
        category=value.category,
        key=value.key,
        label=value.label,
        description=value.description,
        is_active=value.is_active,
        sort_order=value.sort_order,
        metadata=value.metadata_,
        created_at=value.created_at,
        updated_at=value.updated_at,
    )


@router.post("", response_model=ConfiguredValueResponse, status_code=status.HTTP_201_CREATED)
async def create_configured_value(
    body: ConfiguredValueCreate,
    _: AdminOnly,
    db: AsyncSession = Depends(get_db),
) -> ConfiguredValueResponse:
    """Create a configured value (admin only)."""
    service = ConfiguredValueService(db)
    value = await service.create_value(body)
    return ConfiguredValueResponse(
        id=value.id,
        category=value.category,
        key=value.key,
        label=value.label,
        description=value.description,
        is_active=value.is_active,
        sort_order=value.sort_order,
        metadata=value.metadata_,
        created_at=value.created_at,
        updated_at=value.updated_at,
    )


@router.patch("/{value_id}", response_model=ConfiguredValueResponse)
async def update_configured_value(
    value_id: uuid.UUID,
    body: ConfiguredValueUpdate,
    _: AdminOnly,
    db: AsyncSession = Depends(get_db),
) -> ConfiguredValueResponse:
    """Update a configured value (admin only)."""
    service = ConfiguredValueService(db)
    value = await service.update_value(value_id, body)
    return ConfiguredValueResponse(
        id=value.id,
        category=value.category,
        key=value.key,
        label=value.label,
        description=value.description,
        is_active=value.is_active,
        sort_order=value.sort_order,
        metadata=value.metadata_,
        created_at=value.created_at,
        updated_at=value.updated_at,
    )


@router.delete("/{value_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_configured_value(
    value_id: uuid.UUID,
    _: AdminOnly,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft-delete (deactivate) a configured value (admin only)."""
    service = ConfiguredValueService(db)
    await service.deactivate_value(value_id)

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminOrOperator, CurrentScenario, CurrentUser
from app.core.database import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.filter import FilterQuery
from app.schemas.measurement import (
    MeasurementCreate,
    MeasurementFilterParams,
    MeasurementResponse,
    MeasurementUpdate,
)
from app.services.measurement_service import MeasurementService
from app.utils.filtering import wkb_to_geojson
from app.utils.pagination import PaginationParams
from app.websocket.connection_manager import event_bus

router = APIRouter(prefix="/{scenario_name}/measurements", tags=["Measurements"])


def _to_response(m) -> MeasurementResponse:
    return MeasurementResponse(
        id=m.id,
        scenario_id=m.scenario_id,
        timestamp=m.timestamp,
        location=wkb_to_geojson(m.location),
        measurement_type=m.measurement_type,
        instrument_type=m.instrument_type,
        status=m.status,
        team=m.team,
        value=m.value,
        unit=m.unit,
        calculated_field=m.calculated_field,
        calculated_field_type=m.calculated_field_type,
        mission_id=m.mission_id,
        metadata=m.metadata_,
        created_at=m.created_at,
    )


@router.post("", response_model=MeasurementResponse, status_code=status.HTTP_201_CREATED)
async def create_measurement(
    body: MeasurementCreate,
    background_tasks: BackgroundTasks,
    _: AdminOrOperator,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> MeasurementResponse:
    """Create a measurement within a scenario."""
    svc = MeasurementService(db)

    async def publish(event: dict) -> None:
        background_tasks.add_task(event_bus.publish, event)

    result = await svc.create_measurement(scenario.id, body, event_publisher=publish)
    return _to_response(result)


@router.get("", response_model=PaginatedResponse[MeasurementResponse])
async def list_measurements(
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="timestamp"),
    sort_dir: str = Query(default="desc", pattern="^(asc|desc)$"),
    from_date: Optional[str] = Query(default=None),
    to_date: Optional[str] = Query(default=None),
    lat_min: Optional[float] = Query(default=None),
    lat_max: Optional[float] = Query(default=None),
    lon_min: Optional[float] = Query(default=None),
    lon_max: Optional[float] = Query(default=None),
    measurement_type: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    team: Optional[str] = Query(default=None),
    calculated_field_type: Optional[str] = Query(default=None),
    mission_id: Optional[uuid.UUID] = Query(default=None),
) -> PaginatedResponse[MeasurementResponse]:
    """List measurements with pagination and optional filters."""
    pagination = PaginationParams(page=page, limit=limit, sort=sort, sort_dir=sort_dir)

    filters = MeasurementFilterParams(
        from_date=datetime.fromisoformat(from_date) if from_date else None,
        to_date=datetime.fromisoformat(to_date) if to_date else None,
        lat_min=lat_min,
        lat_max=lat_max,
        lon_min=lon_min,
        lon_max=lon_max,
        measurement_type=measurement_type.lower() if measurement_type else None,
        status=status_filter.lower() if status_filter else None,
        team=team.lower() if team else None,
        calculated_field_type=calculated_field_type.lower() if calculated_field_type else None,
        mission_id=mission_id,
    )

    svc = MeasurementService(db)
    items, total = await svc.list_measurements(scenario.id, filters, pagination)
    return PaginatedResponse.create(items=[_to_response(m) for m in items], total=total, params=pagination)


@router.post("/search", response_model=list[MeasurementResponse])
async def search_measurements(
    body: FilterQuery,
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> list[MeasurementResponse]:
    """Search measurements using structured FilterQuery payload."""
    svc = MeasurementService(db)
    items = await svc.search_measurements(scenario.id, body)
    return [_to_response(m) for m in items]


@router.get("/{measurement_id}", response_model=MeasurementResponse)
async def get_measurement(
    measurement_id: uuid.UUID,
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> MeasurementResponse:
    """Get measurement by id."""
    svc = MeasurementService(db)
    result = await svc.get_measurement(scenario.id, measurement_id)
    return _to_response(result)


@router.patch("/{measurement_id}", response_model=MeasurementResponse)
async def update_measurement(
    measurement_id: uuid.UUID,
    body: MeasurementUpdate,
    background_tasks: BackgroundTasks,
    _: AdminOrOperator,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> MeasurementResponse:
    """Update an existing measurement."""
    svc = MeasurementService(db)

    async def publish(event: dict) -> None:
        background_tasks.add_task(event_bus.publish, event)

    result = await svc.update_measurement(
        scenario.id,
        measurement_id,
        body,
        event_publisher=publish,
    )
    return _to_response(result)


@router.delete("/{measurement_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_measurement(
    measurement_id: uuid.UUID,
    _: AdminOrOperator,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete measurement by id."""
    svc = MeasurementService(db)
    await svc.delete_measurement(scenario.id, measurement_id)

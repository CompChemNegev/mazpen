from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminOrOperator, CurrentScenario, CurrentUser
from app.core.database import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.visitor import (
    BodyMeasurementCreate,
    BodyMeasurementResponse,
    VisitorCreate,
    VisitorResponse,
    VisitorTrackCreate,
    VisitorTrackResponse,
)
from app.services.visitor_service import VisitorService
from app.utils.filtering import wkb_to_geojson
from app.utils.pagination import PaginationParams
from app.websocket.connection_manager import event_bus

router = APIRouter(prefix="/{scenario_name}/visitors", tags=["Visitors"])
tracks_router = APIRouter(prefix="/{scenario_name}/visitor-tracks", tags=["Visitor Tracks"])


def _track_to_response(t) -> VisitorTrackResponse:
    return VisitorTrackResponse(
        id=t.id,
        visitor_id=t.visitor_id,
        geom=wkb_to_geojson(t.geom),
        recorded_at=t.recorded_at,
    )


# ── Visitors ──────────────────────────────────────────────────────────────────

@router.post("", response_model=VisitorResponse, status_code=status.HTTP_201_CREATED)
async def create_visitor(
    body: VisitorCreate,
    _: AdminOrOperator,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> VisitorResponse:
    svc = VisitorService(db)
    result = await svc.create_visitor(scenario.id, body)
    return VisitorResponse.model_validate(result)


@router.get("", response_model=PaginatedResponse[VisitorResponse])
async def list_visitors(
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> PaginatedResponse[VisitorResponse]:
    pagination = PaginationParams(page=page, limit=limit)
    svc = VisitorService(db)
    items, total = await svc.list_visitors(scenario.id, pagination)
    responses = [VisitorResponse.model_validate(v) for v in items]
    return PaginatedResponse.create(items=responses, total=total, params=pagination)


@router.get("/{visitor_id}", response_model=VisitorResponse)
async def get_visitor(
    visitor_id: uuid.UUID,
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> VisitorResponse:
    svc = VisitorService(db)
    result = await svc.get_visitor(scenario.id, visitor_id)
    return VisitorResponse.model_validate(result)


# ── Body Measurements ─────────────────────────────────────────────────────────

@router.post(
    "/{visitor_id}/body-measurements",
    response_model=BodyMeasurementResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_body_measurement(
    visitor_id: uuid.UUID,
    body: BodyMeasurementCreate,
    _: AdminOrOperator,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> BodyMeasurementResponse:
    svc = VisitorService(db)
    result = await svc.create_body_measurement(scenario.id, visitor_id, body)
    return BodyMeasurementResponse.model_validate(result)


@router.get("/{visitor_id}/body-measurements", response_model=list[BodyMeasurementResponse])
async def list_body_measurements(
    visitor_id: uuid.UUID,
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> list[BodyMeasurementResponse]:
    svc = VisitorService(db)
    items = await svc.list_body_measurements(scenario.id, visitor_id)
    return [BodyMeasurementResponse.model_validate(m) for m in items]


# ── Visitor Tracks ────────────────────────────────────────────────────────────

@router.post(
    "/{visitor_id}/tracks",
    response_model=VisitorTrackResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_visitor_track(
    visitor_id: uuid.UUID,
    body: VisitorTrackCreate,
    background_tasks: BackgroundTasks,
    _: AdminOrOperator,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> VisitorTrackResponse:
    svc = VisitorService(db)

    async def publish(event: dict) -> None:
        background_tasks.add_task(event_bus.publish, event)

    result = await svc.create_track(scenario.id, visitor_id, body, event_publisher=publish)
    return _track_to_response(result)


@router.get("/{visitor_id}/tracks", response_model=list[VisitorTrackResponse])
async def list_visitor_tracks(
    visitor_id: uuid.UUID,
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> list[VisitorTrackResponse]:
    svc = VisitorService(db)
    items = await svc.list_tracks(scenario.id, visitor_id)
    return [_track_to_response(t) for t in items]


# ── Global Tracks ─────────────────────────────────────────────────────────────

@tracks_router.get("", response_model=PaginatedResponse[VisitorTrackResponse])
async def list_all_tracks(
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
) -> PaginatedResponse[VisitorTrackResponse]:
    pagination = PaginationParams(page=page, limit=limit)
    svc = VisitorService(db)
    items, total = await svc.list_all_tracks(scenario.id, pagination)
    responses = [_track_to_response(t) for t in items]
    return PaginatedResponse.create(items=responses, total=total, params=pagination)

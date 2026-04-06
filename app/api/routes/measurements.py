from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminOrOperator, CurrentScenario, CurrentUser
from app.core.database import get_db
from app.models.scenario import Scenario
from app.schemas.common import PaginatedResponse
from app.schemas.label import MeasurementLabelCreate
from app.schemas.measurement import (
    InstrumentCreate,
    InstrumentResponse,
    InstrumentUpdate,
    MeasurementCreate,
    MeasurementFilterParams,
    MeasurementResponse,
    MeasurementTypeCreate,
    MeasurementTypeResponse,
    MeasurementUpdate,
)
from app.services.measurement_service import MeasurementService
from app.utils.exceptions import ConflictException, NotFoundException
from app.utils.filtering import wkb_to_geojson
from app.utils.pagination import PaginationParams
from app.websocket.connection_manager import event_bus

router = APIRouter(prefix="/{scenario_name}/measurements", tags=["Measurements"])
type_router = APIRouter(prefix="/{scenario_name}/measurement-types", tags=["Measurement Types"])
instrument_router = APIRouter(prefix="/{scenario_name}/instruments", tags=["Instruments"])


def _to_response(m) -> MeasurementResponse:
    data = {c.name if c.name != "metadata" else "metadata": getattr(m, c.key if c.key != "metadata_" else "metadata_") for c in m.__table__.columns}
    loc = wkb_to_geojson(m.location)
    return MeasurementResponse(
        id=m.id,
        scenario_id=m.scenario_id,
        timestamp=m.timestamp,
        location=loc,
        measurement_type_id=m.measurement_type_id,
        value=m.value,
        unit=m.unit,
        instrument_id=m.instrument_id,
        mission_id=m.mission_id,
        metadata=m.metadata_,
        created_at=m.created_at,
        measurement_type=MeasurementTypeResponse.model_validate(m.measurement_type),
        instrument=InstrumentResponse.model_validate(m.instrument),
    )


# ── Measurement Types ─────────────────────────────────────────────────────────

@type_router.post("", response_model=MeasurementTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_measurement_type(
    body: MeasurementTypeCreate,
    _: AdminOrOperator,
    __: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> MeasurementTypeResponse:
    from app.models.measurement import MeasurementType
    from app.repositories.measurement_repository import MeasurementTypeRepository

    repo = MeasurementTypeRepository(db)
    existing = await repo.get_by_name(body.name)
    if existing:
        raise ConflictException(f"MeasurementType '{body.name}' already exists")
    obj = MeasurementType(name=body.name, unit=body.unit)
    result = await repo.save(obj)
    return MeasurementTypeResponse.model_validate(result)


@type_router.get("", response_model=list[MeasurementTypeResponse])
async def list_measurement_types(
    _: CurrentUser,
    __: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> list[MeasurementTypeResponse]:
    from app.repositories.measurement_repository import MeasurementTypeRepository

    items = await MeasurementTypeRepository(db).get_all()
    return [MeasurementTypeResponse.model_validate(i) for i in items]


# ── Instruments ───────────────────────────────────────────────────────────────

@instrument_router.post("", response_model=InstrumentResponse, status_code=status.HTTP_201_CREATED)
async def create_instrument(
    body: InstrumentCreate,
    _: AdminOrOperator,
    __: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> InstrumentResponse:
    svc = MeasurementService(db)
    result = await svc.create_instrument(body)
    return InstrumentResponse.model_validate(result)


@instrument_router.get("", response_model=list[InstrumentResponse])
async def list_instruments(
    _: CurrentUser,
    __: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> list[InstrumentResponse]:
    from app.repositories.measurement_repository import InstrumentRepository

    items = await InstrumentRepository(db).get_all()
    return [InstrumentResponse.model_validate(i) for i in items]


@instrument_router.patch("/{instrument_id}", response_model=InstrumentResponse)
async def update_instrument(
    instrument_id: uuid.UUID,
    body: InstrumentUpdate,
    _: AdminOrOperator,
    __: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> InstrumentResponse:
    svc = MeasurementService(db)
    result = await svc.update_instrument(instrument_id, body)
    return InstrumentResponse.model_validate(result)


# ── Measurements ──────────────────────────────────────────────────────────────

@router.post("", response_model=MeasurementResponse, status_code=status.HTTP_201_CREATED)
async def create_measurement(
    body: MeasurementCreate,
    background_tasks: BackgroundTasks,
    _: AdminOrOperator,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> MeasurementResponse:
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
    measurement_type_id: Optional[uuid.UUID] = Query(default=None),
    mission_id: Optional[uuid.UUID] = Query(default=None),
    label_ids: Optional[str] = Query(default=None, description="Comma-separated UUIDs"),
) -> PaginatedResponse[MeasurementResponse]:
    from datetime import datetime

    pagination = PaginationParams(page=page, limit=limit, sort=sort, sort_dir=sort_dir)

    parsed_label_ids = (
        [uuid.UUID(lid.strip()) for lid in label_ids.split(",") if lid.strip()]
        if label_ids
        else None
    )
    filters = MeasurementFilterParams(
        from_date=datetime.fromisoformat(from_date) if from_date else None,
        to_date=datetime.fromisoformat(to_date) if to_date else None,
        lat_min=lat_min,
        lat_max=lat_max,
        lon_min=lon_min,
        lon_max=lon_max,
        measurement_type_id=measurement_type_id,
        mission_id=mission_id,
        label_ids=parsed_label_ids,
    )

    svc = MeasurementService(db)
    items, total = await svc.list_measurements(scenario.id, filters, pagination)
    responses = [_to_response(m) for m in items]
    return PaginatedResponse.create(items=responses, total=total, params=pagination)


@router.get("/{measurement_id}", response_model=MeasurementResponse)
async def get_measurement(
    measurement_id: uuid.UUID,
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> MeasurementResponse:
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


@router.delete("/{measurement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_measurement(
    measurement_id: uuid.UUID,
    _: AdminOrOperator,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> None:
    svc = MeasurementService(db)
    await svc.delete_measurement(scenario.id, measurement_id)


@router.post("/{measurement_id}/labels", status_code=status.HTTP_201_CREATED)
async def assign_label_to_measurement(
    measurement_id: uuid.UUID,
    body: MeasurementLabelCreate,
    background_tasks: BackgroundTasks,
    _: AdminOrOperator,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> dict:
    svc = MeasurementService(db)

    async def publish(event: dict) -> None:
        background_tasks.add_task(event_bus.publish, event)

    assoc = await svc.assign_label(
        scenario.id,
        measurement_id,
        body,
        event_publisher=publish,
    )
    return {
        "measurement_id": str(assoc.measurement_id),
        "label_id": str(assoc.label_id),
        "reason": assoc.reason,
        "created_at": assoc.created_at.isoformat(),
    }

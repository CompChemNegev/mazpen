from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminOnly, AdminOrOperator, CurrentScenario, CurrentUser
from app.core.database import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.mission import (
    MissionAssignmentCreate,
    MissionAssignmentResponse,
    MissionCreate,
    MissionResponse,
    MissionUpdate,
)
from app.services.mission_service import MissionService
from app.utils.filtering import wkb_to_geojson
from app.utils.pagination import PaginationParams
from app.websocket.connection_manager import event_bus

router = APIRouter(prefix="/{scenario_name}/missions", tags=["Missions"])


def _mission_to_response(m) -> MissionResponse:
    return MissionResponse(
        id=m.id,
        scenario_id=m.scenario_id,
        name=m.name,
        description=m.description,
        status=m.status,
        target_area=wkb_to_geojson(m.target_area),
        created_at=m.created_at,
    )


@router.post("", response_model=MissionResponse, status_code=status.HTTP_201_CREATED)
async def create_mission(
    body: MissionCreate,
    background_tasks: BackgroundTasks,
    _: AdminOrOperator,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> MissionResponse:
    svc = MissionService(db)

    async def publish(event: dict) -> None:
        background_tasks.add_task(event_bus.publish, event)

    result = await svc.create_mission(scenario.id, body, event_publisher=publish)
    return _mission_to_response(result)


@router.get("", response_model=PaginatedResponse[MissionResponse])
async def list_missions(
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(default=None, alias="status"),
) -> PaginatedResponse[MissionResponse]:
    pagination = PaginationParams(page=page, limit=limit)
    svc = MissionService(db)
    items, total = await svc.list_missions(scenario.id, pagination, status=status_filter)
    responses = [_mission_to_response(m) for m in items]
    return PaginatedResponse.create(items=responses, total=total, params=pagination)


@router.get("/{mission_id}", response_model=MissionResponse)
async def get_mission(
    mission_id: uuid.UUID,
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> MissionResponse:
    svc = MissionService(db)
    result = await svc.get_mission(scenario.id, mission_id)
    return _mission_to_response(result)


@router.patch("/{mission_id}", response_model=MissionResponse)
async def update_mission(
    mission_id: uuid.UUID,
    body: MissionUpdate,
    background_tasks: BackgroundTasks,
    _: AdminOrOperator,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> MissionResponse:
    svc = MissionService(db)

    async def publish(event: dict) -> None:
        background_tasks.add_task(event_bus.publish, event)

    result = await svc.update_mission(scenario.id, mission_id, body, event_publisher=publish)
    return _mission_to_response(result)


@router.delete("/{mission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mission(
    mission_id: uuid.UUID,
    _: AdminOnly,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> None:
    svc = MissionService(db)
    await svc.delete_mission(scenario.id, mission_id)


@router.post(
    "/{mission_id}/assignments",
    response_model=MissionAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def assign_instrument_to_mission(
    mission_id: uuid.UUID,
    body: MissionAssignmentCreate,
    _: AdminOrOperator,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> MissionAssignmentResponse:
    svc = MissionService(db)
    result = await svc.add_assignment(scenario.id, mission_id, body)
    return MissionAssignmentResponse.model_validate(result)

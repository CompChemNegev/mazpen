from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mission import Mission
from app.repositories.mission_repository import MissionRepository
from app.schemas.mission import MissionCreate, MissionUpdate
from app.utils.exceptions import NotFoundException
from app.utils.filtering import wkb_to_geojson
from app.utils.pagination import PaginationParams
from app.schemas.filter import FilterQuery
from app.repositories.base import BaseRepository
from app.services.configured_value_service import ConfiguredValueService
from app.services.base_service import BaseService


class MissionService(BaseService):
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = MissionRepository(db)
        self.config_service = ConfiguredValueService(db)

    async def create_mission(
        self,
        scenario_id: uuid.UUID,
        data: MissionCreate,
        event_publisher: Any = None,
    ) -> Mission:
        await self.config_service.assert_active_value(
            category="mission_status",
            key=data.status,
            field_name="mission.status",
        )
        if data.instrument_type is not None:
            await self.config_service.assert_active_value(
                category="instrument_type",
                key=data.instrument_type,
                field_name="mission.instrument_type",
            )
        payload = data.model_dump()
        payload["scenario_id"] = scenario_id
        mission = await self.repo.create_mission(payload)
        if event_publisher:
            await event_publisher(
                {
                    "event": "mission.created",
                    "data": self.serialize_for_event(mission),
                }
            )
        return mission

    async def get_mission(self, scenario_id: uuid.UUID, mission_id: uuid.UUID) -> Mission:
        mission = await self.repo.get_by_id(mission_id, scenario_id=scenario_id)
        if not mission:
            raise NotFoundException("Mission not found")
        return mission

    async def list_missions(
        self,
        scenario_id: uuid.UUID,
        pagination: PaginationParams,
        status: str | None = None,
    ) -> tuple[list[Mission], int]:
        items, total = await self.repo.get_all_paginated(
            scenario_id=scenario_id,
            skip=pagination.offset, limit=pagination.limit, status=status
        )
        return list(items), total

    async def search_missions(
        self,
        scenario_id: uuid.UUID,
        filter_query: FilterQuery,
    ) -> list[Mission]:
        """Search missions using structured filters."""
        repo = BaseRepository(Mission, self.db)
        try:
            results = await repo.filter_by(filter_query, scenario_id=scenario_id)
        except ValueError as e:
            raise NotFoundException(f"Invalid filter: {str(e)}")
        return list(results)

    async def update_mission(
        self,
        scenario_id: uuid.UUID,
        mission_id: uuid.UUID,
        data: MissionUpdate,
        event_publisher: Any = None,
    ) -> Mission:
        if data.status is not None:
            await self.config_service.assert_active_value(
                category="mission_status",
                key=data.status,
                field_name="mission.status",
            )
        if data.instrument_type is not None:
            await self.config_service.assert_active_value(
                category="instrument_type",
                key=data.instrument_type,
                field_name="mission.instrument_type",
            )
        mission = await self.get_mission(scenario_id, mission_id)
        updated = await self.repo.update_mission(
            mission, data.model_dump(exclude_unset=True, exclude_none=True)
        )
        if event_publisher:
            await event_publisher(
                {
                    "event": "mission.updated",
                    "data": self.serialize_for_event(updated),
                }
            )
        return updated

    async def delete_mission(self, scenario_id: uuid.UUID, mission_id: uuid.UUID) -> None:
        mission = await self.get_mission(scenario_id, mission_id)
        await self.repo.delete(mission)

    def serialize_for_event(self, m: Mission | None) -> dict[str, Any]:
        if m is None:
            return {}
        return {
            "id": str(m.id),
            "scenario_id": str(m.scenario_id),
            "name": m.name,
            "status": m.status,
            "instrument_type": m.instrument_type,
            "team_id": str(m.team_id) if m.team_id else None,
            "target_area": wkb_to_geojson(m.target_area),
        }

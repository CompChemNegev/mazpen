from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mission import Mission, MissionInstrumentAssignment
from app.repositories.measurement_repository import InstrumentRepository
from app.repositories.mission_repository import MissionRepository
from app.schemas.mission import MissionAssignmentCreate, MissionCreate, MissionUpdate
from app.utils.exceptions import NotFoundException
from app.utils.filtering import wkb_to_geojson
from app.utils.pagination import PaginationParams
from app.schemas.filter import FilterQuery
from app.repositories.base import BaseRepository


class MissionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = MissionRepository(db)
        self.instrument_repo = InstrumentRepository(db)

    async def create_mission(
        self,
        scenario_id: uuid.UUID,
        data: MissionCreate,
        event_publisher: Any = None,
    ) -> Mission:
        payload = data.model_dump()
        payload["scenario_id"] = scenario_id
        mission = await self.repo.create_mission(payload)
        if event_publisher:
            await event_publisher(
                {
                    "event": "mission.created",
                    "data": {
                        "id": str(mission.id),
                        "scenario_id": str(scenario_id),
                        "name": mission.name,
                    },
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
        mission = await self.get_mission(scenario_id, mission_id)
        updated = await self.repo.update_mission(
            mission, data.model_dump(exclude_unset=True, exclude_none=True)
        )
        if event_publisher:
            await event_publisher(
                {
                    "event": "mission.updated",
                    "data": {
                        "id": str(updated.id),
                        "scenario_id": str(scenario_id),
                        "status": updated.status,
                    },
                }
            )
        return updated

    async def delete_mission(self, scenario_id: uuid.UUID, mission_id: uuid.UUID) -> None:
        mission = await self.get_mission(scenario_id, mission_id)
        await self.repo.delete(mission)

    async def add_assignment(
        self,
        scenario_id: uuid.UUID,
        mission_id: uuid.UUID,
        body: MissionAssignmentCreate,
    ) -> MissionInstrumentAssignment:
        await self.get_mission(scenario_id, mission_id)
        instrument = await self.instrument_repo.get_by_id(body.instrument_id)
        if not instrument:
            raise NotFoundException("Instrument not found")
        return await self.repo.add_assignment(mission_id, body.instrument_id)

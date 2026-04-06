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


class MissionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = MissionRepository(db)
        self.instrument_repo = InstrumentRepository(db)

    async def create_mission(
        self, data: MissionCreate, event_publisher: Any = None
    ) -> Mission:
        mission = await self.repo.create_mission(data.model_dump())
        if event_publisher:
            await event_publisher(
                {
                    "event": "mission.created",
                    "data": {"id": str(mission.id), "name": mission.name},
                }
            )
        return mission

    async def get_mission(self, mission_id: uuid.UUID) -> Mission:
        mission = await self.repo.get_by_id(mission_id)
        if not mission:
            raise NotFoundException("Mission not found")
        return mission

    async def list_missions(
        self, pagination: PaginationParams, status: str | None = None
    ) -> tuple[list[Mission], int]:
        items, total = await self.repo.get_all_paginated(
            skip=pagination.offset, limit=pagination.limit, status=status
        )
        return list(items), total

    async def update_mission(
        self,
        mission_id: uuid.UUID,
        data: MissionUpdate,
        event_publisher: Any = None,
    ) -> Mission:
        mission = await self.get_mission(mission_id)
        updated = await self.repo.update_mission(
            mission, data.model_dump(exclude_unset=True, exclude_none=True)
        )
        if event_publisher:
            await event_publisher(
                {
                    "event": "mission.updated",
                    "data": {"id": str(updated.id), "status": updated.status},
                }
            )
        return updated

    async def delete_mission(self, mission_id: uuid.UUID) -> None:
        mission = await self.get_mission(mission_id)
        await self.repo.delete(mission)

    async def add_assignment(
        self, mission_id: uuid.UUID, body: MissionAssignmentCreate
    ) -> MissionInstrumentAssignment:
        await self.get_mission(mission_id)
        instrument = await self.instrument_repo.get_by_id(body.instrument_id)
        if not instrument:
            raise NotFoundException("Instrument not found")
        return await self.repo.add_assignment(mission_id, body.instrument_id)

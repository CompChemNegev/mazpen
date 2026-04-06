from __future__ import annotations

import uuid
from typing import Any, Optional, Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mission import Mission, MissionInstrumentAssignment
from app.repositories.base import BaseRepository
from app.utils.filtering import geojson_to_wkb


class MissionRepository(BaseRepository[Mission]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Mission, db)

    async def get_all_paginated(
        self,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
    ) -> tuple[Sequence[Mission], int]:
        conds: list[Any] = []
        if status:
            conds.append(Mission.status == status)

        count_stmt = select(func.count()).select_from(Mission)
        if conds:
            count_stmt = count_stmt.where(*conds)
        total = (await self.db.execute(count_stmt)).scalar_one()

        stmt = select(Mission).offset(skip).limit(limit)
        if conds:
            stmt = stmt.where(*conds)
        result = await self.db.execute(stmt)
        return result.scalars().all(), total

    async def create_mission(self, data: dict[str, Any]) -> Mission:
        target_area = data.pop("target_area", None)
        wkb_area = geojson_to_wkb(target_area) if target_area else None
        obj = Mission(**data, target_area=wkb_area)
        return await self.save(obj)

    async def update_mission(
        self, mission: Mission, data: dict[str, Any]
    ) -> Mission:
        if "target_area" in data and data["target_area"] is not None:
            data["target_area"] = geojson_to_wkb(data["target_area"])
        for key, value in data.items():
            if value is not None:
                setattr(mission, key, value)
        await self.db.flush()
        await self.db.refresh(mission)
        return mission

    async def add_assignment(
        self, mission_id: uuid.UUID, instrument_id: uuid.UUID
    ) -> MissionInstrumentAssignment:
        obj = MissionInstrumentAssignment(
            mission_id=mission_id, instrument_id=instrument_id
        )
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

from __future__ import annotations

import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.label import Label, MeasurementLabel
from app.repositories.base import BaseRepository


class LabelRepository(BaseRepository[Label]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Label, db)

    async def get_by_name(self, scenario_id: uuid.UUID, name: str) -> Label | None:
        result = await self.db.execute(
            select(Label).where(Label.scenario_id == scenario_id, Label.name == name)
        )
        return result.scalar_one_or_none()

    async def get_by_id(
        self,
        record_id: uuid.UUID,
        scenario_id: uuid.UUID | None = None,
    ) -> Label | None:
        stmt = select(Label).where(Label.id == record_id)
        if scenario_id is not None:
            stmt = stmt.where(Label.scenario_id == scenario_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_labels(self, scenario_id: uuid.UUID) -> Sequence[Label]:
        result = await self.db.execute(
            select(Label).where(Label.scenario_id == scenario_id).order_by(Label.name)
        )
        return result.scalars().all()


class MeasurementLabelRepository(BaseRepository[MeasurementLabel]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(MeasurementLabel, db)

    async def get_for_measurement(
        self, measurement_id: uuid.UUID
    ) -> Sequence[MeasurementLabel]:
        result = await self.db.execute(
            select(MeasurementLabel).where(
                MeasurementLabel.measurement_id == measurement_id
            )
        )
        return result.scalars().all()

    async def assign_label(
        self,
        measurement_id: uuid.UUID,
        label_id: uuid.UUID,
        reason: str | None = None,
    ) -> MeasurementLabel:
        obj = MeasurementLabel(
            measurement_id=measurement_id, label_id=label_id, reason=reason
        )
        self.db.add(obj)
        await self.db.flush()
        return obj

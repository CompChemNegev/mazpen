from __future__ import annotations

import uuid
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.measurement import Instrument, Measurement
from app.repositories.measurement_repository import (
    InstrumentRepository,
    MeasurementRepository,
    MeasurementTypeRepository,
)
from app.repositories.label_repository import LabelRepository, MeasurementLabelRepository
from app.schemas.measurement import (
    InstrumentCreate,
    InstrumentUpdate,
    MeasurementCreate,
    MeasurementFilterParams,
    MeasurementUpdate,
)
from app.schemas.label import MeasurementLabelCreate
from app.utils.exceptions import NotFoundException
from app.utils.filtering import wkb_to_geojson
from app.utils.pagination import PaginationParams


class MeasurementService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = MeasurementRepository(db)
        self.type_repo = MeasurementTypeRepository(db)
        self.instrument_repo = InstrumentRepository(db)
        self.label_repo = LabelRepository(db)
        self.label_assoc_repo = MeasurementLabelRepository(db)

    # ── Instrument ────────────────────────────────────────────────────────────

    async def create_instrument(self, data: InstrumentCreate) -> Instrument:
        obj = Instrument(**data.model_dump())
        return await self.instrument_repo.save(obj)

    async def update_instrument(
        self, instrument_id: uuid.UUID, data: InstrumentUpdate
    ) -> Instrument:
        instrument = await self.instrument_repo.get_by_id(instrument_id)
        if not instrument:
            raise NotFoundException("Instrument not found")
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(instrument, key, value)
        await self.db.flush()
        await self.db.refresh(instrument)
        return instrument

    # ── Measurement ───────────────────────────────────────────────────────────

    async def create_measurement(
        self, data: MeasurementCreate, event_publisher: Any = None
    ) -> Measurement:
        measurement = await self.repo.create_measurement(data.model_dump())
        # Reload with relations
        measurement = await self.repo.get_by_id(measurement.id)
        if event_publisher:
            await event_publisher(
                {
                    "event": "measurement.created",
                    "data": self._serialize(measurement),
                }
            )
        return measurement  # type: ignore[return-value]

    async def get_measurement(self, measurement_id: uuid.UUID) -> Measurement:
        measurement = await self.repo.get_by_id(measurement_id)
        if not measurement:
            raise NotFoundException("Measurement not found")
        return measurement

    async def list_measurements(
        self,
        filters: MeasurementFilterParams,
        pagination: PaginationParams,
    ) -> tuple[list[Measurement], int]:
        items, total = await self.repo.get_filtered(
            filters=filters,
            skip=pagination.offset,
            limit=pagination.limit,
            sort_col=pagination.sort,
            sort_dir=pagination.sort_dir,
        )
        return list(items), total

    async def update_measurement(
        self,
        measurement_id: uuid.UUID,
        data: MeasurementUpdate,
        event_publisher: Any = None,
    ) -> Measurement:
        measurement = await self.get_measurement(measurement_id)
        updated = await self.repo.update_measurement(
            measurement, data.model_dump(exclude_unset=True, exclude_none=True)
        )
        updated = await self.repo.get_by_id(updated.id)
        if event_publisher:
            await event_publisher(
                {
                    "event": "measurement.updated",
                    "data": self._serialize(updated),
                }
            )
        return updated  # type: ignore[return-value]

    async def delete_measurement(self, measurement_id: uuid.UUID) -> None:
        measurement = await self.get_measurement(measurement_id)
        await self.repo.delete(measurement)

    async def assign_label(
        self,
        measurement_id: uuid.UUID,
        body: MeasurementLabelCreate,
        event_publisher: Any = None,
    ) -> Any:
        await self.get_measurement(measurement_id)
        label = await self.label_repo.get_by_id(body.label_id)
        if not label:
            raise NotFoundException("Label not found")
        assoc = await self.label_assoc_repo.assign_label(
            measurement_id, body.label_id, body.reason
        )
        if event_publisher:
            await event_publisher(
                {
                    "event": "label.assigned",
                    "data": {
                        "measurement_id": str(measurement_id),
                        "label_id": str(body.label_id),
                        "reason": body.reason,
                    },
                }
            )
        return assoc

    def _serialize(self, m: Measurement | None) -> dict[str, Any]:
        if m is None:
            return {}
        return {
            "id": str(m.id),
            "timestamp": m.timestamp.isoformat(),
            "location": wkb_to_geojson(m.location),
            "value": m.value,
            "unit": m.unit,
            "mission_id": str(m.mission_id) if m.mission_id else None,
        }

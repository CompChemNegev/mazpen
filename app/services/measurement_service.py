from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.measurement import Measurement
from app.repositories.measurement_repository import (
    MeasurementRepository,
)
from app.schemas.measurement import (
    MeasurementCreate,
    MeasurementFilterParams,
    MeasurementUpdate,
)
from app.utils.exceptions import NotFoundException
from app.utils.filtering import wkb_to_geojson
from app.utils.pagination import PaginationParams
from app.schemas.filter import FilterQuery
from app.repositories.base import BaseRepository
from app.services.configured_value_service import ConfiguredValueService
from app.services.base_service import BaseService
from app.utils.physics_calculations import calculate_field


class MeasurementService(BaseService):
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = MeasurementRepository(db)
        self.config_service = ConfiguredValueService(db)

    # ── Measurement ───────────────────────────────────────────────────────────

    async def create_measurement(
        self,
        scenario_id: uuid.UUID,
        data: MeasurementCreate,
        event_publisher: Any = None,
    ) -> Measurement:
        await self.config_service.assert_active_value(
            category="measurement_type",
            key=data.measurement_type,
            field_name="measurement.measurement_type",
        )
        await self.config_service.assert_active_value(
            category="instrument_type",
            key=data.instrument_type,
            field_name="measurement.instrument_type",
        )
        await self.config_service.assert_active_value(
            category="measurement_unit",
            key=data.unit,
            field_name="measurement.unit",
        )
        await self.config_service.assert_active_value(
            category="measurement_status",
            key=data.status,
            field_name="measurement.status",
        )
        if data.calculated_field_type is not None:
            await self.config_service.assert_active_value(
                category="calculated_field_type",
                key=data.calculated_field_type,
                field_name="measurement.calculated_field_type",
            )
        payload = data.model_dump()
        payload["scenario_id"] = scenario_id
        measurement = await self.repo.create_measurement(payload)
        measurement = await self.repo.get_by_id(measurement.id, scenario_id=scenario_id)
        if event_publisher:
            await event_publisher(
                {
                    "event": "measurement.created",
                    "data": self.serialize_for_event(measurement),
                }
            )
        return measurement  # type: ignore[return-value]

    async def get_measurement(
        self,
        scenario_id: uuid.UUID,
        measurement_id: uuid.UUID,
    ) -> Measurement:
        measurement = await self.repo.get_by_id(measurement_id, scenario_id=scenario_id)
        if not measurement:
            raise NotFoundException("Measurement not found")
        return measurement

    async def list_measurements(
        self,
        scenario_id: uuid.UUID,
        filters: MeasurementFilterParams,
        pagination: PaginationParams,
    ) -> tuple[list[Measurement], int]:
        items, total = await self.repo.get_filtered(
            scenario_id=scenario_id,
            filters=filters,
            skip=pagination.offset,
            limit=pagination.limit,
            sort_col=pagination.sort,
            sort_dir=pagination.sort_dir,
        )
        return list(items), total

    async def search_measurements(
        self,
        scenario_id: uuid.UUID,
        filter_query: FilterQuery,
    ) -> list[Measurement]:
        """Search measurements using structured filters."""
        repo = BaseRepository(Measurement, self.db)
        try:
            results = await repo.filter_by(filter_query, scenario_id=scenario_id)
        except ValueError as e:
            raise NotFoundException(f"Invalid filter: {str(e)}")
        return list(results)

    async def update_measurement(
        self,
        scenario_id: uuid.UUID,
        measurement_id: uuid.UUID,
        data: MeasurementUpdate,
        event_publisher: Any = None,
    ) -> Measurement:
        if data.measurement_type is not None:
            await self.config_service.assert_active_value(
                category="measurement_type",
                key=data.measurement_type,
                field_name="measurement.measurement_type",
            )
        if data.instrument_type is not None:
            await self.config_service.assert_active_value(
                category="instrument_type",
                key=data.instrument_type,
                field_name="measurement.instrument_type",
            )
        if data.unit is not None:
            await self.config_service.assert_active_value(
                category="measurement_unit",
                key=data.unit,
                field_name="measurement.unit",
            )
        if data.status is not None:
            await self.config_service.assert_active_value(
                category="measurement_status",
                key=data.status,
                field_name="measurement.status",
            )
        if data.calculated_field_type is not None:
            await self.config_service.assert_active_value(
                category="calculated_field_type",
                key=data.calculated_field_type,
                field_name="measurement.calculated_field_type",
            )
        measurement = await self.get_measurement(scenario_id, measurement_id)
        calculated_field_data = calculate_field(self.db, scenario_id, measurement_id)
        data.calculated_field = calculated_field_data.calculated_field
        data.calculated_field_type = calculated_field_data.calculated_field_type
        updated = await self.repo.update_measurement(
            measurement, data.model_dump(exclude_unset=True, exclude_none=True)
        )
        updated = await self.repo.get_by_id(updated.id, scenario_id=scenario_id)
        if event_publisher:
            await event_publisher(
                {
                    "event": "measurement.updated",
                    "data": self.serialize_for_event(updated),
                }
            )
        return updated  # type: ignore[return-value]

    async def delete_measurement(self, scenario_id: uuid.UUID, measurement_id: uuid.UUID) -> None:
        measurement = await self.get_measurement(scenario_id, measurement_id)
        await self.repo.delete(measurement)

    def serialize_for_event(self, m: Measurement | None) -> dict[str, Any]:
        if m is None:
            return {}
        return {
            "id": str(m.id),
            "scenario_id": str(m.scenario_id),
            "timestamp": m.timestamp.isoformat(),
            "location": wkb_to_geojson(m.location),
            "measurement_type": m.measurement_type,
            "instrument_type": m.instrument_type,
            "status": m.status,
            "team": m.team,
            "value": m.value,
            "unit": m.unit,
            "calculated_field": m.calculated_field,
            "calculated_field_type": m.calculated_field_type,
            "mission_id": str(m.mission_id) if m.mission_id else None,
        }

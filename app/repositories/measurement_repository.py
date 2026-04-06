from __future__ import annotations

import uuid
from typing import Any, Optional, Sequence

from geoalchemy2 import WKBElement
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.measurement import Instrument, Measurement, MeasurementType
from app.models.label import MeasurementLabel
from app.models.scenario import Scenario
from app.repositories.base import BaseRepository
from app.schemas.measurement import MeasurementFilterParams
from app.utils.filtering import geojson_to_wkb


class MeasurementTypeRepository(BaseRepository[MeasurementType]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(MeasurementType, db)

    async def get_by_name(self, name: str) -> MeasurementType | None:
        result = await self.db.execute(
            select(MeasurementType).where(MeasurementType.name == name)
        )
        return result.scalar_one_or_none()


class InstrumentRepository(BaseRepository[Instrument]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Instrument, db)


class ScenarioRepository(BaseRepository[Scenario]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Scenario, db)

    async def get_by_name(self, name: str) -> Scenario | None:
        result = await self.db.execute(select(Scenario).where(Scenario.name == name))
        return result.scalar_one_or_none()


class MeasurementRepository(BaseRepository[Measurement]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Measurement, db)

    def _base_query(self) -> Any:
        return select(Measurement).options(
            selectinload(Measurement.measurement_type),
            selectinload(Measurement.instrument),
            selectinload(Measurement.labels).selectinload(MeasurementLabel.label),
        )

    async def get_by_id(
        self,
        record_id: uuid.UUID,
        scenario_id: uuid.UUID | None = None,
    ) -> Measurement | None:
        conditions = [Measurement.id == record_id]
        if scenario_id is not None:
            conditions.append(Measurement.scenario_id == scenario_id)
        result = await self.db.execute(
            self._base_query().where(*conditions)
        )
        return result.scalar_one_or_none()

    async def get_filtered(
        self,
        scenario_id: uuid.UUID,
        filters: MeasurementFilterParams,
        skip: int = 0,
        limit: int = 20,
        sort_col: str = "timestamp",
        sort_dir: str = "desc",
    ) -> tuple[Sequence[Measurement], int]:
        conditions = [Measurement.scenario_id == scenario_id, *self._build_conditions(filters)]

        count_stmt = select(func.count()).select_from(Measurement)
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total = (await self.db.execute(count_stmt)).scalar_one()

        sort_column = getattr(Measurement, sort_col, Measurement.timestamp)
        if sort_dir == "desc":
            sort_column = sort_column.desc()

        stmt = self._base_query().offset(skip).limit(limit).order_by(sort_column)
        if conditions:
            stmt = stmt.where(*conditions)

        result = await self.db.execute(stmt)
        return result.scalars().all(), total

    def _build_conditions(self, filters: MeasurementFilterParams) -> list[Any]:
        conds: list[Any] = []
        if filters.from_date:
            conds.append(Measurement.timestamp >= filters.from_date)
        if filters.to_date:
            conds.append(Measurement.timestamp <= filters.to_date)
        if filters.measurement_type_id:
            conds.append(Measurement.measurement_type_id == filters.measurement_type_id)
        if filters.mission_id:
            conds.append(Measurement.mission_id == filters.mission_id)
        if all(
            v is not None
            for v in [filters.lat_min, filters.lat_max, filters.lon_min, filters.lon_max]
        ):
            envelope = func.ST_MakeEnvelope(
                filters.lon_min, filters.lat_min, filters.lon_max, filters.lat_max, 4326
            )
            conds.append(func.ST_Within(Measurement.location, envelope))
        if filters.label_ids:
            conds.append(
                Measurement.id.in_(
                    select(MeasurementLabel.measurement_id).where(
                        MeasurementLabel.label_id.in_(filters.label_ids)
                    )
                )
            )
        return conds

    async def create_measurement(self, data: dict[str, Any]) -> Measurement:
        location_geojson = data.pop("location")
        location_wkb = geojson_to_wkb(location_geojson)
        metadata = data.pop("metadata", {})
        obj = Measurement(**data, location=location_wkb, metadata_=metadata)
        return await self.save(obj)

    async def update_measurement(
        self, measurement: Measurement, data: dict[str, Any]
    ) -> Measurement:
        if "location" in data and data["location"] is not None:
            data["location"] = geojson_to_wkb(data.pop("location"))
        if "metadata" in data and data["metadata"] is not None:
            data["metadata_"] = data.pop("metadata")
        for key, value in data.items():
            if value is not None:
                setattr(measurement, key, value)
        await self.db.flush()
        await self.db.refresh(measurement)
        return measurement

    async def get_aggregate_stats(
        self,
        scenario_id: uuid.UUID,
        measurement_type_id: Optional[uuid.UUID] = None,
        from_date: Any = None,
        to_date: Any = None,
    ) -> list[dict[str, Any]]:
        from app.models.measurement import MeasurementType as MT
        stmt = (
            select(
                MT.name.label("measurement_type"),
                MT.unit.label("unit"),
                func.avg(Measurement.value).label("avg"),
                func.min(Measurement.value).label("min"),
                func.max(Measurement.value).label("max"),
                func.count(Measurement.id).label("count"),
            )
            .join(MT, Measurement.measurement_type_id == MT.id)
            .group_by(MT.name, MT.unit)
        )
        conds: list[Any] = []
        conds.append(Measurement.scenario_id == scenario_id)
        if measurement_type_id:
            conds.append(Measurement.measurement_type_id == measurement_type_id)
        if from_date:
            conds.append(Measurement.timestamp >= from_date)
        if to_date:
            conds.append(Measurement.timestamp <= to_date)
        if conds:
            stmt = stmt.where(*conds)
        result = await self.db.execute(stmt)
        return [dict(row._mapping) for row in result.all()]

    async def get_map_data(
        self,
        scenario_id: uuid.UUID,
        lat_min: Optional[float] = None,
        lat_max: Optional[float] = None,
        lon_min: Optional[float] = None,
        lon_max: Optional[float] = None,
        limit: int = 500,
    ) -> list[dict[str, Any]]:
        stmt = select(
            Measurement.id,
            func.ST_AsGeoJSON(Measurement.location).label("location"),
            Measurement.value,
            Measurement.unit,
            Measurement.timestamp,
            Measurement.measurement_type_id,
        ).where(Measurement.scenario_id == scenario_id).limit(limit)
        if all(v is not None for v in [lat_min, lat_max, lon_min, lon_max]):
            envelope = func.ST_MakeEnvelope(lon_min, lat_min, lon_max, lat_max, 4326)
            stmt = stmt.where(func.ST_Within(Measurement.location, envelope))
        result = await self.db.execute(stmt)
        rows = result.all()
        import json
        return [
            {
                "id": str(r.id),
                "location": json.loads(r.location) if r.location else None,
                "value": r.value,
                "unit": r.unit,
                "timestamp": r.timestamp.isoformat(),
                "measurement_type_id": str(r.measurement_type_id),
            }
            for r in rows
        ]

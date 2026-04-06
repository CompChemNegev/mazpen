from __future__ import annotations

import uuid
from typing import Any, Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.visitor import BodyMeasurement, Visitor, VisitorTrack
from app.repositories.base import BaseRepository
from app.utils.filtering import geojson_to_wkb


class VisitorRepository(BaseRepository[Visitor]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Visitor, db)

    async def get_with_counts(
        self, skip: int = 0, limit: int = 20
    ) -> tuple[Sequence[Visitor], int]:
        total = (
            await self.db.execute(select(func.count()).select_from(Visitor))
        ).scalar_one()
        result = await self.db.execute(select(Visitor).offset(skip).limit(limit))
        return result.scalars().all(), total

    async def create_visitor(self, data: dict[str, Any]) -> Visitor:
        obj = Visitor(**data)
        return await self.save(obj)

    async def get_density(
        self,
        lat_min: float | None = None,
        lat_max: float | None = None,
        lon_min: float | None = None,
        lon_max: float | None = None,
        cell_size: float = 0.01,
    ) -> list[dict[str, Any]]:
        """Return visitor density using visit track snapping to a grid."""
        # Count track points within cells using ST_SnapToGrid on track centroids
        stmt = select(
            func.ST_AsGeoJSON(
                func.ST_Centroid(func.ST_SnapToGrid(VisitorTrack.geom, cell_size))
            ).label("cell_center"),
            func.count(VisitorTrack.id).label("visitor_count"),
        ).group_by(
            func.ST_Centroid(func.ST_SnapToGrid(VisitorTrack.geom, cell_size))
        )
        if all(v is not None for v in [lat_min, lat_max, lon_min, lon_max]):
            envelope = func.ST_MakeEnvelope(lon_min, lat_min, lon_max, lat_max, 4326)
            stmt = stmt.where(func.ST_Within(VisitorTrack.geom, envelope))
        result = await self.db.execute(stmt)
        import json
        return [
            {"cell_center": json.loads(r.cell_center), "visitor_count": r.visitor_count}
            for r in result.all()
            if r.cell_center
        ]


class BodyMeasurementRepository(BaseRepository[BodyMeasurement]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(BodyMeasurement, db)

    async def get_for_visitor(self, visitor_id: uuid.UUID) -> Sequence[BodyMeasurement]:
        result = await self.db.execute(
            select(BodyMeasurement).where(BodyMeasurement.visitor_id == visitor_id)
        )
        return result.scalars().all()

    async def create_body_measurement(
        self, visitor_id: uuid.UUID, data: dict[str, Any]
    ) -> BodyMeasurement:
        obj = BodyMeasurement(visitor_id=visitor_id, **data)
        return await self.save(obj)


class VisitorTrackRepository(BaseRepository[VisitorTrack]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(VisitorTrack, db)

    async def get_for_visitor(self, visitor_id: uuid.UUID) -> Sequence[VisitorTrack]:
        result = await self.db.execute(
            select(VisitorTrack).where(VisitorTrack.visitor_id == visitor_id)
        )
        return result.scalars().all()

    async def get_all_tracks(
        self, skip: int = 0, limit: int = 50
    ) -> tuple[Sequence[VisitorTrack], int]:
        total = (
            await self.db.execute(select(func.count()).select_from(VisitorTrack))
        ).scalar_one()
        result = await self.db.execute(select(VisitorTrack).offset(skip).limit(limit))
        return result.scalars().all(), total

    async def create_track(
        self, visitor_id: uuid.UUID, geojson: dict[str, Any]
    ) -> VisitorTrack:
        obj = VisitorTrack(visitor_id=visitor_id, geom=geojson_to_wkb(geojson))
        return await self.save(obj)

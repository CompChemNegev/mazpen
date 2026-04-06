from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.visitor import BodyMeasurement, Visitor, VisitorTrack
from app.repositories.visitor_repository import (
    BodyMeasurementRepository,
    VisitorRepository,
    VisitorTrackRepository,
)
from app.schemas.visitor import BodyMeasurementCreate, VisitorCreate, VisitorIntakeUpdate, VisitorTrackCreate
from app.utils.exceptions import NotFoundException
from app.utils.filtering import wkb_to_geojson
from app.utils.pagination import PaginationParams


class VisitorService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.visitor_repo = VisitorRepository(db)
        self.body_repo = BodyMeasurementRepository(db)
        self.track_repo = VisitorTrackRepository(db)

    async def create_visitor(self, scenario_id: uuid.UUID, data: VisitorCreate) -> Visitor:
        payload = data.model_dump()
        payload["scenario_id"] = scenario_id
        return await self.visitor_repo.create_visitor(payload)

    async def get_visitor(self, scenario_id: uuid.UUID, visitor_id: uuid.UUID) -> Visitor:
        visitor = await self.visitor_repo.get_by_id(visitor_id, scenario_id=scenario_id)
        if not visitor:
            raise NotFoundException("Visitor not found")
        return visitor

    async def update_visitor_intake(
        self,
        scenario_id: uuid.UUID,
        visitor_id: uuid.UUID,
        data: VisitorIntakeUpdate,
    ) -> Visitor:
        visitor = await self.get_visitor(scenario_id, visitor_id)
        visitor.demographics = data.demographics
        visitor.tags = data.tags

        existing_body_measurements = await self.body_repo.get_for_visitor(visitor_id, scenario_id)
        for measurement in existing_body_measurements:
            await self.body_repo.delete(measurement)

        existing_tracks = await self.track_repo.get_for_visitor(visitor_id, scenario_id)
        for track in existing_tracks:
            await self.track_repo.delete(track)

        for measurement in data.body_measurements:
            await self.body_repo.create_body_measurement(visitor_id, measurement.model_dump())

        if data.track_geom is not None:
            await self.track_repo.create_track(visitor_id, data.track_geom)

        await self.db.flush()
        await self.db.refresh(visitor)
        return visitor

    async def list_visitors(
        self,
        scenario_id: uuid.UUID,
        pagination: PaginationParams,
    ) -> tuple[list[Visitor], int]:
        items, total = await self.visitor_repo.get_with_counts(
            scenario_id=scenario_id,
            skip=pagination.offset, limit=pagination.limit
        )
        return list(items), total

    # ── Body Measurements ─────────────────────────────────────────────────────

    async def create_body_measurement(
        self,
        scenario_id: uuid.UUID,
        visitor_id: uuid.UUID,
        data: BodyMeasurementCreate,
    ) -> BodyMeasurement:
        await self.get_visitor(scenario_id, visitor_id)
        return await self.body_repo.create_body_measurement(
            visitor_id, data.model_dump()
        )

    async def list_body_measurements(
        self,
        scenario_id: uuid.UUID,
        visitor_id: uuid.UUID,
    ) -> list[BodyMeasurement]:
        await self.get_visitor(scenario_id, visitor_id)
        return list(await self.body_repo.get_for_visitor(visitor_id, scenario_id))

    # ── Visitor Tracks ────────────────────────────────────────────────────────

    async def create_track(
        self,
        scenario_id: uuid.UUID,
        visitor_id: uuid.UUID,
        data: VisitorTrackCreate,
        event_publisher: Any = None,
    ) -> VisitorTrack:
        await self.get_visitor(scenario_id, visitor_id)
        track = await self.track_repo.create_track(visitor_id, data.geom)
        if event_publisher:
            await event_publisher(
                {
                    "event": "visitor.track_updated",
                    "data": {
                        "scenario_id": str(scenario_id),
                        "visitor_id": str(visitor_id),
                        "track_id": str(track.id),
                        "geom": wkb_to_geojson(track.geom),
                    },
                }
            )
        return track

    async def list_tracks(self, scenario_id: uuid.UUID, visitor_id: uuid.UUID) -> list[VisitorTrack]:
        await self.get_visitor(scenario_id, visitor_id)
        return list(await self.track_repo.get_for_visitor(visitor_id, scenario_id))

    async def list_all_tracks(
        self,
        scenario_id: uuid.UUID,
        pagination: PaginationParams,
    ) -> tuple[list[VisitorTrack], int]:
        items, total = await self.track_repo.get_all_tracks(
            scenario_id=scenario_id,
            skip=pagination.offset, limit=pagination.limit
        )
        return list(items), total

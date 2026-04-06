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
from app.schemas.visitor import BodyMeasurementCreate, VisitorCreate, VisitorTrackCreate
from app.utils.exceptions import NotFoundException
from app.utils.filtering import wkb_to_geojson
from app.utils.pagination import PaginationParams
from app.schemas.filter import FilterQuery
from app.repositories.base import BaseRepository
from app.services.base_service import BaseService
from app.utils.physics_calculations import calculate_exposure


class VisitorService(BaseService):
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

    async def search_visitors(
        self,
        scenario_id: uuid.UUID,
        filter_query: FilterQuery,
    ) -> list[Visitor]:
        """Search visitors using structured filters."""
        repo = BaseRepository(Visitor, self.db)
        try:
            results = await repo.filter_by(filter_query, scenario_id=scenario_id)
        except ValueError as e:
            raise NotFoundException(f"Invalid filter: {str(e)}")
        return list(results)

    async def calculate_visitor_exposure(
            self, 
            scenario_id: uuid.UUID,
            visitor_id: uuid.UUID
    ):
        data = calculate_exposure(self.db, scenario_id, visitor_id)
        self.visitor_repo.update_exposure(visitor_id, scenario_id, data)
        return await self.get_visitor(scenario_id, visitor_id)


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
        track = await self.track_repo.create_track(
            visitor_id,
            data.geom,
            start_time=data.start_time,
            end_time=data.end_time,
        )
        if event_publisher:
            await event_publisher(
                {
                    "event": "visitor.track_updated",
                    "data": self.serialize_for_event(track),
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

    def serialize_for_event(self, track: VisitorTrack | None) -> dict[str, Any]:
        if track is None:
            return {}
        return {
            "track_id": str(track.id),
            "visitor_id": str(track.visitor_id),
            "geom": wkb_to_geojson(track.geom),
            "start_time": track.start_time.isoformat(),
            "end_time": track.end_time.isoformat(),
        }

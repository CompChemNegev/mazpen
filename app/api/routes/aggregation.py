from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentScenario, CurrentUser
from app.core.database import get_db
from app.repositories.measurement_repository import MeasurementRepository
from app.repositories.visitor_repository import VisitorRepository
from app.schemas.measurement import MeasurementFilterParams

router = APIRouter(prefix="/{scenario_name}/aggregation", tags=["Aggregation"])


@router.get("/map-data")
async def get_map_data(
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
    lat_min: Optional[float] = Query(default=None),
    lat_max: Optional[float] = Query(default=None),
    lon_min: Optional[float] = Query(default=None),
    lon_max: Optional[float] = Query(default=None),
    limit: int = Query(default=500, ge=1, le=2000),
) -> dict:
    repo = MeasurementRepository(db)
    data = await repo.get_map_data(
        scenario_id=scenario.id,
        lat_min=lat_min, lat_max=lat_max, lon_min=lon_min, lon_max=lon_max, limit=limit
    )
    return {"type": "FeatureCollection", "features": data, "count": len(data)}


@router.get("/measurements/aggregate")
async def aggregate_measurements(
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
    measurement_type_id: Optional[str] = Query(default=None),
    from_date: Optional[str] = Query(default=None),
    to_date: Optional[str] = Query(default=None),
) -> dict:
    import uuid
    from datetime import datetime

    repo = MeasurementRepository(db)
    stats = await repo.get_aggregate_stats(
        scenario_id=scenario.id,
        measurement_type_id=uuid.UUID(measurement_type_id) if measurement_type_id else None,
        from_date=datetime.fromisoformat(from_date) if from_date else None,
        to_date=datetime.fromisoformat(to_date) if to_date else None,
    )
    return {"aggregations": stats}


@router.get("/visitors/density")
async def get_visitor_density(
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
    lat_min: Optional[float] = Query(default=None),
    lat_max: Optional[float] = Query(default=None),
    lon_min: Optional[float] = Query(default=None),
    lon_max: Optional[float] = Query(default=None),
    cell_size: float = Query(default=0.01, description="Grid cell size in degrees"),
) -> dict:
    repo = VisitorRepository(db)
    density = await repo.get_density(
        scenario_id=scenario.id,
        lat_min=lat_min,
        lat_max=lat_max,
        lon_min=lon_min,
        lon_max=lon_max,
        cell_size=cell_size,
    )
    return {"density_grid": density, "cell_size_degrees": cell_size}

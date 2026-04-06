from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminOnly, CurrentUser
from app.core.database import get_db
from app.models.scenario import Scenario
from app.repositories.measurement_repository import ScenarioRepository
from app.schemas.scenario import ScenarioCreate, ScenarioResponse
from app.utils.exceptions import ConflictException, NotFoundException

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])


@router.post("", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
async def create_scenario(
    body: ScenarioCreate,
    _: AdminOnly,
    db: AsyncSession = Depends(get_db),
) -> ScenarioResponse:
    repo = ScenarioRepository(db)
    existing = await repo.get_by_name(body.name)
    if existing:
        raise ConflictException(f"Scenario '{body.name}' already exists")
    scenario = Scenario(**body.model_dump())
    saved = await repo.save(scenario)
    return ScenarioResponse.model_validate(saved)


@router.get("", response_model=list[ScenarioResponse])
async def list_scenarios(
    _: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[ScenarioResponse]:
    repo = ScenarioRepository(db)
    items = await repo.get_all(limit=1000)
    return [ScenarioResponse.model_validate(item) for item in items]


@router.get("/{scenario_name}", response_model=ScenarioResponse)
async def get_scenario(
    scenario_name: str,
    _: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ScenarioResponse:
    repo = ScenarioRepository(db)
    scenario = await repo.get_by_name(scenario_name)
    if not scenario:
        raise NotFoundException(f"Scenario '{scenario_name}' not found")
    return ScenarioResponse.model_validate(scenario)

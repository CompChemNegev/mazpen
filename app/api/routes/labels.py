from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminOrOperator, CurrentScenario, CurrentUser
from app.core.database import get_db
from app.repositories.label_repository import LabelRepository
from app.schemas.label import LabelCreate, LabelResponse
from app.utils.exceptions import ConflictException

router = APIRouter(prefix="/{scenario_name}/labels", tags=["Labels"])


@router.get("", response_model=list[LabelResponse])
async def list_labels(
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> list[LabelResponse]:
    items = await LabelRepository(db).get_all_labels(scenario.id)
    return [LabelResponse.model_validate(i) for i in items]


@router.post("", response_model=LabelResponse, status_code=status.HTTP_201_CREATED)
async def create_label(
    body: LabelCreate,
    _: AdminOrOperator,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> LabelResponse:
    repo = LabelRepository(db)
    existing = await repo.get_by_name(scenario.id, body.name)
    if existing:
        raise ConflictException(f"Label '{body.name}' already exists")
    from app.models.label import Label

    obj = Label(scenario_id=scenario.id, name=body.name, description=body.description)
    result = await repo.save(obj)
    return LabelResponse.model_validate(result)

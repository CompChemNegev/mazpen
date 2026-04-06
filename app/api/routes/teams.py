from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminOrOperator, CurrentScenario, CurrentUser
from app.core.database import get_db
from app.schemas.team import (
    TeamCreate,
    TeamMemberCreate,
    TeamMemberResponse,
    TeamResponse,
    TeamUpdate,
)
from app.services.team_service import TeamService

router = APIRouter(prefix="/{scenario_name}/teams", tags=["Teams"])


def _to_response(team) -> TeamResponse:
    return TeamResponse(
        id=team.id,
        scenario_id=team.scenario_id,
        name=team.name,
        description=team.description,
        created_at=team.created_at,
        members=[TeamMemberResponse.model_validate(m) for m in team.members],
    )


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    body: TeamCreate,
    _: AdminOrOperator,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> TeamResponse:
    """Create team in scenario with optional initial members."""
    svc = TeamService(db)
    team = await svc.create_team(scenario.id, body)
    return _to_response(team)


@router.get("", response_model=list[TeamResponse])
async def list_teams(
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[TeamResponse]:
    """List teams in scenario."""
    svc = TeamService(db)
    teams = await svc.list_teams(scenario.id, skip=skip, limit=limit)
    return [_to_response(t) for t in teams]


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: uuid.UUID,
    _: CurrentUser,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> TeamResponse:
    """Get team by id."""
    svc = TeamService(db)
    team = await svc.get_team(scenario.id, team_id)
    return _to_response(team)


@router.patch("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: uuid.UUID,
    body: TeamUpdate,
    _: AdminOrOperator,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> TeamResponse:
    """Update team details."""
    svc = TeamService(db)
    team = await svc.update_team(scenario.id, team_id, body)
    return _to_response(team)


@router.post("/{team_id}/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_team_member(
    team_id: uuid.UUID,
    body: TeamMemberCreate,
    _: AdminOrOperator,
    scenario: CurrentScenario,
    db: AsyncSession = Depends(get_db),
) -> TeamMemberResponse:
    """Add member to a team."""
    svc = TeamService(db)
    member = await svc.add_member(scenario.id, team_id, body)
    return TeamMemberResponse.model_validate(member)

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.team import Team, TeamMember
from app.repositories.team_repository import TeamRepository, TeamMemberRepository
from app.schemas.team import TeamCreate, TeamMemberCreate, TeamUpdate
from app.services.base_service import BaseService
from app.services.configured_value_service import ConfiguredValueService
from app.utils.exceptions import ConflictException, NotFoundException


class TeamService(BaseService):
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = TeamRepository(db)
        self.member_repo = TeamMemberRepository(db)
        self.config_service = ConfiguredValueService(db)

    async def create_team(self, scenario_id: uuid.UUID, data: TeamCreate) -> Team:
        existing = await self.repo.get_by_name(scenario_id, data.name)
        if existing:
            raise ConflictException(f"Team '{data.name}' already exists")

        team = Team(
            scenario_id=scenario_id,
            name=data.name,
            description=data.description,
        )
        team = await self.repo.save(team)

        for member in data.members:
            await self._add_member(team.id, member)

        team = await self.repo.get_by_id(team.id, scenario_id=scenario_id)
        return team  # type: ignore[return-value]

    async def list_teams(self, scenario_id: uuid.UUID, skip: int = 0, limit: int = 100) -> list[Team]:
        teams = await self.repo.list_by_scenario(scenario_id=scenario_id, skip=skip, limit=limit)
        return list(teams)

    async def get_team(self, scenario_id: uuid.UUID, team_id: uuid.UUID) -> Team:
        team = await self.repo.get_by_id(team_id, scenario_id=scenario_id)
        if not team:
            raise NotFoundException("Team not found")
        return team

    async def update_team(self, scenario_id: uuid.UUID, team_id: uuid.UUID, data: TeamUpdate) -> Team:
        team = await self.get_team(scenario_id, team_id)
        payload = data.model_dump(exclude_unset=True, exclude_none=True)
        for key, value in payload.items():
            setattr(team, key, value)
        await self.db.flush()
        await self.db.refresh(team)
        return team

    async def add_member(self, scenario_id: uuid.UUID, team_id: uuid.UUID, data: TeamMemberCreate) -> TeamMember:
        await self.get_team(scenario_id, team_id)
        return await self._add_member(team_id, data)

    async def _add_member(self, team_id: uuid.UUID, data: TeamMemberCreate) -> TeamMember:
        await self.config_service.assert_active_value(
            category="team_role",
            key=data.role,
            field_name="team_member.role",
        )
        member = TeamMember(team_id=team_id, username=data.username, role=data.role)
        return await self.member_repo.save(member)

    def serialize_for_event(self, obj: Any) -> dict[str, Any]:
        if isinstance(obj, Team):
            return {
                "team_id": str(obj.id),
                "scenario_id": str(obj.scenario_id),
                "name": obj.name,
            }
        if isinstance(obj, TeamMember):
            return {
                "member_id": str(obj.id),
                "team_id": str(obj.team_id),
                "username": obj.username,
                "role": obj.role,
            }
        return {}

from __future__ import annotations

import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.team import Team, TeamMember
from app.repositories.base import BaseRepository


class TeamRepository(BaseRepository[Team]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Team, db)

    async def get_by_id(
        self,
        record_id: uuid.UUID,
        scenario_id: uuid.UUID | None = None,
    ) -> Team | None:
        stmt = select(Team).options(selectinload(Team.members)).where(Team.id == record_id)
        if scenario_id is not None:
            stmt = stmt.where(Team.scenario_id == scenario_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_name(self, scenario_id: uuid.UUID, name: str) -> Team | None:
        stmt = (
            select(Team)
            .options(selectinload(Team.members))
            .where(Team.scenario_id == scenario_id, Team.name == name)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_scenario(self, scenario_id: uuid.UUID, skip: int = 0, limit: int = 100) -> Sequence[Team]:
        stmt = (
            select(Team)
            .options(selectinload(Team.members))
            .where(Team.scenario_id == scenario_id)
            .order_by(Team.name.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()


class TeamMemberRepository(BaseRepository[TeamMember]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(TeamMember, db)

    async def list_for_team(self, team_id: uuid.UUID) -> Sequence[TeamMember]:
        result = await self.db.execute(
            select(TeamMember).where(TeamMember.team_id == team_id).order_by(TeamMember.username.asc())
        )
        return result.scalars().all()

from __future__ import annotations

import uuid
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_all_users(
        self, skip: int = 0, limit: int = 20
    ) -> tuple[Sequence[User], int]:
        from sqlalchemy import func

        total = (
            await self.db.execute(select(func.count()).select_from(User))
        ).scalar_one()
        result = await self.db.execute(select(User).offset(skip).limit(limit))
        return result.scalars().all(), total

from __future__ import annotations

import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.configured_value import ConfiguredValue
from app.repositories.base import BaseRepository


class ConfiguredValueRepository(BaseRepository[ConfiguredValue]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(ConfiguredValue, db)

    async def list_by_category(
        self,
        category: str,
        include_inactive: bool = False,
        skip: int = 0,
        limit: int = 200,
    ) -> Sequence[ConfiguredValue]:
        stmt = select(ConfiguredValue).where(ConfiguredValue.category == category)
        if not include_inactive:
            stmt = stmt.where(ConfiguredValue.is_active.is_(True))
        stmt = stmt.order_by(ConfiguredValue.sort_order.asc(), ConfiguredValue.key.asc())
        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_by_category_and_key(
        self,
        category: str,
        key: str,
    ) -> ConfiguredValue | None:
        result = await self.db.execute(
            select(ConfiguredValue).where(
                ConfiguredValue.category == category,
                ConfiguredValue.key == key,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, record_id: uuid.UUID) -> ConfiguredValue | None:
        return await super().get_by_id(record_id)

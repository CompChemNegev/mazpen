from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.configured_value import ConfiguredValue
from app.repositories.configured_value_repository import ConfiguredValueRepository
from app.schemas.configured_value import ConfiguredValueCreate, ConfiguredValueUpdate
from app.utils.exceptions import ConflictException, NotFoundException


class ConfiguredValueService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = ConfiguredValueRepository(db)

    async def list_values(
        self,
        category: str,
        include_inactive: bool = False,
        skip: int = 0,
        limit: int = 200,
    ) -> list[ConfiguredValue]:
        values = await self.repo.list_by_category(
            category=category,
            include_inactive=include_inactive,
            skip=skip,
            limit=limit,
        )
        return list(values)

    async def get_value(self, category: str, key: str) -> ConfiguredValue:
        value = await self.repo.get_by_category_and_key(category=category, key=key)
        if not value:
            raise NotFoundException(f"Configured value '{category}.{key}' not found")
        return value

    async def assert_active_value(self, category: str, key: str, field_name: str) -> None:
        """Ensure a configured value exists and is active for write-time validation."""
        value = await self.repo.get_by_category_and_key(
            category=category.lower(),
            key=key.lower(),
        )
        if not value or not value.is_active:
            raise NotFoundException(
                f"Invalid {field_name}: '{key}'. Active configured value not found in category '{category}'."
            )

    async def create_value(self, data: ConfiguredValueCreate) -> ConfiguredValue:
        existing = await self.repo.get_by_category_and_key(
            category=data.category,
            key=data.key,
        )
        if existing:
            raise ConflictException(
                f"Configured value '{data.category}.{data.key}' already exists"
            )

        payload = data.model_dump()
        payload["metadata_"] = payload.pop("metadata", {})
        created = await self.repo.create(payload)
        await self.db.flush()
        await self.db.refresh(created)
        return created

    async def update_value(
        self,
        value_id: uuid.UUID,
        data: ConfiguredValueUpdate,
    ) -> ConfiguredValue:
        existing = await self.repo.get_by_id(value_id)
        if not existing:
            raise NotFoundException("Configured value not found")

        payload = data.model_dump(exclude_unset=True, exclude_none=True)
        if "metadata" in payload:
            payload["metadata_"] = payload.pop("metadata")

        updated = await self.repo.update(value_id, payload)
        if not updated:
            raise NotFoundException("Configured value not found")

        await self.db.flush()
        await self.db.refresh(updated)
        return updated

    async def deactivate_value(self, value_id: uuid.UUID) -> None:
        existing = await self.repo.get_by_id(value_id)
        if not existing:
            raise NotFoundException("Configured value not found")
        existing.is_active = False
        await self.db.flush()

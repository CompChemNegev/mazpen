"""Generic base repository for all SQLAlchemy models."""

from __future__ import annotations

import uuid
from typing import Any, Generic, Sequence, Type, TypeVar

from sqlalchemy import and_, or_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base
from app.schemas.filter import FilterQuery, FilterOperator
from app.repositories.field_registry import FieldValidator

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """Generic repository for any SQLAlchemy model with type-safe filtering."""
    
    def __init__(self, model: Type[ModelT], db: AsyncSession) -> None:
        self.model = model
        self.db = db

    async def get_by_id(self, record_id: uuid.UUID, scenario_id: uuid.UUID | None = None) -> ModelT | None:
        """Get single record by ID, optionally filtered by scenario."""
        conditions = [self.model.id == record_id]  # type: ignore[attr-defined]
        
        if scenario_id is not None and hasattr(self.model, 'scenario_id'):
            conditions.append(self.model.scenario_id == scenario_id)  # type: ignore[attr-defined]
        
        result = await self.db.execute(select(self.model).where(*conditions))
        return result.scalar_one_or_none()

    async def get_by_name(self, scenario_id: uuid.UUID | None, name: str) -> ModelT | None:
        """Get by scenario_id and name (for models that support both)."""
        if not hasattr(self.model, 'scenario_id') or not hasattr(self.model, 'name'):
            raise ValueError(f"{self.model.__name__} doesn't support get_by_name")
        
        conditions = [self.model.name == name]  # type: ignore[attr-defined]
        if scenario_id is not None:
            conditions.append(self.model.scenario_id == scenario_id)  # type: ignore[attr-defined]
        
        result = await self.db.execute(select(self.model).where(*conditions))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 20, scenario_id: uuid.UUID | None = None) -> Sequence[ModelT]:
        """List all records, optionally filtered by scenario."""
        conditions = []
        
        if scenario_id is not None and hasattr(self.model, 'scenario_id'):
            conditions.append(self.model.scenario_id == scenario_id)  # type: ignore[attr-defined]
        
        stmt = select(self.model)
        if conditions:
            stmt = stmt.where(*conditions)
        
        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def filter_by(
        self, 
        filter_query: FilterQuery, 
        scenario_id: uuid.UUID | None = None
    ) -> Sequence[ModelT]:
        """
        Apply structured filters to query.
        
        Args:
            filter_query: FilterQuery with conditions, logic (and/or), pagination
            scenario_id: Optional scenario to scope query
        
        Returns:
            Filtered results respecting pagination (skip/limit)
        
        Raises:
            ValueError: If filter is invalid for model
        """
        conditions = []
        
        # Always scope by scenario if model supports it
        if scenario_id is not None and hasattr(self.model, 'scenario_id'):
            conditions.append(self.model.scenario_id == scenario_id)  # type: ignore[attr-defined]
        
        # Apply user filters
        for filter_cond in filter_query.filters:
            # Validate operation is legal for this field
            FieldValidator.validate_operation(
                self.model, 
                filter_cond.field, 
                filter_cond.op.value, 
                filter_cond.value
            )
            
            # Build SQLAlchemy expression
            column = getattr(self.model, filter_cond.field)
            
            if filter_cond.op == FilterOperator.EQ:
                conditions.append(column == filter_cond.value)
            elif filter_cond.op == FilterOperator.NE:
                conditions.append(column != filter_cond.value)
            elif filter_cond.op == FilterOperator.GT:
                conditions.append(column > filter_cond.value)
            elif filter_cond.op == FilterOperator.GTE:
                conditions.append(column >= filter_cond.value)
            elif filter_cond.op == FilterOperator.LT:
                conditions.append(column < filter_cond.value)
            elif filter_cond.op == FilterOperator.LTE:
                conditions.append(column <= filter_cond.value)
            elif filter_cond.op == FilterOperator.IN:
                conditions.append(column.in_(filter_cond.value))
            elif filter_cond.op == FilterOperator.NIN:
                conditions.append(~column.in_(filter_cond.value))
            elif filter_cond.op == FilterOperator.CONTAINS:
                # Use ILIKE for case-insensitive substring
                conditions.append(column.ilike(f"%{filter_cond.value}%"))
            elif filter_cond.op == FilterOperator.STARTSWITH:
                conditions.append(column.ilike(f"{filter_cond.value}%"))
            elif filter_cond.op == FilterOperator.BETWEEN:
                min_val, max_val = filter_cond.value
                conditions.append(column.between(min_val, max_val))
            elif filter_cond.op == FilterOperator.ISNULL:
                if filter_cond.value:
                    conditions.append(column.is_(None))
                else:
                    conditions.append(column.isnot(None))
        
        # Combine conditions with AND/OR
        if conditions:
            if filter_query.logic == "or":
                combined = or_(*conditions)
            else:
                combined = and_(*conditions)
            stmt = select(self.model).where(combined)
        else:
            stmt = select(self.model)
        
        # Pagination
        stmt = stmt.offset(filter_query.skip).limit(filter_query.limit)
        
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def count(self, scenario_id: uuid.UUID | None = None, **conditions: Any) -> int:
        """Count records, optionally filtered by scenario and conditions."""
        stmt = select(func.count()).select_from(self.model)
        
        where_conditions = []
        if scenario_id is not None and hasattr(self.model, 'scenario_id'):
            where_conditions.append(self.model.scenario_id == scenario_id)  # type: ignore[attr-defined]
        
        for key, value in conditions.items():
            column = getattr(self.model, key, None)
            if column is not None:
                where_conditions.append(column == value)
        
        if where_conditions:
            stmt = stmt.where(*where_conditions)
        
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def create(self, data: dict) -> ModelT:
        """Create new record from dict."""
        record = self.model(**data)
        self.db.add(record)
        await self.db.flush()
        return record

    async def update(self, record_id: uuid.UUID, data: dict) -> ModelT | None:
        """Update record by ID."""
        record = await self.get_by_id(record_id)
        if not record:
            return None
        
        for key, value in data.items():
            if hasattr(record, key):
                setattr(record, key, value)
        
        await self.db.flush()
        return record

    async def delete_by_id(self, record_id: uuid.UUID) -> bool:
        """Delete record by ID."""
        record = await self.get_by_id(record_id)
        if not record:
            return False
        
        await self.db.delete(record)
        await self.db.flush()
        return True

    async def save(self, obj: ModelT) -> ModelT:
        """Save (add) object to session."""
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj: ModelT) -> None:
        """Delete object from session."""
        await self.db.delete(obj)
        await self.db.flush()

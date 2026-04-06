from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminOnly, AdminOrOperator, CurrentUser
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.configured_value_service import ConfiguredValueService
from app.utils.exceptions import ConflictException, NotFoundException
from app.utils.pagination import PaginationParams

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    repo = UserRepository(db)
    config_service = ConfiguredValueService(db)

    await config_service.assert_active_value(
        category="user_role",
        key=body.role,
        field_name="user.role",
    )

    existing = await repo.get_by_email(body.email)
    if existing:
        raise ConflictException("A user with this email already exists")
    hashed = get_password_hash(body.password)
    user = User(name=body.name, email=body.email, role=body.role, hashed_password=hashed)
    result = await repo.save(user)
    return UserResponse.model_validate(result)


@router.get("", response_model=PaginatedResponse[UserResponse])
async def list_users(
    _: AdminOnly,
    db: AsyncSession = Depends(get_db),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> PaginatedResponse[UserResponse]:
    pagination = PaginationParams(page=page, limit=limit)
    repo = UserRepository(db)
    items, total = await repo.get_all_users(skip=pagination.offset, limit=pagination.limit)
    responses = [UserResponse.model_validate(u) for u in items]
    return PaginatedResponse.create(items=responses, total=total, params=pagination)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    _: AdminOnly,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    repo = UserRepository(db)
    config_service = ConfiguredValueService(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise NotFoundException("User not found")
    if body.role is not None:
        await config_service.assert_active_value(
            category="user_role",
            key=body.role,
            field_name="user.role",
        )
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    await repo.save(user)
    return UserResponse.model_validate(user)

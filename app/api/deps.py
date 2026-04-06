from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, Security
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.utils.exceptions import ForbiddenException, UnauthorizedException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = decode_token(token)
        user_id_raw = payload.get("sub")
        if not user_id_raw:
            raise UnauthorizedException("Token missing subject")
        user_id = uuid.UUID(str(user_id_raw))
    except (JWTError, ValueError):
        raise UnauthorizedException("Could not validate credentials")

    user = await UserRepository(db).get_by_id(user_id)
    if not user:
        raise UnauthorizedException("User not found")
    return user


def require_roles(*roles: UserRole):
    """Role guard — returns a dependency that enforces at least one of the given roles."""

    async def _check(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in roles:
            raise ForbiddenException("Insufficient permissions for this operation")
        return current_user

    return _check


# Convenience aliases
CurrentUser = Annotated[User, Depends(get_current_user)]
AdminOrOperator = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.OPERATOR))]
AdminOnly = Annotated[User, Depends(require_roles(UserRole.ADMIN))]

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.scenario import Scenario
from app.models.user import User
from app.repositories.measurement_repository import ScenarioRepository
from app.repositories.user_repository import UserRepository
from app.utils.exceptions import ForbiddenException, NotFoundException, UnauthorizedException

ROLE_ADMIN = "admin"
ROLE_OPERATOR = "operator"
ROLE_VIEWER = "viewer"

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


def require_roles(*roles: str):
    """Role guard — returns a dependency that enforces at least one of the given roles."""

    async def _check(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if str(current_user.role).lower() not in {r.lower() for r in roles}:
            raise ForbiddenException("Insufficient permissions for this operation")
        return current_user

    return _check


async def get_scenario(
    scenario_name: str,
    db: AsyncSession = Depends(get_db),
) -> Scenario:
    scenario = await ScenarioRepository(db).get_by_name(scenario_name)
    if not scenario:
        raise NotFoundException(f"Scenario '{scenario_name}' not found")
    return scenario


# Convenience aliases
CurrentUser = Annotated[User, Depends(get_current_user)]
AdminOrOperator = Annotated[User, Depends(require_roles(ROLE_ADMIN, ROLE_OPERATOR))]
AdminOnly = Annotated[User, Depends(require_roles(ROLE_ADMIN))]
CurrentScenario = Annotated[Scenario, Depends(get_scenario)]

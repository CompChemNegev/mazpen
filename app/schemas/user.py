from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    name: str = Field(..., max_length=200)
    email: EmailStr
    role: UserRole = UserRole.VIEWER
    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    role: Optional[UserRole] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    role: UserRole


# ── Auth schemas ──────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: uuid.UUID
    role: UserRole

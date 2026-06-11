"""User profile request/response schemas."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import APIResponse


class UserResponse(BaseModel):
    """Public user profile data returned to clients."""

    id: UUID
    display_name: str
    onboarding_complete: bool
    created_at: str  # ISO 8601 UTC


class UserUpdate(BaseModel):
    """Fields a user can update on their own profile."""

    display_name: Optional[str] = Field(None, min_length=2, max_length=80)


# Type aliases for endpoint response_model
UserAPIResponse = APIResponse[UserResponse]

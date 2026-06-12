"""Neighborhood membership request/response schemas."""

from __future__ import annotations

from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import APIResponse
from app.schemas.neighborhood import NeighborhoodResponse


class NeighborhoodMembershipResponse(BaseModel):
    """Membership record for a user within a neighborhood."""

    id: UUID
    user_id: UUID
    neighborhood_id: UUID
    tier: int  # 1 | 2 | 3
    joined_at: str
    tier_upgraded_at: Optional[str] = None
    is_active: bool


class MembershipDetail(BaseModel):
    """Current user's membership detail including verification status."""

    membership: NeighborhoodMembershipResponse
    neighborhood: NeighborhoodResponse
    verification_status: Optional[str] = None  # pending | approved | rejected | expired | null


class MembershipJoinRequest(BaseModel):
    """Request body for joining a neighborhood."""

    neighborhood_id: UUID
    tier: Literal["tier_1", "tier_2", "tier_3"] = "tier_1"
    declared_address: str = Field(default="", max_length=500)


class JoinResponse(BaseModel):
    """Response after joining a neighborhood."""

    membership_id: UUID
    neighborhood_id: UUID
    tier: int
    onboarding_complete: bool


# Type aliases
MembershipAPIResponse = APIResponse[NeighborhoodMembershipResponse]
MembershipDetailAPIResponse = APIResponse[MembershipDetail]
MemberListAPIResponse = APIResponse[list[dict]]  # Flexible — refined when typed
JoinAPIResponse = APIResponse[JoinResponse]

"""Membership endpoints: join, status, and member listing."""

from uuid import UUID

from fastapi import APIRouter, Depends
from supabase import Client

from app.core.auth import get_current_user
from app.core.errors import ErrorCode, api_error
from app.db.dependencies import get_db
from app.schemas.common import APIResponse, AuthUser
from app.schemas.membership import (
    JoinAPIResponse,
    JoinResponse,
    MembershipJoinRequest,
    MembershipDetailAPIResponse,
)
from app.services import membership_service

router = APIRouter()


@router.post("/members/join")
async def join_neighborhood(
    body: MembershipJoinRequest,
    current_user: AuthUser = Depends(get_current_user),
    db: Client = Depends(get_db),
) -> JoinAPIResponse:
    """Join a neighborhood at the given tier.

    Requires authentication. Creates a membership row and marks the user's
    onboarding as complete.
    """
    membership = await membership_service.join_neighborhood(
        db,
        current_user.id,
        body.neighborhood_id,
        body.tier,
        body.declared_address,
    )

    # Map tier string to int for the response
    tier_map = {"tier_1": 1, "tier_2": 2, "tier_3": 3}
    tier_int = tier_map.get(body.tier, 1)

    return APIResponse.ok(
        JoinResponse(
            membership_id=membership["id"],
            neighborhood_id=membership["neighborhood_id"],
            tier=tier_int,
            onboarding_complete=True,
        )
    )


# Stub endpoints for future use — matching ARCHITECTURE.md shape


@router.get("/neighborhoods/{neighborhood_id}/members/me")
async def get_my_membership(
    neighborhood_id: UUID,
    db: Client = Depends(get_db),
) -> MembershipDetailAPIResponse:
    """Returns the current user's membership detail (requires auth via middleware)."""
    return APIResponse.err(
        ErrorCode.NOT_IMPLEMENTED, "This endpoint is not yet implemented"
    )


@router.get("/neighborhoods/{neighborhood_id}/members")
async def list_members(
    neighborhood_id: UUID,
    db: Client = Depends(get_db),
) -> APIResponse:
    """List all active members for the anchor's management view."""
    return APIResponse.err(
        ErrorCode.NOT_IMPLEMENTED, "This endpoint is not yet implemented"
    )

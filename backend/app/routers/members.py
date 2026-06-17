"""Membership endpoints: join, status, and member listing."""

from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query
from supabase import Client

from app.core.auth import get_current_member, get_current_user
from app.core.errors import ErrorCode, api_error
from app.db.dependencies import get_db
from app.repositories import anchor_repo, membership_repo
from app.schemas.common import APIResponse, AuthMember, AuthUser
from app.schemas.membership import (
    JoinAPIResponse,
    JoinResponse,
    MemberListData,
    MemberListItem,
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
    neighborhood_id: UUID = Path(...),
    limit: int = Query(50, ge=1, le=100, description="Max members to return"),
    member: AuthMember = Depends(get_current_member),
    db: Client = Depends(get_db),
) -> APIResponse[MemberListData]:
    """List all active members of the neighborhood for the community tab.

    Requires the calling user to be a member of this neighborhood (Tier 1+).
    Returns members ordered by join date (oldest first) with tier, display name,
    and anchor status.
    """
    # Fetch all active members with user display_name
    members_data = await membership_repo.list_members(db, neighborhood_id, limit=limit)

    # Check if there's an active anchor for this neighborhood
    active_anchor = anchor_repo.get_active_anchor_role(neighborhood_id=neighborhood_id)
    anchor_member_id = str(active_anchor["member_id"]) if active_anchor else None

    # Build response items
    items: list[MemberListItem] = []
    for m in members_data:
        users_info = m.get("users") or {}
        items.append(MemberListItem(
            member_id=m["id"],
            display_name=users_info.get("display_name") or "Unknown",
            tier=m["tier"],
            joined_at=m["joined_at"],
            is_anchor=str(m["id"]) == anchor_member_id if anchor_member_id else False,
        ))

    return APIResponse.ok(MemberListData(members=items, total=len(items)))

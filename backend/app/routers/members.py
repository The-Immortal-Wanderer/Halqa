"""Membership endpoints: join, status, and member listing."""

from fastapi import APIRouter

router = APIRouter()

# POST /neighborhoods/{neighborhood_id}/join
#   Auth: get_current_user
#   → APIResponse[NeighborhoodMembershipResponse]
#   Creates a Tier 1 membership. Enforces one-neighborhood-per-user rule.
#
# GET /neighborhoods/{neighborhood_id}/members/me
#   Auth: get_current_member
#   → APIResponse[MembershipDetail]
#   Returns current user's membership detail including tier and verification status.
#
# GET /neighborhoods/{neighborhood_id}/members
#   Auth: get_current_anchor
#   → APIResponse[List[MemberSummary]]
#   Returns all active members for the anchor's management view (paginated).

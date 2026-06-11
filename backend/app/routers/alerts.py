"""Emergency alerts endpoints."""

from fastapi import APIRouter

router = APIRouter()

# GET /neighborhoods/{neighborhood_id}/alerts
#   Auth: get_current_member
#   Query: limit (default 10), include_resolved (bool, default false)
#   → APIResponse[List[PostResponse]]
#   Returns only posts where is_emergency=true. Unresolved first.

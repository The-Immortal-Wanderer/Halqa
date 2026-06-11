"""Anchor moderation endpoints."""

from fastapi import APIRouter

router = APIRouter()

# GET /neighborhoods/{neighborhood_id}/anchor/queue
#   Auth: get_current_anchor
#   → APIResponse[AnchorQueueResponse]
#
# DELETE /neighborhoods/{neighborhood_id}/anchor/posts/{post_id}
#   Auth: get_current_anchor
#   Body: AnchorPostRemoval { reason }
#   → APIResponse[{ removed: bool }]
#
# PATCH /neighborhoods/{neighborhood_id}/anchor/posts/{post_id}/classification
#   Auth: get_current_anchor
#   Body: ClassificationOverride
#   → APIResponse[PostResponse]
#
# POST /neighborhoods/{neighborhood_id}/anchor/tier3/{request_id}/vouch
#   Auth: get_current_anchor
#   → APIResponse[Tier3VouchingRequest]
#
# POST /neighborhoods/{neighborhood_id}/anchor/tier3/{request_id}/cosign
#   Auth: require_tier(2) (not anchor, not applicant)
#   → APIResponse[Tier3VouchingRequest]
#
# GET /neighborhoods/{neighborhood_id}/anchor/log
#   Auth: get_current_anchor
#   Query: limit (default 50), offset
#   → APIResponse[List[AnchorActionLogEntry]]

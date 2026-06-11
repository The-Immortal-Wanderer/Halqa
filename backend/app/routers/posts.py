"""Feed and post management endpoints."""

from fastapi import APIRouter

router = APIRouter()

# GET /neighborhoods/{neighborhood_id}/posts
#   Auth: get_current_member (any tier)
#   Query: limit, before_id (cursor pagination)
#   → APIResponse[PostListResponse]
#
# POST /neighborhoods/{neighborhood_id}/posts
#   Auth: require_tier(2)
#   Body: PostCreate { content, category }
#   → APIResponse[PostResponse]
#   Triggers async AI classification after creation.
#
# GET /neighborhoods/{neighborhood_id}/posts/{post_id}
#   Auth: get_current_member
#   → APIResponse[PostResponse]
#
# PATCH /neighborhoods/{neighborhood_id}/posts/{post_id}/resolve
#   Auth: get_current_member (author OR anchor)
#   → APIResponse[PostResponse]
#
# POST /neighborhoods/{neighborhood_id}/posts/{post_id}/flags
#   Auth: require_tier(2)
#   Body: FlagCreate { flag_type, reason? }
#   → APIResponse[{ flagged: bool }]

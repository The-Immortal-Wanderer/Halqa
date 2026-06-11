"""Anchor moderation business logic: post removal, classification override, Tier 3 vouching."""

import logging
from uuid import UUID

logger = logging.getLogger(__name__)


# async def remove_post(db, anchor_id: UUID, neighborhood_id: UUID, post_id: UUID, reason: str) -> dict:
#     """Soft-delete a post and log the action."""
#     from app.repositories import post_repo, anchor_repo
#     from app.core.errors import api_error, ErrorCode
#     post = await post_repo.get_by_id(db, post_id, neighborhood_id)
#     if not post:
#         raise api_error(404, ErrorCode.POST_NOT_FOUND, "Post not found")
#     await post_repo.soft_delete(db, post_id)
#     await anchor_repo.log_action(db, anchor_id=anchor_id, neighborhood_id=neighborhood_id,
#                                   action_type="post_removed", target_id=post_id, details={"reason": reason})
#     return post


# async def complete_tier3_vouching(db, request_id: UUID, neighborhood_id: UUID) -> None:
#     """Upgrade applicant to Tier 3 when both signatures are present."""
#     from app.repositories import verification_repo, membership_repo, anchor_repo
#     request = await verification_repo.get_tier3_request(db, request_id)
#     if not (request.get("anchor_signed_at") and request.get("cosigner_signed_at")):
#         return
#     await membership_repo.upgrade_tier(db, request["candidate_user_id"], neighborhood_id, new_tier=3)
#     await verification_repo.set_status(db, request_id, "approved")

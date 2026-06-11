"""Post creation, feed, resolution, and classification triggering business logic.

After a post is created, AI classification is triggered asynchronously.
The classification result updates the post and, if emergency, triggers
push notifications.
"""

import asyncio
import logging
from uuid import UUID

logger = logging.getLogger(__name__)


# async def create_post(db, post_data, author_id: UUID, neighborhood_id: UUID) -> dict:
#     """Create a post and trigger async AI classification.
#
#     Returns the post immediately — classification runs in the background.
#     """
#     from app.repositories import post_repo
#     if len(post_data.content) > 1000:
#         raise ...  # CONTENT_TOO_LONG
#     post = await post_repo.create(db, neighborhood_id, author_id, post_data.content, post_data.category)
#     # Fire-and-forget classification
#     asyncio.create_task(_classify_and_update(db, post["id"], post_data.content, post_data.category))
#     return post


# async def _classify_and_update(db, post_id: UUID, content: str, category: str):
#     """Classify a post asynchronously and update the post record.
#
#     If classified as emergency, triggers push notifications.
#     Never raises — all errors are logged and the post survives.
#     """
#     from app.services.classification_service import classify_post
#     from app.repositories import post_repo
#     try:
#         result = await classify_post(content, category)
#         await post_repo.update_classification(
#             db, post_id,
#             classification=result["ai_classification"],
#             is_emergency=result["is_emergency"],
#             language_detected=result["language_detected"],
#             confidence=result["confidence"],
#         )
#         if result["is_emergency"]:
#             from app.services.notification_service import send_emergency_alert
#             asyncio.create_task(send_emergency_alert(db, neighborhood_id, post))
#     except Exception as e:
#         logger.error(f"Classification failed for post {post_id}: {e}")


# async def resolve_post(db, post_id: UUID, neighborhood_id: UUID, requester_id: UUID) -> dict:
#     """Mark a post as resolved. Only the author or the neighborhood anchor can resolve."""
#     from app.repositories import post_repo, anchor_repo
#     from app.core.errors import api_error, ErrorCode
#     post = await post_repo.get_by_id(db, post_id, neighborhood_id)
#     if not post:
#         raise api_error(404, ErrorCode.POST_NOT_FOUND, "Post not found")
#     if post["is_resolved"]:
#         raise api_error(409, ErrorCode.ALREADY_RESOLVED, "This post is already resolved")
#     is_author = post["author_id"] == requester_id
#     is_anchor = await anchor_repo.is_active_anchor(db, requester_id, neighborhood_id)
#     if not (is_author or is_anchor):
#         raise api_error(403, ErrorCode.RESOLVE_PERMISSION_DENIED,
#                         "Only the post author or anchor can resolve this post")
#     return await post_repo.mark_resolved(db, post_id)

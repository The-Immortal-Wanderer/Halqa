"""Post creation, feed, resolution, and classification triggering business logic.

After a post is created, AI classification is triggered asynchronously.
The classification result updates the post and, if emergency, triggers
push notifications.
"""

import asyncio
import logging
from uuid import UUID

from app.core.errors import ErrorCode, api_error
from app.repositories import dashboard_repo, post_repo
from app.schemas.post import PostResponse, PostListResponse
from app.schemas.common import AuthMember

logger = logging.getLogger(__name__)


async def get_feed(
    db,
    neighborhood_id: UUID,
    category: str | None = None,
    emergency_only: bool = False,
    include_resolved: bool = True,
    limit: int = 20,
) -> PostListResponse:
    """Get the neighborhood feed with optional filters."""
    posts = await post_repo.get_feed(
        db, neighborhood_id, category=category,
        emergency_only=emergency_only,
        include_resolved=include_resolved,
        limit=limit,
    )
    # Enrich each post with author info
    enriched = []
    for p in posts:
        author = await post_repo.get_author_info(db, UUID(p["author_member_id"]))
        enriched.append(_post_to_response(p, author))
    return PostListResponse(posts=enriched, has_more=False)


async def create_post(
    db,
    member: AuthMember,
    neighborhood_id: UUID,
    body: str,
    category: str,
    is_emergency: bool = False,
) -> PostResponse:
    """Create a post and trigger async AI classification.

    Returns the post immediately — classification runs in the background.
    """
    if len(body) < 3:
        raise api_error(400, ErrorCode.CONTENT_TOO_LONG, "Post body must be at least 3 characters")
    if len(body) > 500:
        raise api_error(400, ErrorCode.CONTENT_TOO_LONG, "Post body must be at most 500 characters")

    # Resolve the member's author_member_id from their membership record
    author_member_id = await post_repo.get_member_id(
        db, member.user.id, neighborhood_id,
    )
    if not author_member_id:
        raise api_error(403, ErrorCode.NOT_A_MEMBER, "You are not a member of this neighborhood")

    post = await post_repo.create_post(
        db, neighborhood_id, UUID(author_member_id), body, category, is_emergency,
    )

    # Invalidate dashboard snapshots — they will be recomputed on next load
    await dashboard_repo.invalidate_snapshots(db, neighborhood_id)

    # Fire-and-forget classification
    asyncio.create_task(
        _classify_and_update(db, post, body, category, is_emergency),
    )

    author = await post_repo.get_author_info(db, UUID(author_member_id))
    return _post_to_response(post, author)


async def _classify_and_update(
    db,
    post: dict,
    content: str,
    category: str,
    is_emergency: bool,
) -> None:
    """Classify a post asynchronously and update the post record.

    If AI confidence >= 0.70, override user-declared category and is_emergency
    with AI values. Below 0.70, keep user values.
    If classified as emergency, triggers a notification.
    Never raises — all errors are logged and the post survives.
    """
    from app.services.classification_service import classify_post
    from app.services.notification_service import send_emergency_alert

    post_id = UUID(post["id"])
    neighborhood_id = UUID(post["neighborhood_id"]) if post.get("neighborhood_id") else None
    author_member_id = UUID(post["author_member_id"]) if post.get("author_member_id") else None

    try:
        result = await classify_post(content, category)
        confidence = result.get("confidence", 0.0)
        ai_is_emergency = result.get("is_emergency", False)
        ai_category = result.get("ai_classification", "general")
        civic_signal = result.get("civic_signal", "")
        body_language = result.get("language_detected", "mixed")

        # Confidence threshold logic
        override_category = None
        override_emergency = None
        if confidence >= 0.70:
            override_category = ai_category
            override_emergency = ai_is_emergency

        await post_repo.update_classification(
            db, post_id,
            ai_confidence=confidence,
            is_emergency=override_emergency if override_emergency is not None else is_emergency,
            civic_signal=civic_signal,
            ai_category=override_category,
        )

        # Notify if post is determined to be emergency
        final_is_emergency = override_emergency if override_emergency is not None else is_emergency
        if final_is_emergency and neighborhood_id and author_member_id:
            asyncio.create_task(
                send_emergency_alert(
                    db, post_id,
                    neighborhood_id=neighborhood_id,
                    author_member_id=author_member_id,
                    body_preview=post.get("body", ""),
                    category=post.get("category", "general"),
                ),
            )

    except Exception as e:
        logger.error("Classification failed for post %s: %s", post_id, e)


async def resolve_post(
    db,
    post_id: UUID,
    neighborhood_id: UUID,
    requester: AuthMember,
) -> PostResponse:
    """Mark a post as resolved.

    Only the post author or the neighborhood anchor can resolve.
    """
    from app.repositories import anchor_repo

    post = await post_repo.get_by_id(db, post_id, neighborhood_id)
    if not post:
        raise api_error(404, ErrorCode.POST_NOT_FOUND, "Post not found")
    if post.get("is_resolved"):
        raise api_error(409, ErrorCode.ALREADY_RESOLVED, "This post is already resolved")

    # Check if requester is the author (via author_member_id → user_id lookup)
    author_member_id = post["author_member_id"]
    member_id = await post_repo.get_member_id(db, requester.user.id, neighborhood_id)
    is_author = member_id and str(member_id) == str(author_member_id)
    is_anchor = await anchor_repo.is_active_anchor(db, requester.user.id, neighborhood_id)

    if not (is_author or is_anchor):
        raise api_error(
            403, ErrorCode.RESOLVE_PERMISSION_DENIED,
            "Only the post author or anchor can resolve this post",
        )

    # Resolve using the member_id (author_member_id)
    resolved_by = UUID(author_member_id)
    updated = await post_repo.mark_resolved(db, post_id, resolved_by)
    if not updated:
        raise api_error(404, ErrorCode.POST_NOT_FOUND, "Post not found after update")

    author = await post_repo.get_author_info(db, UUID(post["author_member_id"]))
    return _post_to_response(updated, author)


def _post_to_response(post: dict, author: dict | None) -> PostResponse:
    """Convert a raw DB post dict + author info into a PostResponse."""
    return PostResponse(
        id=post["id"],
        neighborhood_id=post["neighborhood_id"],
        author_member_id=post["author_member_id"],
        author={
            "id": author["id"] if author and author.get("id") else "00000000-0000-0000-0000-000000000000",
            "display_name": author["display_name"] if author and author.get("display_name") else "Unknown",
            "tier": author["tier"] if author and author.get("tier") else "tier_1",
        },
        body=post["body"],
        body_language=post.get("body_language", "en"),
        category=post["category"],
        is_emergency=post.get("is_emergency", False),
        ai_confidence=post.get("ai_confidence"),
        classification_confidence=post.get("ai_confidence"),
        ai_civic_signal=post.get("ai_civic_signal"),
        is_pinned=post.get("is_pinned", False),
        is_resolved=post.get("is_resolved", False),
        resolved_at=post.get("resolved_at"),
        created_at=post["created_at"],
        updated_at=post["updated_at"],
    )

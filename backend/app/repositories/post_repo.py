"""Data access for the posts table.

Uses the Supabase query builder — no inline SQL strings.
All synchronous ``.execute()`` calls are wrapped in ``asyncio.to_thread``
to comply with the ``async/await throughout`` mandate.
"""

import asyncio
import logging
from uuid import UUID

from supabase import Client

logger = logging.getLogger(__name__)


async def get_by_id(db: Client, post_id: UUID, neighborhood_id: UUID) -> dict | None:
    """Fetch a single post by ID, ensuring it belongs to the given neighborhood.

    Uses ``.maybe_single()`` to return ``None`` instead of raising when
    the post does not exist, avoiding a ``PGRST116`` crash.
    """

    def _fetch():
        return (
            db.table("posts")
            .select("*")
            .eq("id", str(post_id))
            .eq("neighborhood_id", str(neighborhood_id))
            .maybe_single()
            .execute()
        )

    result = await asyncio.to_thread(_fetch)
    return result.data if result else None


async def get_feed(
    db: Client,
    neighborhood_id: UUID,
    category: str | None = None,
    emergency_only: bool = False,
    include_resolved: bool = True,
    limit: int = 20,
) -> list[dict]:
    """Fetch the neighborhood feed with optional filters.

    Results are ordered so that emergency (unresolved) posts appear first,
    followed by newest posts. Removed posts are always excluded.
    When ``include_resolved=False``, only unresolved posts are returned.
    """

    def _fetch():
        query = (
            db.table("posts")
            .select("*")
            .eq("neighborhood_id", str(neighborhood_id))
            .eq("is_removed", False)
        )
        if category:
            query = query.eq("category", category)
        if emergency_only:
            query = query.eq("is_emergency", True)
        if not include_resolved:
            query = query.eq("is_resolved", False)
        query = (
            query
            .order("is_emergency", desc=True)
            .order("is_resolved", desc=False)
            .order("created_at", desc=True)
            .limit(limit)
        )
        return query.execute()

    result = await asyncio.to_thread(_fetch)
    return result.data or []


async def create_post(
    db: Client,
    neighborhood_id: UUID,
    author_member_id: UUID,
    body: str,
    category: str,
    is_emergency: bool = False,
) -> dict:
    """Insert a new post and return the created record."""

    def _insert():
        return (
            db.table("posts")
            .insert({
                "neighborhood_id": str(neighborhood_id),
                "author_member_id": str(author_member_id),
                "body": body,
                "body_language": "mixed",
                "category": category,
                "is_emergency": is_emergency,
            })
            .execute()
        )

    result = await asyncio.to_thread(_insert)
    return result.data[0]


async def update_classification(
    db: Client,
    post_id: UUID,
    ai_confidence: float | None,
    is_emergency: bool,
    civic_signal: str | None,
    ai_category: str | None = None,
) -> None:
    """Update AI classification fields on a post.

    Fire-and-forget — no return value. If ``ai_category`` is provided
    (typically when confidence >= 0.70), the category column is also
    updated to reflect the AI's override.
    """

    def _update():
        payload: dict = {
            "ai_confidence": ai_confidence,
            "is_emergency": is_emergency,
            "ai_civic_signal": civic_signal,
        }
        if ai_category is not None:
            payload["category"] = ai_category
        return (
            db.table("posts")
            .update(payload)
            .eq("id", str(post_id))
            .execute()
        )

    await asyncio.to_thread(_update)


async def mark_resolved(
    db: Client,
    post_id: UUID,
    resolved_by_member_id: UUID,
) -> dict | None:
    """Mark a post as resolved. Returns the updated post or None."""

    def _update():
        return (
            db.table("posts")
            .update({
                "is_resolved": True,
                "resolved_at": "now()",
                "resolved_by_member_id": str(resolved_by_member_id),
            })
            .eq("id", str(post_id))
            .execute()
        )

    result = await asyncio.to_thread(_update)
    return result.data[0] if result.data else None


async def get_member_id(db: Client, user_id: UUID, neighborhood_id: UUID) -> str | None:
    """Find the member record ID for a user within a neighborhood.

    Returns the ``neighborhood_members.id`` as a string, or ``None`` if
    the user is not an active member of the neighborhood.
    """

    def _fetch():
        return (
            db.table("neighborhood_members")
            .select("id")
            .eq("user_id", str(user_id))
            .eq("neighborhood_id", str(neighborhood_id))
            .eq("is_active", True)
            .maybe_single()
            .execute()
        )

    result = await asyncio.to_thread(_fetch)
    return result.data["id"] if result and result.data else None


async def get_by_id_with_author(
    db: Client,
    post_id: UUID,
    neighborhood_id: UUID,
) -> dict | None:
    """Fetch a post enriched with its author's display name and tier.

    Uses two sequential queries (post, then member+user info) to avoid
    complex join syntax issues in the Supabase Python client.
    Returns ``None`` if the post is not found.
    """

    post = await get_by_id(db, post_id, neighborhood_id)
    if not post:
        return None

    author = await get_author_info(db, UUID(post["author_member_id"]))
    if author:
        post["author"] = author

    return post


async def get_author_info(db: Client, author_member_id: UUID) -> dict | None:
    """Fetch author display name and tier for a member record.

    Joins ``neighborhood_members`` with ``users`` via the Supabase query
    builder's native relationship syntax.
    Returns ``{id, display_name, tier}`` or ``None``.
    """

    def _fetch():
        return (
            db.table("neighborhood_members")
            .select("id, tier, users(id, display_name)")
            .eq("id", str(author_member_id))
            .maybe_single()
            .execute()
        )

    result = await asyncio.to_thread(_fetch)
    if not result or not result.data:
        return None

    data = result.data
    user_info = data.get("users", {}) or {}
    return {
        "id": user_info.get("id"),
        "display_name": user_info.get("display_name"),
        "tier": data.get("tier"),
    }

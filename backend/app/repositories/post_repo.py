"""Data access for the posts table.

Uses the Supabase query builder — no inline SQL strings.
"""

import logging
from uuid import UUID

from supabase import Client

logger = logging.getLogger(__name__)


# async def get_by_id(db: Client, post_id: UUID, neighborhood_id: UUID) -> dict | None:
#     """Fetch a single post by ID, ensuring it belongs to the given neighborhood."""
#     result = (
#         db.table("posts")
#         .select("*, users(display_name)")
#         .eq("id", str(post_id))
#         .eq("neighborhood_id", str(neighborhood_id))
#         .is_("deleted_at", "null")
#         .single()
#         .execute()
#     )
#     return result.data if result.data else None


# async def get_feed(
#     db: Client,
#     neighborhood_id: UUID,
#     limit: int = 30,
#     before_id: UUID | None = None,
# ) -> list[dict]:
#     """Get the neighborhood feed with cursor pagination."""
#     query = (
#         db.table("posts")
#         .select("*, users(display_name)")
#         .eq("neighborhood_id", str(neighborhood_id))
#         .is_("deleted_at", "null")
#     )
#     if before_id:
#         cursor_post = await get_by_id(db, before_id, neighborhood_id)
#         if cursor_post:
#             query = query.lt("created_at", cursor_post["created_at"])
#     query = (
#         query
#         .limit(limit)
#         .order("is_emergency", desc=True)
#         .order("is_resolved", desc=False)
#         .order("created_at", desc=True)
#     )
#     result = query.execute()
#     return result.data or []


# async def create(db: Client, neighborhood_id: UUID, author_id: UUID, content: str, category: str) -> dict:
#     """Insert a new post. Classification fields are null initially."""
#     result = (
#         db.table("posts")
#         .insert({
#             "neighborhood_id": str(neighborhood_id),
#             "author_id": str(author_id),
#             "content": content,
#             "category": category,
#         })
#         .execute()
#     )
#     return result.data[0]


# async def update_classification(
#     db: Client,
#     post_id: UUID,
#     classification: str,
#     is_emergency: bool,
#     language_detected: str,
#     confidence: float,
# ) -> None:
#     """Update a post's AI classification fields."""
#     db.table("posts").update({
#         "ai_classification": classification,
#         "is_emergency": is_emergency,
#         "language_detected": language_detected,
#         "classification_confidence": confidence,
#     }).eq("id", str(post_id)).execute()


# async def soft_delete(db: Client, post_id: UUID) -> None:
#     """Soft-delete a post by setting deleted_at."""
#     db.table("posts").update({"deleted_at": "now()"}).eq("id", str(post_id)).execute()


# async def mark_resolved(db: Client, post_id: UUID) -> dict | None:
#     """Mark a post as resolved."""
#     result = (
#         db.table("posts")
#         .update({"is_resolved": True, "resolved_at": "now()"})
#         .eq("id", str(post_id))
#         .select("*, users(display_name)")
#         .single()
#         .execute()
#     )
#     return result.data if result.data else None


# async def get_for_dashboard(db: Client, neighborhood_id: UUID, from_date: str) -> list[dict]:
#     """Get all non-deleted posts for a neighborhood within a date range."""
#     result = (
#         db.table("posts")
#         .select("*")
#         .eq("neighborhood_id", str(neighborhood_id))
#         .is_("deleted_at", "null")
#         .gte("created_at", from_date)
#         .execute()
#     )
#     return result.data or []

"""Data access for the users table."""

import logging
from uuid import UUID

from supabase import Client

logger = logging.getLogger(__name__)


async def get_by_id(db: Client, user_id: UUID) -> dict | None:
    """Fetch a user by their UUID. Returns None if not found."""
    result = (
        db.table("users")
        .select("*")
        .eq("id", str(user_id))
        .is_("deleted_at", "null")
        .single()
        .execute()
    )
    return result.data if result.data else None


# async def create(db: Client, user_id: UUID, display_name: str) -> dict:
#     """Insert a new user profile. Called after Supabase Auth signup."""
#     result = (
#         db.table("users")
#         .insert({
#             "id": str(user_id),
#             "display_name": display_name,
#         })
#         .execute()
#     )
#     return result.data[0]


# async def update_display_name(db: Client, user_id: UUID, display_name: str) -> dict | None:
#     """Update the user's display name. Returns updated user or None."""
#     result = (
#         db.table("users")
#         .update({"display_name": display_name})
#         .eq("id", str(user_id))
#         .execute()
#     )
#     return result.data[0] if result.data else None

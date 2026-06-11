"""Data access for anchor_roles and anchor_actions_log tables."""

import logging
from uuid import UUID

from supabase import Client

logger = logging.getLogger(__name__)


async def get_active(db: Client, user_id: UUID, neighborhood_id: UUID) -> dict | None:
    """Get the active anchor role for a user in a neighborhood."""
    result = (
        db.table("anchor_roles")
        .select("*")
        .eq("user_id", str(user_id))
        .eq("neighborhood_id", str(neighborhood_id))
        .eq("is_active", True)
        .single()
        .execute()
    )
    return result.data if result.data else None


async def is_active_anchor(db: Client, user_id: UUID, neighborhood_id: UUID) -> bool:
    """Check if a user is the active anchor (boolean return)."""
    anchor = await get_active(db, user_id, neighborhood_id)
    return anchor is not None


# async def log_action(
#     db: Client,
#     anchor_id: UUID,
#     neighborhood_id: UUID,
#     action_type: str,
#     target_id: UUID,
#     details: dict | None = None,
# ) -> dict:
#     """Log an anchor action (non-negotiable for audit purposes)."""
#     row = {
#         "anchor_id": str(anchor_id),
#         "neighborhood_id": str(neighborhood_id),
#         "action_type": action_type,
#         "target_id": str(target_id),
#     }
#     if details:
#         row["details"] = details
#     result = db.table("anchor_actions_log").insert(row).execute()
#     return result.data[0]


# async def get_action_log(
#     db: Client,
#     neighborhood_id: UUID,
#     limit: int = 50,
#     offset: int = 0,
# ) -> list[dict]:
#     """Get the anchor action log for a neighborhood."""
#     result = (
#         db.table("anchor_actions_log")
#         .select("*")
#         .eq("neighborhood_id", str(neighborhood_id))
#         .order("created_at", desc=True)
#         .limit(limit)
#         .offset(offset)
#         .execute()
#     )
#     return result.data or []

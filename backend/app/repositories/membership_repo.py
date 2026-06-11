"""Data access for neighborhood_memberships table."""

import logging
from uuid import UUID

from supabase import Client

logger = logging.getLogger(__name__)


async def get_active(db: Client, user_id: UUID, neighborhood_id: UUID) -> dict | None:
    """Get the user's active membership for a specific neighborhood."""
    result = (
        db.table("neighborhood_memberships")
        .select("*")
        .eq("user_id", str(user_id))
        .eq("neighborhood_id", str(neighborhood_id))
        .eq("is_active", True)
        .single()
        .execute()
    )
    return result.data if result.data else None


# async def get_any_active(db: Client, user_id: UUID) -> list[dict]:
#     """Get all active memberships for a user (enforces one-neighborhood limit)."""
#     result = (
#         db.table("neighborhood_memberships")
#         .select("*")
#         .eq("user_id", str(user_id))
#         .eq("is_active", True)
#         .execute()
#     )
#     return result.data or []


# async def create(db: Client, user_id: UUID, neighborhood_id: UUID, tier: int = 1) -> dict:
#     """Create a new membership at the given tier."""
#     result = (
#         db.table("neighborhood_memberships")
#         .insert({
#             "user_id": str(user_id),
#             "neighborhood_id": str(neighborhood_id),
#             "tier": tier,
#         })
#         .execute()
#     )
#     return result.data[0]


# async def upgrade_tier(db: Client, user_id: UUID, neighborhood_id: UUID, new_tier: int) -> dict | None:
#     """Upgrade the user's membership tier."""
#     result = (
#         db.table("neighborhood_memberships")
#         .update({"tier": new_tier, "tier_upgraded_at": "now()"})
#         .eq("user_id", str(user_id))
#         .eq("neighborhood_id", str(neighborhood_id))
#         .execute()
#     )
#     return result.data[0] if result.data else None


# async def list_members(db: Client, neighborhood_id: UUID, limit: int = 50, offset: int = 0) -> list[dict]:
#     """List all active members for a neighborhood (anchor view)."""
#     result = (
#         db.table("neighborhood_memberships")
#         .select("*, users(display_name)")
#         .eq("neighborhood_id", str(neighborhood_id))
#         .eq("is_active", True)
#         .limit(limit)
#         .offset(offset)
#         .execute()
#     )
#     return result.data or []

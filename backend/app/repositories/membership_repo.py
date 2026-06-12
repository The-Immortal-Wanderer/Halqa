"""Data access for neighborhood_members table."""

import asyncio
import logging
from uuid import UUID

from supabase import Client

logger = logging.getLogger(__name__)


async def get_active(db: Client, user_id: UUID, neighborhood_id: UUID) -> dict | None:
    """Get the user's active membership for a specific neighborhood.

    Runs the sync ``.execute()`` in a thread to avoid blocking the event
    loop, per the ``async/await throughout`` mandate.
    """
    result = await asyncio.to_thread(
        lambda: (
            db.table("neighborhood_members")
            .select("*")
            .eq("user_id", str(user_id))
            .eq("neighborhood_id", str(neighborhood_id))
            .eq("is_active", True)
            .maybe_single()
            .execute()
        )
    )
    return result.data if result else None


async def get_any_active(db: Client, user_id: UUID) -> list[dict]:
    """Get all active memberships for a user (enforces one-neighborhood limit)."""

    def _fetch():
        return (
            db.table("neighborhood_members")
            .select("*")
            .eq("user_id", str(user_id))
            .eq("is_active", True)
            .execute()
        )

    result = await asyncio.to_thread(_fetch)
    return result.data or []


async def create(
    db: Client, user_id: UUID, neighborhood_id: UUID, declared_address: str = "", tier: str = "tier_1"
) -> dict:
    """Create a new membership at the given tier."""

    def _insert():
        return (
            db.table("neighborhood_members")
            .insert({
                "user_id": str(user_id),
                "neighborhood_id": str(neighborhood_id),
                "declared_address": declared_address,
                "tier": tier,
            })
            .execute()
        )

    result = await asyncio.to_thread(_insert)
    return result.data[0]


async def upgrade_tier(db: Client, user_id: UUID, neighborhood_id: UUID, new_tier: str) -> dict | None:
    """Upgrade the user's membership tier."""

    def _update():
        return (
            db.table("neighborhood_members")
            .update({"tier": new_tier, "tier_upgraded_at": "now()"})
            .eq("user_id", str(user_id))
            .eq("neighborhood_id", str(neighborhood_id))
            .execute()
        )

    result = await asyncio.to_thread(_update)
    return result.data[0] if result.data else None


async def get_by_id(db: Client, membership_id: UUID) -> dict | None:
    """Get a membership by its primary key."""

    def _fetch():
        return (
            db.table("neighborhood_members")
            .select("*")
            .eq("id", str(membership_id))
            .maybe_single()
            .execute()
        )

    result = await asyncio.to_thread(_fetch)
    return result.data if result else None


async def list_members(db: Client, neighborhood_id: UUID, limit: int = 50, offset: int = 0) -> list[dict]:
    """List all active members for a neighborhood (anchor view)."""

    def _fetch():
        return (
            db.table("neighborhood_members")
            .select("*, users(display_name)")
            .eq("neighborhood_id", str(neighborhood_id))
            .eq("is_active", True)
            .limit(limit)
            .offset(offset)
            .execute()
        )

    result = await asyncio.to_thread(_fetch)
    return result.data or []

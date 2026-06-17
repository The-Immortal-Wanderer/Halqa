"""Data access for the users table."""

import asyncio
import logging
from uuid import UUID

from supabase import Client

from app.db.client import new_thread_safe_client

logger = logging.getLogger(__name__)


async def get_by_id(db: Client, user_id: UUID) -> dict | None:
    """Fetch a user by their UUID. Returns None if not found.

    Uses its own fresh Supabase client inside the thread-pool lambda to
    avoid sharing the cached client's HTTPX session (which would produce
    406 on the first cross-thread request). The ``db`` parameter is kept
    only for signature compatibility with ``Depends(get_db)``.
    """
    def _fetch():
        client = new_thread_safe_client()
        try:
            result = (
                client.table("users")
                .select("*")
                .eq("id", str(user_id))
                .eq("is_active", True)
                .maybe_single()
                .execute()
            )
            return result.data if result and result.data else None
        finally:
            client.auth.sign_out()

    return await asyncio.to_thread(_fetch)


async def create(db: Client, user_id: UUID, display_name: str) -> dict:
    """Insert a new user profile. Called after Supabase Auth signup."""
    result = await asyncio.to_thread(
        lambda: (
            db.table("users")
            .insert({
                "id": str(user_id),
                "display_name": display_name,
            })
            .execute()
        )
    )
    return result.data[0]


async def update_onboarding(db: Client, user_id: UUID, completed: bool = True) -> dict | None:
    """Set onboarding_complete flag on the user profile. Returns updated user or None."""

    def _update():
        return (
            db.table("users")
            .update({"onboarding_complete": completed})
            .eq("id", str(user_id))
            .execute()
        )

    result = await asyncio.to_thread(_update)
    return result.data[0] if result.data else None

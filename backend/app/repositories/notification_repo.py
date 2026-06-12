"""Data access for push_subscriptions and delivering notifications."""

import logging
from uuid import UUID

from supabase import Client

logger = logging.getLogger(__name__)


# async def get_neighborhood_subscriptions(
#     db: Client,
#     neighborhood_id: UUID,
#     exclude_user_id: UUID | None = None,
#     min_tier: int = 2,
# ) -> list[dict]:
#     """Get all push subscriptions for Tier 2+ members of a neighborhood."""
#     # This would join push_subscriptions with neighborhood_memberships
#     # to filter by tier and neighborhood, excluding the target user.
#     result = (
#         db.table("push_subscriptions")
#         .select("*, neighborhood_memberships!inner(tier, neighborhood_id)")
#         .eq("neighborhood_memberships.neighborhood_id", str(neighborhood_id))
#         .gte("neighborhood_memberships.tier", min_tier)
#         .execute()
#     )
#     if exclude_user_id:
#         result.data = [r for r in (result.data or []) if r.get("user_id") != str(exclude_user_id)]
#     return result.data or []


# async def get_user_subscriptions(db: Client, user_id: UUID) -> list[dict]:
#     """Get all push subscriptions for a specific user."""
#     result = (
#         db.table("push_subscriptions")
#         .select("*")
#         .eq("user_id", str(user_id))
#         .execute()
#     )
#     return result.data or []


# async def upsert_subscription(db: Client, user_id: UUID, endpoint: str, p256dh: str, auth: str) -> dict:
#     """Create or update a push subscription (upsert on endpoint)."""
#     result = (
#         db.table("push_subscriptions")
#         .upsert({
#             "user_id": str(user_id),
#             "endpoint": endpoint,
#             "p256dh": p256dh,
#             "auth": auth,
#         }, on_conflict="endpoint")
#         .execute()
#     )
#     return result.data[0]


# async def delete_subscription(db: Client, subscription_id: UUID) -> None:
#     """Remove a push subscription (called when expired or user opts out)."""
#     db.table("push_subscriptions").delete().eq("id", str(subscription_id)).execute()


import asyncio
from uuid import UUID

async def create_notification(
    db,
    user_id: UUID,
    notification_type: str,
    title: str,
    body: str,
    data: dict | None = None,
    neighborhood_id: UUID | None = None,
) -> dict:
    """Create a notification record in the notifications table.

    Simulates push notification delivery via Supabase Realtime (the
    notifications table has Realtime enabled, so connected clients receive
    the new row instantly).
    """

    def _insert():
        from supabase import create_client
        from app.core.config import get_settings
        settings = get_settings()
        client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        result = (
            client.table("notifications")
            .insert({
                "user_id": str(user_id),
                "type": notification_type,
                "title": title,
                "body": body,
                "data": data or {},
                "neighborhood_id": str(neighborhood_id) if neighborhood_id else None,
            })
            .execute()
        )
        return result.data[0]

    return await asyncio.to_thread(_insert)

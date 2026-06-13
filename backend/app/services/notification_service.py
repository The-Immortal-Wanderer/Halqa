"""Notification delivery service.

Since push notifications (FCM/APNS) are out of scope for the prototype, all
notifications are simulated via Supabase Realtime — we write a row to the
notifications table, and connected clients receive the new row instantly
because the table has Realtime enabled.
"""

import asyncio
import logging
from uuid import UUID

from app.repositories import notification_repo

logger = logging.getLogger(__name__)


async def send_emergency_alert(
    db,
    post_id: UUID,
    neighborhood_id: UUID,
    author_member_id: UUID,
    body_preview: str = "",
    category: str = "general",
) -> None:
    """Send emergency alert notifications to all Tier 2+ members.

    Per the spec, push notifications are simulated via Supabase Realtime.
    Creates a notification row for each eligible member so their Realtime
    subscription picks it up immediately.
    """
    try:
        from app.repositories import membership_repo

        members = await membership_repo.list_members(db, neighborhood_id)
        if not members:
            logger.info("No members to notify for post %s", post_id)
            return

        category_labels = {
            "power": "Power",
            "security": "Security",
            "infrastructure": "Infrastructure",
            "water": "Water",
            "general": "Alert",
        }

        notification_data = {
            "post_id": str(post_id),
            "neighborhood_id": str(neighborhood_id),
            "type": "emergency_alert",
            "category": category,
            "deep_link": f"halqa://feed/{neighborhood_id}/post/{post_id}",
        }

        for member in members:
            # Skip the post author
            if str(member.get("id")) == str(author_member_id):
                continue
            # Only notify Tier 2+
            tier = member.get("tier", "tier_1")
            if tier in ("tier_1",):
                continue

            user_id = member.get("user_id")
            if not user_id:
                continue

            await notification_repo.create_notification(
                db,
                user_id=UUID(user_id),
                notification_type="emergency_alert",
                title=f"\u26a0 {category_labels.get(category, 'Alert')} Alert",
                body=body_preview[:120] if body_preview else "",
                data=notification_data,
                neighborhood_id=neighborhood_id,
            )

    except Exception as e:
        logger.error("Failed to send emergency alert for post %s: %s", post_id, e)

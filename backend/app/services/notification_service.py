"""Web Push notification delivery service.

Sends push notifications via the Web Push protocol (RFC 8030) for:
- Emergency alerts (sent to all Tier 2+ members except the author)
- Verification result notifications (sent to the individual user)
"""

import json
import logging
from uuid import UUID

logger = logging.getLogger(__name__)


# async def send_emergency_alert(db, neighborhood_id: UUID, post: dict) -> None:
#     """Send a Web Push notification to all Tier 2+ members (except the post author)."""
#     from pywebpush import webpush, WebPushException
#     from app.repositories import notification_repo
#     from app.core.config import get_settings
#
#     settings = get_settings()
#     subscriptions = await notification_repo.get_neighborhood_subscriptions(
#         db, neighborhood_id, exclude_user_id=post["author_id"], min_tier=2
#     )
#     category_labels = {
#         "power": "Power", "security": "Security",
#         "infrastructure": "Infrastructure", "water": "Water", "general": "Alert",
#     }
#     notification_data = {
#         "type": "emergency_alert",
#         "title": f"\u26a0 {category_labels.get(post.get('category', ''), 'Alert')}",
#         "body": post.get("content", "")[:120],
#         "data": {
#             "post_id": str(post["id"]),
#             "neighborhood_id": str(neighborhood_id),
#             "deep_link": f"halqa://feed/{neighborhood_id}/post/{post['id']}",
#         },
#     }
#     for subscription in subscriptions:
#         try:
#             webpush(
#                 subscription_info={
#                     "endpoint": subscription["endpoint"],
#                     "keys": {"p256dh": subscription["p256dh"], "auth": subscription["auth"]},
#                 },
#                 data=json.dumps(notification_data),
#                 vapid_private_key=settings.vapid_private_key,
#                 vapid_claims={"sub": settings.vapid_email},
#             )
#         except WebPushException as e:
#             if e.response and e.response.status_code == 410:
#                 await notification_repo.delete_subscription(db, subscription["id"])
#             else:
#                 logger.error(f"Push notification failed: {e}")


# async def send_verification_result(db, user_id: UUID, status: str, neighborhood_id: UUID,
#                                      verification_record_id: UUID, rejection_reason: str | None = None) -> None:
#     """Send a verification result notification to the user."""
#     from pywebpush import webpush, WebPushException
#     from app.repositories import notification_repo
#     from app.core.config import get_settings
#
#     settings = get_settings()
#     subscriptions = await notification_repo.get_user_subscriptions(db, user_id)
#     if status == "approved":
#         notification_data = {
#             "type": "verification_approved",
#             "title": "Address verified",
#             "body": "You're now a verified member of your neighborhood.",
#             "data": {
#                 "neighborhood_id": str(neighborhood_id),
#                 "deep_link": f"halqa://verification/result?status=approved&neighborhood_id={neighborhood_id}",
#             },
#         }
#     else:
#         notification_data = {
#             "type": "verification_rejected",
#             "title": "Verification needs attention",
#             "body": "We couldn't verify your address. Tap to try again.",
#             "data": {
#                 "verification_record_id": str(verification_record_id),
#                 "rejection_reason": rejection_reason,
#                 "deep_link": f"halqa://verification/result?status=rejected&record_id={verification_record_id}",
#             },
#         }
#     for subscription in subscriptions:
#         try:
#             webpush(
#                 subscription_info={
#                     "endpoint": subscription["endpoint"],
#                     "keys": {"p256dh": subscription["p256dh"], "auth": subscription["auth"]},
#                 },
#                 data=json.dumps(notification_data),
#                 vapid_private_key=settings.vapid_private_key,
#                 vapid_claims={"sub": settings.vapid_email},
#             )
#         except WebPushException as e:
#             if e.response and e.response.status_code == 410:
#                 await notification_repo.delete_subscription(db, subscription["id"])
#             else:
#                 logger.error(f"Push notification failed: {e}")

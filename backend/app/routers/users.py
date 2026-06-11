"""User profile endpoints."""

from fastapi import APIRouter

router = APIRouter()

# GET /users/me
#   Auth: get_current_user
#   → APIResponse[UserResponse]
#   Returns the authenticated user's profile.
#
# PATCH /users/me
#   Auth: get_current_user
#   Body: UserUpdate { display_name?: str }
#   → APIResponse[UserResponse]
#   Updates display_name only.
#
# POST /users/push-subscription
#   Auth: get_current_user
#   Body: { endpoint: str, keys: { p256dh: str, auth: str } }
#   → APIResponse[{ subscribed: bool }]
#   Stores Web Push subscription.
#
# DELETE /users/push-subscription
#   Auth: get_current_user
#   Body: { endpoint: str }
#   → APIResponse[{ unsubscribed: bool }]
#   Removes a push subscription.

"""User profile business logic."""

import logging
from uuid import UUID

logger = logging.getLogger(__name__)


# async def get_user_profile(db, user_id: UUID) -> dict:
#     """Get the authenticated user's profile."""
#     from app.repositories import user_repo
#     user = await user_repo.get_by_id(db, user_id)
#     if not user:
#         raise ...
#     return user


# async def update_display_name(db, user_id: UUID, new_name: str) -> dict:
#     """Update display_name with validation."""
#     from app.repositories import user_repo
#     if len(new_name) < 2:
#         raise ...
#     return await user_repo.update_display_name(db, user_id, new_name)

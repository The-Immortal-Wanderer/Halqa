"""Membership join, tier, and status business logic."""

import logging
from uuid import UUID

logger = logging.getLogger(__name__)


# async def join_neighborhood(db, user_id: UUID, neighborhood_id: UUID) -> dict:
#     """Join a neighborhood as Tier 1.
#
#     Enforces:
#     - One active membership per user
#     - Neighborhood must exist and be active
#     - User must not already be a member
#     """
#     from app.repositories import membership_repo, neighborhood_repo
#     neighborhood = await neighborhood_repo.get_by_id(db, neighborhood_id)
#     if not neighborhood:
#         raise ...
#     existing = await membership_repo.get_any_active(db, user_id)
#     if existing:
#         raise ...  # ONE_NEIGHBORHOOD_LIMIT
#     already = await membership_repo.get_active(db, user_id, neighborhood_id)
#     if already:
#         raise ...  # ALREADY_A_MEMBER
#     return await membership_repo.create(db, user_id, neighborhood_id)

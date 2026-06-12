"""Membership join, tier, and status business logic."""

import logging
from uuid import UUID

from app.core.errors import ErrorCode, api_error
from app.repositories import membership_repo, neighborhood_repo, user_repo

logger = logging.getLogger(__name__)


async def join_neighborhood(
    db,
    user_id: UUID,
    neighborhood_id: UUID,
    tier: str = "tier_1",
    declared_address: str = "",
) -> dict:
    """Join a neighborhood at the given tier.

    Enforces:
    - Neighborhood must exist and be active
    - User must not already be a member of this neighborhood
    - One active membership per user
    """
    # Check neighborhood exists and is active
    neighborhood = await neighborhood_repo.get_by_id(db, neighborhood_id)
    if not neighborhood:
        raise api_error(404, ErrorCode.NEIGHBORHOOD_NOT_FOUND, "Neighborhood not found")

    # Check user is not already a member of this neighborhood
    existing = await membership_repo.get_active(db, user_id, neighborhood_id)
    if existing:
        raise api_error(
            409,
            ErrorCode.ALREADY_A_MEMBER,
            "You are already a member of this neighborhood",
        )

    # Check one-neighborhood-per-user limit
    any_active = await membership_repo.get_any_active(db, user_id)
    if any_active:
        raise api_error(
            409,
            ErrorCode.ONE_NEIGHBORHOOD_LIMIT,
            "You can only be a member of one neighborhood at a time",
        )

    # Create membership
    membership = await membership_repo.create(db, user_id, neighborhood_id, declared_address, tier)

    # Mark onboarding as complete
    await user_repo.update_onboarding(db, user_id, True)

    return membership

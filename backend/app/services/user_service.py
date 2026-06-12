"""User profile business logic."""

import logging
from uuid import UUID

from supabase import Client

from app.repositories import user_repo

logger = logging.getLogger(__name__)


async def get_or_create_user_profile(
    db: Client,
    auth_uid: UUID,
    display_name: str,
) -> dict:
    """Return the user profile for *auth_uid*, creating it if it doesn't exist.

    Called by the auth router after a Supabase Auth user is created via the
    admin API.  Delegates all database access to ``user_repo``.
    """
    existing = await user_repo.get_by_id(db, auth_uid)
    if existing:
        return existing
    return await user_repo.create(db, auth_uid, display_name)

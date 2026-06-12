"""Neighborhood search and management business logic."""

import logging
from uuid import UUID

from app.core.errors import ErrorCode, api_error
from app.repositories import neighborhood_repo

logger = logging.getLogger(__name__)


async def search_neighborhoods(db, query: str | None = None, limit: int = 10) -> list[dict]:
    """Search neighborhoods by name.

    If query is empty or None, returns the most recently created active
    neighborhoods. Otherwise performs an ILIKE search on the name field.
    """
    q = (query or "").strip()
    return await neighborhood_repo.search_by_name(db, q, limit)


async def get_neighborhood(db, neighborhood_id: UUID) -> dict:
    """Get a single active neighborhood by ID. Raises 404 if not found."""
    neighborhood = await neighborhood_repo.get_by_id(db, neighborhood_id)
    if not neighborhood:
        raise api_error(404, ErrorCode.NEIGHBORHOOD_NOT_FOUND, "Neighborhood not found")
    return neighborhood

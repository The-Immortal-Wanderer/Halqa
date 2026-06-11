"""Neighborhood search and management business logic."""

import logging

logger = logging.getLogger(__name__)


# async def search_neighborhoods(db, query: str, limit: int = 10) -> list[dict]:
#     """Search neighborhoods by name (trigram search). Filters out neighborhoods the user is already a member of."""
#     from app.repositories import neighborhood_repo
#     return await neighborhood_repo.search_by_name(db, query, limit)

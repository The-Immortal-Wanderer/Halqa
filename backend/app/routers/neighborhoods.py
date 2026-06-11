"""Neighborhood search and management endpoints."""

from fastapi import APIRouter

router = APIRouter()

# GET /neighborhoods/search?q={query}&limit={limit}
#   Auth: get_current_user
#   → APIResponse[List[NeighborhoodSearchResult]]
#   Trigram search on neighborhood name. Filters out neighborhoods the user
#   is already a member of.
#
# GET /neighborhoods/{neighborhood_id}
#   Auth: get_current_user
#   → APIResponse[NeighborhoodResponse]
#   Full neighborhood details. Any authenticated user can view.

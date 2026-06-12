"""Neighborhood search and detail endpoints (public).

Both endpoints are intentionally public — they run before the user has
created an account (onboarding Screens 2 and 3).
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.core.errors import ErrorCode, api_error
from app.db.dependencies import get_db
from app.schemas.common import APIResponse
from app.schemas.neighborhood import (
    NeighborhoodAPIResponse,
    NeighborhoodResponse,
    NeighborhoodSearchAPIResponse,
    NeighborhoodSearchResult,
)
from app.services import neighborhood_service

router = APIRouter()


@router.get("/neighborhoods/search")
async def search_neighborhoods(
    q: str = Query(default="", min_length=0, max_length=120),
    limit: int = Query(default=10, ge=1, le=20),
    db: Client = Depends(get_db),
) -> NeighborhoodSearchAPIResponse:
    """Search for neighborhoods by name.

    Public endpoint — no auth required. Returns active neighborhoods.
    If query is empty, returns the most recently active neighborhoods.
    """
    results = await neighborhood_service.search_neighborhoods(db, q, limit)

    return APIResponse.ok([
        NeighborhoodSearchResult(
            id=r["id"],
            name=r["name"],
            city=r["city"],
            sector_or_area=r.get("sector"),
            member_count=r.get("member_count", 0),
            total_member_count=r.get("total_member_count", r.get("member_count", 0)),
        )
        for r in results
    ])


@router.get("/neighborhoods/{neighborhood_id}")
async def get_neighborhood(
    neighborhood_id: UUID,
    db: Client = Depends(get_db),
) -> NeighborhoodAPIResponse:
    """Get full details for a single neighborhood.

    Public endpoint — no auth required. Returns 404 if not found.
    """
    neighborhood = await neighborhood_service.get_neighborhood(db, neighborhood_id)
    return APIResponse.ok(
        NeighborhoodResponse(
            id=neighborhood["id"],
            name=neighborhood["name"],
            city=neighborhood["city"],
            sector_or_area=neighborhood.get("sector"),
            member_count=neighborhood.get("member_count", 0),
            total_member_count=neighborhood.get(
                "total_member_count", neighborhood.get("member_count", 0)
            ),
            is_active=neighborhood["is_active"],
        )
    )

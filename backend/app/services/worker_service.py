"""Worker directory business logic.

Tier rules:
- Tier 1+ can browse listings (worker_phone hidden for Tier 1)
- Tier 2+ can create listings
"""

from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from app.repositories import worker_repo
from app.schemas.worker import (
    ALLOWED_SERVICE_TYPES,
    WorkerListingCreate,
    WorkerListingResponse,
    WorkerReviewResponse,
    WorkerListData,
    WorkerDetailData,
)

logger = logging.getLogger(__name__)

# Mapping from DB column names to API-friendly field names
_DB_TO_API: dict[str, str] = {
    "worker_name": "name",
    "worker_phone": "contact_phone",
    "avg_rating": "average_rating",
}


def _to_api(raw: dict) -> dict:
    """Map DB column names to API-friendly field names."""
    return {_DB_TO_API.get(k, k): v for k, v in raw.items()}


def _mask_phone(api: dict) -> dict:
    """Return a copy with contact_phone set to None (for Tier 1)."""
    out = dict(api)
    out["contact_phone"] = None
    return out


async def _enrich_with_review_count(
    items: list[WorkerListingResponse],
) -> list[WorkerListingResponse]:
    """Fetch published review counts for each listing."""
    enriched = []
    for item in items:
        count = await asyncio.to_thread(
            worker_repo.count_published_reviews, listing_id=item.id
        )
        item.review_count = count
        enriched.append(item)
    return enriched


async def list_listings(
    neighborhood_id: UUID,
    member_tier: int,
    service_type: str | None = None,
    limit: int = 20,
) -> WorkerListData:
    """Get worker listings for a neighborhood."""
    listings_raw = await asyncio.to_thread(
        worker_repo.list_listings,
        neighborhood_id=neighborhood_id,
        service_type=service_type,
        limit=limit,
    )
    hide_phone = member_tier < 2
    items = [
        WorkerListingResponse(**_to_api(r) if not hide_phone else _mask_phone(_to_api(r)))
        for r in listings_raw
    ]
    items = await _enrich_with_review_count(items)
    return WorkerListData(listings=items, total=len(items))


async def get_listing(
    listing_id: UUID,
    member_tier: int,
) -> WorkerDetailData | None:
    """Get a single worker listing with its reviews."""
    raw = await asyncio.to_thread(worker_repo.get_listing, listing_id=listing_id)
    if not raw:
        return None
    reviews_raw = await asyncio.to_thread(
        worker_repo.list_reviews, listing_id=listing_id, limit=5
    )
    hide_phone = member_tier < 2
    listing = WorkerListingResponse(
        **(_to_api(raw) if not hide_phone else _mask_phone(_to_api(raw)))
    )
    reviews = [WorkerReviewResponse(**r) for r in reviews_raw]
    count = await asyncio.to_thread(
        worker_repo.count_published_reviews, listing_id=listing_id
    )
    listing.review_count = count
    return WorkerDetailData(listing=listing, reviews=reviews)


async def create_listing(
    member_id: UUID,
    neighborhood_id: UUID,
    data: WorkerListingCreate,
) -> WorkerListingResponse:
    """Create a new worker listing. Maps API names to DB columns."""
    service_type = data.service_type.lower().strip()
    if service_type not in ALLOWED_SERVICE_TYPES:
        from app.core.errors import ErrorCode, api_error
        raise api_error(
            400,
            ErrorCode.INVALID_PARAMETERS,
            f"Invalid service_type: {data.service_type}. "
            f"Must be one of: {', '.join(sorted(ALLOWED_SERVICE_TYPES))}",
        )
    raw = await asyncio.to_thread(
        worker_repo.create_listing,
        member_id=member_id,
        neighborhood_id=neighborhood_id,
        worker_name=data.name.strip(),
        service_type=service_type,
        description=data.description.strip() if data.description else None,
        worker_phone=data.contact_phone.strip() if data.contact_phone else None,
    )
    return WorkerListingResponse(**(_to_api(raw)))

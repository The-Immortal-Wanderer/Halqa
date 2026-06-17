"""Worker directory endpoints: listings and details."""

from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query

from app.core.auth import get_current_member, require_tier
from app.core.errors import ErrorCode, api_error
from app.schemas.common import APIResponse, AuthMember
from app.schemas.worker import (
    WorkerListingCreate,
    WorkerListAPIResponse,
    WorkerListingAPIResponse,
    WorkerDetailAPIResponse,
)
from app.services import worker_service

router = APIRouter()


@router.get("/neighborhoods/{neighborhood_id}/workers")
async def list_workers(
    neighborhood_id: UUID = Path(...),
    service_type: str | None = Query(None),
    limit: int = Query(20, ge=1, le=50),
    member: AuthMember = Depends(get_current_member),
) -> WorkerListAPIResponse:
    """List worker listings for a neighborhood (Tier 1+).

    Tier 1 sees no contact_phone. Tier 2+ sees full listing.
    """
    result = await worker_service.list_listings(
        neighborhood_id=neighborhood_id,
        member_tier=member.tier,
        service_type=service_type,
        limit=limit,
    )
    return APIResponse.ok(data=result)


@router.get("/neighborhoods/{neighborhood_id}/workers/{listing_id}")
async def get_worker(
    neighborhood_id: UUID = Path(...),
    listing_id: UUID = Path(...),
    member: AuthMember = Depends(get_current_member),
) -> WorkerDetailAPIResponse:
    """Get a single worker listing with reviews (Tier 1+)."""
    result = await worker_service.get_listing(
        listing_id=listing_id,
        member_tier=member.tier,
    )
    if not result:
        raise api_error(404, ErrorCode.WORKER_NOT_FOUND, "Worker listing not found")
    return APIResponse.ok(data=result)


@router.post("/neighborhoods/{neighborhood_id}/workers")
async def create_worker(
    neighborhood_id: UUID = Path(...),
    body: WorkerListingCreate = ...,
    member: AuthMember = Depends(require_tier(2)),
) -> WorkerListingAPIResponse:
    """Create a worker listing (Tier 2+ only)."""
    result = await worker_service.create_listing(
        member_id=member.membership["id"],
        neighborhood_id=neighborhood_id,
        data=body,
    )
    return APIResponse.ok(data=result)

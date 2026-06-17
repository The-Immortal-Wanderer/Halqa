"""Worker directory request/response schemas.

Maps to deployed DB schema (migration 20260611_001):
  worker_listings: worker_name, worker_phone, service_type,
    is_promoted, earned_badge, min_completed_jobs, avg_rating, status
  worker_reviews: rating, review_body, is_published, job_confirmed_*
"""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import APIResponse


ALLOWED_SERVICE_TYPES = frozenset({
    "plumber", "electrician", "maid", "driver", "cook", "handyman", "other",
})


class WorkerListingResponse(BaseModel):
    """Worker listing — API-friendly field names (mapped in service layer)."""
    id: UUID
    neighborhood_id: UUID
    created_by_member_id: UUID
    name: str                          # DB: worker_name
    service_type: str
    description: Optional[str] = None
    contact_phone: Optional[str] = None  # DB: worker_phone, hidden from Tier 1
    is_promoted: bool = False
    earned_badge: str = "none"
    min_completed_jobs: int = 0
    average_rating: Optional[float] = None  # DB: avg_rating
    status: str = "active"
    review_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class WorkerListingCreate(BaseModel):
    """Body for creating a new listing (API-friendly names)."""
    name: str = Field(..., min_length=2, max_length=80)
    service_type: str
    description: Optional[str] = Field(None, max_length=300)
    contact_phone: Optional[str] = Field(None, max_length=50)


class WorkerReviewResponse(BaseModel):
    """A published review."""
    id: UUID
    listing_id: UUID
    reviewer_member_id: UUID
    rating: Optional[int] = None
    review_body: Optional[str] = None
    created_at: Optional[str] = None


class WorkerListData(BaseModel):
    """Paginated worker listings."""
    listings: list[WorkerListingResponse]
    total: int


class WorkerDetailData(BaseModel):
    """Single worker listing with reviews."""
    listing: WorkerListingResponse
    reviews: list[WorkerReviewResponse]


WorkerListingAPIResponse = APIResponse[WorkerListingResponse]
WorkerListAPIResponse = APIResponse[WorkerListData]
WorkerDetailAPIResponse = APIResponse[WorkerDetailData]

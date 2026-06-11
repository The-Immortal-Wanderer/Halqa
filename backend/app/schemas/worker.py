"""Worker directory request/response schemas."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import APIResponse


class WorkerListingResponse(BaseModel):
    """A single worker listing in the directory."""

    id: UUID
    neighborhood_id: UUID
    submitted_by: UUID
    worker_name: str
    category: str
    description: Optional[str] = None
    contact_info: Optional[str] = None  # null for Tier 1 members
    is_verified_badge: bool = False
    confirmed_job_count: int = 0
    average_rating: Optional[float] = None
    is_promoted: bool = False
    created_at: str


class WorkerListingCreate(BaseModel):
    """Body for creating a new worker listing."""

    worker_name: str = Field(..., min_length=2, max_length=80)
    category: str
    description: Optional[str] = Field(None, max_length=300)
    contact_info: str = Field(..., max_length=200)


class WorkerReviewResponse(BaseModel):
    """A review left for a worker listing."""

    id: UUID
    listing_id: UUID
    reviewer_id: UUID
    reviewer_display_name: str
    rating: int  # 1–5
    review_text: Optional[str] = None
    job_confirmed: bool
    created_at: str


class WorkerReviewCreate(BaseModel):
    """Body for creating a review."""

    rating: int = Field(..., ge=1, le=5)
    content: str = Field(..., max_length=500)
    job_confirmed: bool = True


class WorkerListResponse(BaseModel):
    """Paginated worker listings."""

    listings: list[WorkerListingResponse]
    total: int


# Type aliases
WorkerListingAPIResponse = APIResponse[WorkerListingResponse]
WorkerListAPIResponse = APIResponse[WorkerListResponse]
WorkerReviewAPIResponse = APIResponse[WorkerReviewResponse]
WorkerReviewListAPIResponse = APIResponse[list[WorkerReviewResponse]]

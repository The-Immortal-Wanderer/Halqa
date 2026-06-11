"""Neighborhood request/response schemas."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import APIResponse


class NeighborhoodResponse(BaseModel):
    """Full neighborhood detail returned to any authenticated user."""

    id: UUID
    name: str
    city: str
    sector_or_area: Optional[str] = None
    member_count: int  # Tier 2+ only
    total_member_count: int
    is_active: bool


class NeighborhoodSearchResult(BaseModel):
    """Lightweight result for the search endpoint."""

    id: UUID
    name: str
    city: str
    sector_or_area: Optional[str] = None
    member_count: int
    total_member_count: int


class NeighborhoodCreate(BaseModel):
    """Request body for creating a new neighborhood."""

    name: str = Field(..., min_length=3, max_length=120)
    city: str = Field(..., min_length=2, max_length=80)
    sector_or_area: Optional[str] = Field(None, max_length=120)


# Type aliases
NeighborhoodAPIResponse = APIResponse[NeighborhoodResponse]
NeighborhoodSearchAPIResponse = APIResponse[list[NeighborhoodSearchResult]]
NeighborhoodCreateAPIResponse = APIResponse[NeighborhoodResponse]

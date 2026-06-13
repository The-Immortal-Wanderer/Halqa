"""Civic dashboard request/response schemas.

Matches the actual deployed civic_dashboard_snapshots table schema:
- period_type TEXT ('7d', '30d', '90d')
- category_breakdown JSONB
- period_start / period_end DATE
- computed_at TIMESTAMPTZ
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, field_validator

from app.schemas.common import APIResponse


VALID_PERIODS = frozenset({"7d", "30d", "90d"})


class DashboardResponse(BaseModel):
    """Pre-computed civic dashboard snapshot for a neighborhood.

    Fields match the actual civic_dashboard_snapshots table.
    """

    neighborhood_id: UUID
    neighborhood_name: str
    period_type: str  # '7d' | '30d' | '90d'
    period_start: str  # YYYY-MM-DD
    period_end: str  # YYYY-MM-DD
    total_posts: int
    emergency_posts: int
    resolved_posts: int
    active_members: int
    category_breakdown: dict[str, int]
    computed_at: str  # ISO 8601 UTC

    @field_validator("period_type")
    @classmethod
    def validate_period_type(cls, v: str) -> str:
        if v not in VALID_PERIODS:
            raise ValueError(f"period_type must be one of {sorted(VALID_PERIODS)}, got '{v}'")
        return v


class DashboardExportResponse(BaseModel):
    """Plain-text dashboard export for sharing with institutions."""

    export_text: str
    period_type: str
    generated_at: str  # ISO 8601 UTC

    @field_validator("period_type")
    @classmethod
    def validate_period_type(cls, v: str) -> str:
        if v not in VALID_PERIODS:
            raise ValueError(f"period_type must be one of {sorted(VALID_PERIODS)}, got '{v}'")
        return v


# Type aliases
DashboardAPIResponse = APIResponse[DashboardResponse]
DashboardExportAPIResponse = APIResponse[DashboardExportResponse]

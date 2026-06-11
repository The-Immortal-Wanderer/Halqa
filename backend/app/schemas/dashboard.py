"""Civic dashboard request/response schemas."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import APIResponse


class DashboardResponse(BaseModel):
    """Pre-computed civic dashboard snapshot for a neighborhood."""

    neighborhood_id: UUID
    period_days: int  # 7 | 30 | 90
    snapshot_date: str  # YYYY-MM-DD
    total_posts: int
    emergency_posts: int
    resolved_posts: int
    power_count: int
    security_count: int
    infrastructure_count: int
    water_count: int
    general_count: int
    power_resolved: int
    security_resolved: int
    infrastructure_resolved: int
    water_resolved: int
    active_members: int
    export_text: Optional[str] = None


class DashboardExportResponse(BaseModel):
    """Plain-text dashboard export for sharing."""

    export_text: str
    period_days: int
    generated_at: str  # ISO 8601 UTC


# Type aliases
DashboardAPIResponse = APIResponse[DashboardResponse]
DashboardExportAPIResponse = APIResponse[DashboardExportResponse]

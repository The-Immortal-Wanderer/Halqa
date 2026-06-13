"""Civic dashboard endpoints.

Returns pre-computed or on-the-fly computed neighborhood analytics.
Both endpoints require Tier 2 membership.
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.params import Path

from app.core.auth import get_current_member, require_tier
from app.db.dependencies import get_db
from app.schemas.common import AuthMember
from app.schemas.dashboard import (
    VALID_PERIODS,
    DashboardAPIResponse,
    DashboardExportAPIResponse,
    DashboardExportResponse,
    DashboardResponse,
)
from app.services import dashboard_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/neighborhoods/{neighborhood_id}/dashboard")
async def get_dashboard(
    neighborhood_id: UUID = Path(...),
    period_type: str = Query("30d", description="Period: 7d, 30d, or 90d"),
    member: AuthMember = Depends(require_tier(2)),
    db=Depends(get_db),
) -> DashboardAPIResponse:
    """Get the civic dashboard for the neighborhood.

    Returns pre-computed snapshot data or computes on-the-fly if
    snapshots have been invalidated by new posts.
    """
    if period_type not in VALID_PERIODS:
        from app.core.errors import ErrorCode, api_error as _api_error
        raise _api_error(400, ErrorCode.INVALID_PARAMETERS, f"period_type must be one of {sorted(VALID_PERIODS)}")

    snapshot = await dashboard_service.get_or_compute_snapshot(
        db, neighborhood_id, period_type,
    )

    return DashboardAPIResponse.ok(data=snapshot)


@router.get("/neighborhoods/{neighborhood_id}/dashboard/export")
async def get_dashboard_export(
    neighborhood_id: UUID = Path(...),
    period_type: str = Query("30d", description="Period: 7d, 30d, or 90d"),
    member: AuthMember = Depends(require_tier(2)),
    db=Depends(get_db),
) -> DashboardExportAPIResponse:
    """Get the civic dashboard as a plain-text export ready for sharing.

    The export text follows the exact format specified in the spec.
    """
    if period_type not in VALID_PERIODS:
        from app.core.errors import ErrorCode, api_error as _api_error
        raise _api_error(400, ErrorCode.INVALID_PARAMETERS, f"period_type must be one of {sorted(VALID_PERIODS)}")

    snapshot = await dashboard_service.get_or_compute_snapshot(
        db, neighborhood_id, period_type,
    )

    neighborhood_name = snapshot.get("neighborhood_name", "Unknown Neighborhood")
    city = str(snapshot.get("city", "")) if snapshot.get("city") else ""

    export_text = dashboard_service.format_export_text(
        snapshot, neighborhood_name, city,
    )

    return DashboardExportAPIResponse.ok(data=DashboardExportResponse(
        export_text=export_text,
        period_type=period_type,
        generated_at=datetime.now(timezone.utc).isoformat(),
    ))

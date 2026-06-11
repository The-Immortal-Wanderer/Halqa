"""Civic dashboard endpoints."""

from fastapi import APIRouter

router = APIRouter()

# GET /neighborhoods/{neighborhood_id}/dashboard
#   Auth: require_tier(2)
#   Query: period_days (7 | 30 | 90, default 30)
#   → APIResponse[DashboardResponse]
#
# GET /neighborhoods/{neighborhood_id}/dashboard/export
#   Auth: require_tier(2)
#   Query: period_days (7 | 30 | 90, default 30)
#   → APIResponse[DashboardExportResponse]

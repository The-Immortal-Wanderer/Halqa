"""Data access for the civic_dashboard_snapshots table."""

import logging
from uuid import UUID

from supabase import Client

logger = logging.getLogger(__name__)


# async def get_latest(db: Client, neighborhood_id: UUID, period_days: int) -> dict | None:
#     """Get the latest snapshot for a given period. Returns None if none exists."""
#     result = (
#         db.table("civic_dashboard_snapshots")
#         .select("*")
#         .eq("neighborhood_id", str(neighborhood_id))
#         .eq("period_days", period_days)
#         .order("snapshot_date", desc=True)
#         .limit(1)
#         .single()
#         .execute()
#     )
#     return result.data if result.data else None


# async def create_snapshot(db: Client, neighborhood_id: UUID, period_days: int, counts: dict) -> dict:
#     """Store a new dashboard snapshot."""
#     result = (
#         db.table("civic_dashboard_snapshots")
#         .insert({
#             "neighborhood_id": str(neighborhood_id),
#             "period_days": period_days,
#             **counts,
#         })
#         .execute()
#     )
#     return result.data[0]

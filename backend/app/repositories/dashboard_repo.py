"""Data access for the civic_dashboard_snapshots table.

Uses the deployed schema:
- period_type TEXT ('7d', '30d', '90d')
- category_breakdown JSONB
- period_start / period_end DATE
- computed_at TIMESTAMPTZ

All synchronous ``.execute()`` calls are wrapped in ``asyncio.to_thread``.
"""

import asyncio
import json
import logging
from datetime import date, datetime, timezone
from uuid import UUID

from supabase import Client

logger = logging.getLogger(__name__)

PERIOD_DAYS_MAP = {"7d": 7, "30d": 30, "90d": 90}


async def get_latest(
    db: Client,
    neighborhood_id: UUID,
    period_type: str,
) -> dict | None:
    """Get the latest snapshot for a neighborhood and period.

    Returns the most recently computed snapshot, or None if none exists.
    """

    def _fetch():
        return (
            db.table("civic_dashboard_snapshots")
            .select("*")
            .eq("neighborhood_id", str(neighborhood_id))
            .eq("period_type", period_type)
            .order("computed_at", desc=True)
            .limit(1)
            .maybe_single()
            .execute()
        )

    result = await asyncio.to_thread(_fetch)
    if not result or not result.data:
        return None
    return _map_row(result.data)


async def create_snapshot(
    db: Client,
    neighborhood_id: UUID,
    period_type: str,
    period_start: date,
    period_end: date,
    total_posts: int,
    emergency_posts: int,
    resolved_posts: int,
    active_members: int,
    category_breakdown: dict[str, int],
) -> dict:
    """Insert a new dashboard snapshot and return the created row."""

    def _insert():
        return (
            db.table("civic_dashboard_snapshots")
            .insert({
                "neighborhood_id": str(neighborhood_id),
                "period_type": period_type,
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "total_posts": total_posts,
                "emergency_posts": emergency_posts,
                "resolved_posts": resolved_posts,
                "active_members": active_members,
                "category_breakdown": json.dumps(category_breakdown),
                "computed_at": datetime.now(timezone.utc).isoformat(),
            })
            .execute()
        )

    result = await asyncio.to_thread(_insert)
    if not result or not result.data:
        raise RuntimeError("Failed to create dashboard snapshot")
    return _map_row(result.data[0])


async def invalidate_snapshots(db: Client, neighborhood_id: UUID) -> None:
    """Delete all dashboard snapshots for a neighborhood.

    They will be recomputed on next dashboard load.
    Called after any new post is created.
    """

    def _delete():
        return (
            db.table("civic_dashboard_snapshots")
            .delete()
            .eq("neighborhood_id", str(neighborhood_id))
            .execute()
        )

    await asyncio.to_thread(_delete)


def _map_row(row: dict) -> dict:
    """Map raw Supabase row to a normalized dict matching DashboardResponse.

    Handles:
    - category_breakdown (may be string or already parsed dict)
    - period_start / period_end as YYYY-MM-DD strings
    - computed_at as ISO 8601 string
    """
    result = dict(row)

    # Ensure category_breakdown is a dict
    cb = result.get("category_breakdown", {})
    if isinstance(cb, str):
        result["category_breakdown"] = json.loads(cb) if cb else {}
    elif cb is None:
        result["category_breakdown"] = {}

    # Ensure dates are strings
    for key in ("period_start", "period_end"):
        val = result.get(key)
        if val is not None and not isinstance(val, str):
            result[key] = val.isoformat() if hasattr(val, "isoformat") else str(val)

    # Ensure computed_at is a string
    ca = result.get("computed_at")
    if ca is not None and not isinstance(ca, str):
        result["computed_at"] = ca.isoformat() if hasattr(ca, "isoformat") else str(ca)

    return result

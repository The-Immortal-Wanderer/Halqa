"""Civic dashboard computation and export business logic.

Returns pre-computed snapshots when available, or computes them on-the-fly
from the underlying post data when snapshots have been invalidated.
"""

import asyncio
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from app.repositories import dashboard_repo
from app.repositories.neighborhood_repo import get_by_id as get_neighborhood

logger = logging.getLogger(__name__)

PERIOD_DAYS_MAP: dict[str, int] = {"7d": 7, "30d": 30, "90d": 90}


async def get_or_compute_snapshot(
    db,
    neighborhood_id: UUID,
    period_type: str,
) -> dict:
    """Get the latest dashboard snapshot, or compute one on demand.

    1. Check if a pre-computed snapshot exists in civic_dashboard_snapshots.
    2. If found, enrich with neighborhood_name and return.
    3. If not found, compute from posts data, persist, and return.
    """
    snapshot = await dashboard_repo.get_latest(db, neighborhood_id, period_type)

    if snapshot:
        # Enrich with neighborhood name
        neighborhood = await get_neighborhood(db, neighborhood_id)
        snapshot["neighborhood_name"] = (
            neighborhood["name"] if neighborhood else "Unknown Neighborhood"
        )
        return snapshot

    return await compute_snapshot(db, neighborhood_id, period_type)


async def compute_snapshot(
    db,
    neighborhood_id: UUID,
    period_type: str,
) -> dict:
    """Compute a dashboard snapshot from post data.

    Collects all non-deleted posts for the neighborhood within the
    query period, aggregates counts, persists the snapshot, and returns
    the enriched result.
    """
    period_days = PERIOD_DAYS_MAP[period_type]
    today = date.today()
    period_start = today - timedelta(days=period_days)
    period_end = today + timedelta(days=1)  # include today

    # Fetch neighborhood for the name
    neighborhood = await get_neighborhood(db, neighborhood_id)
    neighborhood_name = neighborhood["name"] if neighborhood else "Unknown Neighborhood"
    city = neighborhood.get("city", "") if neighborhood else ""
    city_str = city if city else ""

    def _fetch_posts():
        result = (
            db.table("posts")
            .select("category, is_emergency, is_resolved, author_member_id, created_at")
            .eq("neighborhood_id", str(neighborhood_id))
            .gte("created_at", period_start.isoformat())
            .lt("created_at", period_end.isoformat())
            .eq("is_removed", False)
            .execute()
        )
        return result.data if result else []

    posts = await asyncio.to_thread(_fetch_posts)

    total_posts = len(posts)
    emergency_posts = sum(1 for p in posts if p.get("is_emergency"))
    resolved_posts = sum(1 for p in posts if p.get("is_resolved"))

    # Category breakdown
    category_breakdown: dict[str, int] = {}
    for p in posts:
        cat = p.get("category", "general")
        category_breakdown[cat] = category_breakdown.get(cat, 0) + 1

    # Active members (distinct author_member_ids)
    active_members = len({p.get("author_member_id") for p in posts if p.get("author_member_id")})

    # Persist the snapshot
    snapshot = await dashboard_repo.create_snapshot(
        db,
        neighborhood_id=neighborhood_id,
        period_type=period_type,
        period_start=period_start,
        period_end=period_end,
        total_posts=total_posts,
        emergency_posts=emergency_posts,
        resolved_posts=resolved_posts,
        active_members=active_members,
        category_breakdown=category_breakdown,
    )

    # Enrich with neighborhood name
    snapshot["neighborhood_name"] = neighborhood_name
    if city_str:
        snapshot["city"] = city_str

    # Ensure category_breakdown is a proper dict
    cb = snapshot.get("category_breakdown", {})
    if isinstance(cb, str):
        import json
        snapshot["category_breakdown"] = json.loads(cb) if cb else {}
    elif cb is None:
        snapshot["category_breakdown"] = {}

    # Ensure all standard categories have entries
    for cat in ("power", "security", "infrastructure", "water", "general"):
        if cat not in snapshot["category_breakdown"]:
            snapshot["category_breakdown"][cat] = 0

    return snapshot


def format_export_text(
    snapshot: dict,
    neighborhood_name: str,
    city: str = "",
) -> str:
    """Format dashboard data as a plain-text export.

    Outputs the exact format specified in the civic dashboard spec
    for sharing with utility providers and municipal bodies.
    """
    period_start = snapshot.get("period_start", "")
    period_end = snapshot.get("period_end", "")
    total_posts = snapshot.get("total_posts", 0)
    emergency_posts = snapshot.get("emergency_posts", 0)
    resolved_posts = snapshot.get("resolved_posts", 0)
    category_breakdown = snapshot.get("category_breakdown", {})
    if isinstance(category_breakdown, str):
        import json
        category_breakdown = json.loads(category_breakdown) if category_breakdown else {}
    elif category_breakdown is None:
        category_breakdown = {}

    # Format dates for display
    start_str = str(period_start) if period_start else "N/A"
    end_str = str(period_end) if period_end else "N/A"

    # Ensure the period_start/end are short date strings
    if hasattr(period_start, "isoformat"):
        start_str = period_start.isoformat()[:10]
    elif hasattr(period_start, "strftime"):
        start_str = period_start.strftime("%Y-%m-%d")
    if hasattr(period_end, "isoformat"):
        end_str = period_end.isoformat()[:10]
    elif hasattr(period_end, "strftime"):
        end_str = period_end.strftime("%Y-%m-%d")

    city_part = f" — {city}" if city else ""

    lines = [
        "Halqa Neighborhood Intelligence Report",
        f"{neighborhood_name}{city_part}",
        f"Period: {start_str} to {end_str}",
        "",
        "Summary:",
        f"• {total_posts} community reports submitted",
        f"• {emergency_posts} emergency alerts raised",
        f"• {resolved_posts} issues resolved",
        "",
        "Reports by type:",
        f"• Power/Electricity: {category_breakdown.get('power', 0)}",
        f"• Security: {category_breakdown.get('security', 0)}",
        f"• Infrastructure: {category_breakdown.get('infrastructure', 0)}",
        f"• Water: {category_breakdown.get('water', 0)}",
        f"• General: {category_breakdown.get('general', 0)}",
        "",
        "Generated by Halqa — halqa.app",
        "This report represents aggregated, anonymized community data.",
        "Individual reporter identities are not disclosed.",
    ]
    return "\n".join(lines) + "\n"

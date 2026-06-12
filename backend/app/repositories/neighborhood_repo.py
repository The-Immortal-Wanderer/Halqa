"""Data access for the neighborhoods table."""

import asyncio
import logging
from uuid import UUID

from supabase import Client

logger = logging.getLogger(__name__)


async def search_by_name(db: Client, query: str, limit: int = 10) -> list[dict]:
    """Search neighborhoods by name using ILIKE. Returns matching active neighborhoods."""

    def _search():
        q = db.table("neighborhoods").select("*").eq("is_active", True)
        if query.strip():
            q = q.ilike("name", f"%{query}%")
        return q.order("created_at", desc=True).limit(limit).execute()

    result = await asyncio.to_thread(_search)
    return result.data or []


async def get_by_id(db: Client, neighborhood_id: UUID) -> dict | None:
    """Fetch an active neighborhood by ID. Returns None if not found."""

    def _get():
        return (
            db.table("neighborhoods")
            .select("*")
            .eq("id", str(neighborhood_id))
            .eq("is_active", True)
            .maybe_single()
            .execute()
        )

    result = await asyncio.to_thread(_get)
    return result.data if result else None


async def create(db: Client, name: str, city: str, sector_or_area: str | None = None) -> dict:
    """Create a new neighborhood."""
    row = {"name": name, "city": city}
    if sector_or_area:
        row["sector_or_area"] = sector_or_area

    def _create():
        return db.table("neighborhoods").insert(row).execute()

    result = await asyncio.to_thread(_create)
    return result.data[0]

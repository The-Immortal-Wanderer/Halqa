"""Data access for the neighborhoods table."""

import logging
from uuid import UUID

from supabase import Client

logger = logging.getLogger(__name__)


# async def search_by_name(db: Client, query: str, limit: int = 10) -> list[dict]:
#     """Trigram search on neighborhood name. Returns matching neighborhoods."""
#     result = (
#         db.table("neighborhoods")
#         .select("*")
#         .text_search("name", query)
#         .limit(limit)
#         .execute()
#     )
#     return result.data or []


# async def get_by_id(db: Client, neighborhood_id: UUID) -> dict | None:
#     """Fetch a neighborhood by ID. Returns None if not found."""
#     result = (
#         db.table("neighborhoods")
#         .select("*")
#         .eq("id", str(neighborhood_id))
#         .single()
#         .execute()
#     )
#     return result.data if result.data else None


# async def create(db: Client, name: str, city: str, sector_or_area: str | None = None) -> dict:
#     """Create a new neighborhood."""
#     row = {"name": name, "city": city}
#     if sector_or_area:
#         row["sector_or_area"] = sector_or_area
#     result = db.table("neighborhoods").insert(row).execute()
#     return result.data[0]

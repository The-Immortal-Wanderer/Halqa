"""Data access for the worker_listings and worker_reviews tables."""

import logging
from uuid import UUID

from supabase import Client

logger = logging.getLogger(__name__)


# async def get_listing(db: Client, listing_id: UUID, neighborhood_id: UUID) -> dict | None:
#     """Fetch a single worker listing."""
#     result = (
#         db.table("worker_listings")
#         .select("*")
#         .eq("id", str(listing_id))
#         .eq("neighborhood_id", str(neighborhood_id))
#         .single()
#         .execute()
#     )
#     return result.data if result.data else None


# async def list_listings(
#     db: Client,
#     neighborhood_id: UUID,
#     category: str | None = None,
#     limit: int = 20,
#     offset: int = 0,
# ) -> list[dict]:
#     """List worker listings for a neighborhood, optionally filtered by category."""
#     query = (
#         db.table("worker_listings")
#         .select("*")
#         .eq("neighborhood_id", str(neighborhood_id))
#     )
#     if category:
#         query = query.eq("category", category)
#     result = (
#         query
#         .order("is_verified_badge", desc=True)
#         .order("created_at", desc=True)
#         .limit(limit)
#         .offset(offset)
#         .execute()
#     )
#     return result.data or []


# async def create_listing(db: Client, neighborhood_id: UUID, submitted_by: UUID, data: dict) -> dict:
#     """Create a new worker listing."""
#     result = (
#         db.table("worker_listings")
#         .insert({
#             "neighborhood_id": str(neighborhood_id),
#             "submitted_by": str(submitted_by),
#             **data,
#         })
#         .execute()
#     )
#     return result.data[0]


# async def get_review_by_reviewer(db: Client, listing_id: UUID, reviewer_id: UUID) -> dict | None:
#     """Check if a user has already reviewed this listing."""
#     result = (
#         db.table("worker_reviews")
#         .select("*")
#         .eq("listing_id", str(listing_id))
#         .eq("reviewer_id", str(reviewer_id))
#         .single()
#         .execute()
#     )
#     return result.data if result.data else None


# async def create_review(db: Client, listing_id: UUID, reviewer_id: UUID, rating: int, content: str) -> dict:
#     """Insert a new review."""
#     result = (
#         db.table("worker_reviews")
#         .insert({
#             "listing_id": str(listing_id),
#             "reviewer_id": str(reviewer_id),
#             "rating": rating,
#             "review_text": content,
#             "job_confirmed": True,
#         })
#         .execute()
#     )
#     return result.data[0]


# async def compute_listing_stats(db: Client, listing_id: UUID) -> dict:
#     """Compute average rating and review count for a listing."""
#     result = (
#         db.table("worker_reviews")
#         .select("rating", count="exact")
#         .eq("listing_id", str(listing_id))
#         .execute()
#     )
#     ratings = [r["rating"] for r in (result.data or []) if r.get("rating")]
#     avg = sum(ratings) / len(ratings) if ratings else 0.0
#     return {"average_rating": round(avg, 2), "review_count": len(ratings)}


# async def update_listing_stats(db: Client, listing_id: UUID, stats: dict) -> None:
#     """Update a listing's average rating and review count."""
#     db.table("worker_listings").update(stats).eq("id", str(listing_id)).execute()


# async def set_verified_badge(db: Client, listing_id: UUID, badge: bool) -> None:
#     """Set the verified badge on a listing."""
#     db.table("worker_listings").update({"is_verified_badge": badge}).eq("id", str(listing_id)).execute()

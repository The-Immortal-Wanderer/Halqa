"""Data access for worker_listings and worker_reviews.

Aligns to deployed schema column names from migration 20260611_001:
  worker_listings: worker_name, worker_phone, service_type, is_promoted,
    earned_badge, min_completed_jobs, avg_rating, status
  worker_reviews: rating, review_body, is_published, job_confirmed_*
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.db.client import new_thread_safe_client


def count_published_reviews(*, listing_id: UUID) -> int:
    """Count published reviews for a listing."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("worker_reviews")
            .select("id", count="exact")
            .eq("listing_id", str(listing_id))
            .eq("is_published", True)
            .execute()
        )
        return result.count if hasattr(result, "count") and result.count else 0
    finally:
        client.auth.sign_out()


def list_listings(
    *,
    neighborhood_id: UUID,
    service_type: str | None = None,
    limit: int = 20,
) -> list[dict]:
    """List active worker listings ordered by avg_rating DESC."""
    client = new_thread_safe_client()
    try:
        query = (
            client.table("worker_listings")
            .select("*")
            .eq("neighborhood_id", str(neighborhood_id))
            .eq("status", "active")
        )
        if service_type:
            query = query.eq("service_type", service_type)
        result = (
            query.order("avg_rating", desc=True)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    finally:
        client.auth.sign_out()


def get_listing(*, listing_id: UUID) -> dict | None:
    """Fetch a single active worker listing by id."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("worker_listings")
            .select("*")
            .eq("id", str(listing_id))
            .eq("status", "active")
            .maybe_single()
            .execute()
        )
        return result.data if result and result.data else None
    finally:
        client.auth.sign_out()


def create_listing(
    *,
    member_id: UUID,
    neighborhood_id: UUID,
    worker_name: str,
    service_type: str,
    description: str | None = None,
    worker_phone: str | None = None,
) -> dict:
    """Create a new worker listing using deployed schema column names."""
    client = new_thread_safe_client()
    try:
        now = datetime.utcnow().isoformat()
        insert = {
            "created_by_member_id": str(member_id),
            "neighborhood_id": str(neighborhood_id),
            "worker_name": worker_name,
            "service_type": service_type,
            "status": "active",
            "created_at": now,
            "updated_at": now,
        }
        if description is not None:
            insert["description"] = description
        if worker_phone is not None:
            insert["worker_phone"] = worker_phone

        result = (
            client.table("worker_listings").insert(insert).execute()
        )
        if result and result.data and len(result.data) > 0:
            return result.data[0]
        return {}
    finally:
        client.auth.sign_out()


def list_reviews(*, listing_id: UUID, limit: int = 10) -> list[dict]:
    """Return published worker_reviews for a listing, newest first."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("worker_reviews")
            .select("*")
            .eq("listing_id", str(listing_id))
            .eq("is_published", True)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    finally:
        client.auth.sign_out()


def get_review_by_reviewer(
    *, listing_id: UUID, reviewer_member_id: UUID
) -> dict | None:
    """Check if a member has already reviewed this listing."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("worker_reviews")
            .select("*")
            .eq("listing_id", str(listing_id))
            .eq("reviewer_member_id", str(reviewer_member_id))
            .maybe_single()
            .execute()
        )
        return result.data if result and result.data else None
    finally:
        client.auth.sign_out()


def create_review(
    *,
    listing_id: UUID,
    reviewer_member_id: UUID,
    rating: int,
    review_body: str | None = None,
) -> dict:
    """Insert a new review."""
    client = new_thread_safe_client()
    try:
        now = datetime.utcnow().isoformat()
        result = (
            client.table("worker_reviews")
            .insert({
                "listing_id": str(listing_id),
                "reviewer_member_id": str(reviewer_member_id),
                "rating": rating,
                "review_body": review_body or "",
                "created_at": now,
            })
            .execute()
        )
        if result and result.data and len(result.data) > 0:
            return result.data[0]
        return {}
    finally:
        client.auth.sign_out()

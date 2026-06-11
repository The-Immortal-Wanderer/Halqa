"""Data access for verification_records, verification_documents, and tier3_vouching_requests."""

import logging
from uuid import UUID

from supabase import Client

logger = logging.getLogger(__name__)


# async def get_active(db: Client, user_id: UUID, neighborhood_id: UUID) -> dict | None:
#     """Get the current verification record for a user in a neighborhood."""
#     result = (
#         db.table("verification_records")
#         .select("*")
#         .eq("user_id", str(user_id))
#         .eq("neighborhood_id", str(neighborhood_id))
#         .neq("status", "expired")
#         .order("created_at", desc=True)
#         .limit(1)
#         .single()
#         .execute()
#     )
#     return result.data if result.data else None


# async def create_record(db: Client, user_id: UUID, neighborhood_id: UUID, membership_id: UUID, tier_target: int = 2) -> dict:
#     """Create a new verification record."""
#     result = (
#         db.table("verification_records")
#         .insert({
#             "user_id": str(user_id),
#             "neighborhood_id": str(neighborhood_id),
#             "membership_id": str(membership_id),
#             "tier_target": tier_target,
#             "status": "pending",
#         })
#         .execute()
#     )
#     return result.data[0]


# async def set_status(db: Client, record_id: UUID, status: str, rejection_reason: str | None = None) -> None:
#     """Update the verification record status."""
#     update = {"status": status, "decided_at": "now()"}
#     if rejection_reason:
#         update["rejection_reason"] = rejection_reason
#     db.table("verification_records").update(update).eq("id", str(record_id)).execute()


# async def create_document(db: Client, record_id: UUID, document_type: str, storage_path: str) -> dict:
#     """Record a verification document upload."""
#     result = (
#         db.table("verification_documents")
#         .insert({
#             "verification_record_id": str(record_id),
#             "document_type": document_type,
#             "storage_path": storage_path,
#         })
#         .execute()
#     )
#     return result.data[0]


# async def get_tier3_request(db: Client, request_id: UUID) -> dict | None:
#     """Get a Tier 3 vouching request by ID."""
#     result = (
#         db.table("tier3_vouching_requests")
#         .select("*")
#         .eq("id", str(request_id))
#         .single()
#         .execute()
#     )
#     return result.data if result.data else None


# async def create_tier3_request(db: Client, candidate_id: UUID, neighborhood_id: UUID) -> dict:
#     """Create a new Tier 3 vouching request."""
#     result = (
#         db.table("tier3_vouching_requests")
#         .insert({
#             "candidate_user_id": str(candidate_id),
#             "neighborhood_id": str(neighborhood_id),
#         })
#         .execute()
#     )
#     return result.data[0]

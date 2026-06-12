"""Data access for verification_records and verification_documents."""

import asyncio
import logging
from uuid import UUID

from supabase import Client

logger = logging.getLogger(__name__)


async def get_active_record(db: Client, member_id: UUID) -> dict | None:
    """Get the latest pending verification record for a membership."""

    def _fetch():
        return (
            db.table("verification_records")
            .select("*")
            .eq("member_id", str(member_id))
            .eq("status", "pending")
            .order("created_at", desc=True)
            .limit(1)
            .maybe_single()
            .execute()
        )

    result = await asyncio.to_thread(_fetch)
    return result.data if result else None


async def get_latest_record(db: Client, member_id: UUID) -> dict | None:
    """Get the most recent verification record for a membership (any status)."""

    def _fetch():
        return (
            db.table("verification_records")
            .select("*")
            .eq("member_id", str(member_id))
            .order("created_at", desc=True)
            .limit(1)
            .maybe_single()
            .execute()
        )

    result = await asyncio.to_thread(_fetch)
    return result.data if result else None


async def has_approved_record(db: Client, member_id: UUID) -> bool:
    """Check whether this membership already has an approved verification."""

    def _fetch():
        return (
            db.table("verification_records")
            .select("id", count="exact")
            .eq("member_id", str(member_id))
            .eq("status", "approved")
            .limit(1)
            .execute()
        )

    result = await asyncio.to_thread(_fetch)
    return bool(result.data)


async def create_record(
    db: Client,
    member_id: UUID,
    declared_address: str,
    tier_target: int = 2,
) -> dict:
    """Create a new verification record."""

    def _insert():
        return (
            db.table("verification_records")
            .insert({
                "member_id": str(member_id),
                "tier_target": tier_target,
                "status": "pending",
                "declared_address": declared_address,
            })
            .execute()
        )

    result = await asyncio.to_thread(_insert)
    return result.data[0]


def _fresh_pg_headers(settings):
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Prefer": "return=representation",
    }


async def set_approved(
    db: Client,
    record_id: UUID,
    extracted_address: str | None = None,
    ocr_confidence: float | None = None,
) -> None:
    """Mark a verification record as approved."""

    def _update():
        import httpx
        from app.core.config import get_settings

        update = {
            "status": "approved",
            "reviewed_at": "now()",
        }
        if extracted_address is not None:
            update["extracted_address"] = extracted_address
        if ocr_confidence is not None:
            update["ocr_confidence"] = ocr_confidence

        settings = get_settings()
        with httpx.Client() as client:
            response = client.patch(
                f"{settings.supabase_url}/rest/v1/verification_records"
                f"?id=eq.{record_id}",
                json=update,
                headers=_fresh_pg_headers(settings),
            )
            response.raise_for_status()
            data = response.json()
            if not data:
                logger.warning("set_approved: 0 rows updated for %s", record_id)

    await asyncio.to_thread(_update)


async def set_rejected(
    db: Client,
    record_id: UUID,
    rejection_reason: str,
    ocr_confidence: float | None = None,
) -> None:
    """Mark a verification record as rejected."""

    def _update():
        import httpx
        from app.core.config import get_settings

        update = {
            "status": "rejected",
            "rejection_reason": rejection_reason,
            "reviewed_at": "now()",
        }
        if ocr_confidence is not None:
            update["ocr_confidence"] = ocr_confidence

        settings = get_settings()
        with httpx.Client() as client:
            response = client.patch(
                f"{settings.supabase_url}/rest/v1/verification_records"
                f"?id=eq.{record_id}",
                json=update,
                headers=_fresh_pg_headers(settings),
            )
            response.raise_for_status()
            data = response.json()
            if not data:
                logger.warning("set_rejected: 0 rows updated for %s", record_id)

    await asyncio.to_thread(_update)


async def create_document(
    db: Client,
    record_id: UUID,
    storage_path: str,
    document_type: str,
    file_size_bytes: int | None = None,
) -> dict:
    """Record a verification document upload.

    Uses a fresh HTTP client inside the thread to avoid sharing the cached
    ``supabase.Client`` HTTPX session across thread-pool boundaries, which
    can cause PostgREST to return 403 on RLS-protected tables.
    """
    from app.core.config import get_settings

    def _insert():
        import httpx
        settings = get_settings()
        payload = {
            "verification_record_id": str(record_id),
            "storage_path": storage_path,
            "document_type": document_type,
            "file_size_bytes": file_size_bytes,
        }
        headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=representation",
        }
        with httpx.Client() as client:
            response = client.post(
                f"{settings.supabase_url}/rest/v1/verification_documents",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            return response.json()

    result = await asyncio.to_thread(_insert)
    return result[0]


async def get_documents_by_record(db: Client, record_id: UUID) -> list[dict]:
    """Get all documents for a verification record.

    Uses a fresh HTTP client inside the thread to avoid sharing the cached
    ``supabase.Client`` HTTPX session across thread-pool boundaries.
    """

    def _fetch():
        import httpx
        from app.core.config import get_settings

        settings = get_settings()
        headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Accept": "application/json",
        }
        with httpx.Client() as client:
            query = (
                f"{settings.supabase_url}/rest/v1/verification_documents"
                f"?verification_record_id=eq.{record_id}&select=*"
            )
            response = client.get(query, headers=headers)
            response.raise_for_status()
            return response.json()

    return await asyncio.to_thread(_fetch)


async def mark_document_deleted(db: Client, document_id: UUID) -> None:
    """Mark a verification document as deleted from storage.

    Uses a fresh HTTP client inside the thread to avoid sharing the cached
    ``supabase.Client`` HTTPX session across thread-pool boundaries.
    """

    def _update():
        import httpx
        from app.core.config import get_settings

        settings = get_settings()
        headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=minimal",
        }
        payload = {
            "deleted_from_storage_at": "now()",
        }
        with httpx.Client() as client:
            response = client.patch(
                f"{settings.supabase_url}/rest/v1/verification_documents"
                f"?id=eq.{document_id}",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()

    await asyncio.to_thread(_update)

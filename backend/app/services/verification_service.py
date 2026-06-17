"""Verification flow business logic: document upload, OCR, tier upgrade decisions."""

import asyncio
import logging
from uuid import UUID

from app.core.errors import ErrorCode, api_error
from app.repositories import membership_repo, verification_repo
from app.repositories.notification_repo import create_notification
from app.services import storage_service

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


async def submit_document(
    db,
    user_id: UUID,
    document_type: str,
    file_content: bytes,
    file_name: str,
    mime_type: str,
) -> dict:
    """Submit a verification document for processing.

    Steps:
        1. Find the user's active membership
        2. Validate no existing approved or pending verification
        3. Validate file size and MIME type
        4. Create verification_record (status: pending)
        5. Upload file to storage
        6. Create verification_document record
        7. Fire async OCR (fire-and-forget)
        8. Return record summary
    """
    memberships = await membership_repo.get_any_active(db, user_id)
    if not memberships:
        raise api_error(400, ErrorCode.VERIFICATION_REQUIRED, "You must join a neighborhood first")
    membership = memberships[0]
    member_id = UUID(membership["id"])

    has_approved = await verification_repo.has_approved_record(db, member_id)
    if has_approved:
        raise api_error(409, ErrorCode.VERIFICATION_ALREADY_APPROVED, "You are already verified")

    pending = await verification_repo.get_active_record(db, member_id)
    if pending:
        raise api_error(409, ErrorCode.VERIFICATION_PENDING, "You already have a pending verification request")

    if len(file_content) > MAX_FILE_SIZE:
        raise api_error(400, ErrorCode.DOCUMENT_TOO_LARGE, "File size exceeds 10 MB limit")

    if mime_type not in ALLOWED_MIME_TYPES:
        raise api_error(400, ErrorCode.DOCUMENT_TYPE_INVALID, "Only JPEG, PNG, and PDF files are accepted")

    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "bin"

    record = await verification_repo.create_record(
        db,
        member_id,
        declared_address=membership.get("declared_address", ""),
        tier_target=2,
    )
    record_id = UUID(record["id"])

    try:
        storage_path = await storage_service.upload_file(file_content, user_id, record_id, ext)
    except Exception as e:
        logger.exception("Storage upload failed, deleting verification record")
        asyncio.create_task(_delete_record_on_failure(db, record_id))
        raise api_error(500, ErrorCode.OCR_FAILED, f"Failed to upload document: {e}")

    try:
        result = await verification_repo.create_document(
            db, record_id, storage_path, document_type,
            file_size_bytes=len(file_content),
        )
    except Exception as e:
        logger.exception("Document record creation failed, cleaning up")
        asyncio.create_task(_delete_record_on_failure(db, record_id))
        raise api_error(500, ErrorCode.OCR_FAILED, f"Failed to save document reference: {e}")

    declared_address = membership.get("declared_address", "")
    neighborhood_id_raw = membership["neighborhood_id"]
    asyncio.create_task(
        _run_ocr_and_decide(
            db, record_id, storage_path, declared_address,
            user_id, UUID(neighborhood_id_raw),
        )
    )

    return {"verification_record_id": str(record_id), "status": "pending"}


async def get_verification_status(db, user_id: UUID) -> dict:
    """Get the latest verification status for the user's active membership."""
    memberships = await membership_repo.get_any_active(db, user_id)
    if not memberships:
        raise api_error(400, ErrorCode.VERIFICATION_REQUIRED, "You must join a neighborhood first")

    membership = memberships[0]
    member_id = UUID(membership["id"])

    record = await verification_repo.get_latest_record(db, member_id)
    if not record:
        return {"status": None, "rejection_reason": None}

    return {
        "status": record["status"],
        "rejection_reason": record.get("rejection_reason"),
    }


async def upgrade_tier(db, user_id: UUID) -> dict:
    """Upgrade the user's membership to Tier 2 if verification is approved."""
    memberships = await membership_repo.get_any_active(db, user_id)
    if not memberships:
        raise api_error(400, ErrorCode.VERIFICATION_REQUIRED, "You must join a neighborhood first")

    membership = memberships[0]
    member_id = UUID(membership["id"])
    neighborhood_id = UUID(membership["neighborhood_id"])

    record = await verification_repo.get_latest_record(db, member_id)
    if not record or record["status"] != "approved":
        raise api_error(400, ErrorCode.VERIFICATION_PENDING, "Verification is not yet approved")

    result = await membership_repo.upgrade_tier(db, user_id, neighborhood_id, "tier_2")
    if not result:
        raise api_error(500, ErrorCode.VERIFICATION_NOT_FOUND, "Failed to upgrade tier")

    return {"tier": "tier_2"}


async def _run_ocr_and_decide(
    db, record_id: UUID, storage_path: str,
    declared_address: str,
    user_id: UUID, neighborhood_id: UUID,
) -> None:
    """Run OCR and decide the verification outcome (fire-and-forget).

    Uses a fresh thread-safe client (``new_thread_safe_client``) instead of
    the passed-in ``db`` from the endpoint dependency, because the LRU-cached
    ``supabase.Client`` breaks when its HTTPX session is shared across
    ``asyncio.to_thread`` boundaries.
    """
    from app.db.client import new_thread_safe_client
    from app.services import ocr_service

    tdb = new_thread_safe_client()

    try:
        signed_url = await storage_service.get_signed_url(storage_path)
        result = await ocr_service.extract_address(signed_url, declared_address)
    except Exception:
        logger.exception("OCR processing failed for record %s", record_id)
        # Don't leave the record stuck in pending — reject with processing error
        # so the user can see the result and resubmit.
        await verification_repo.set_rejected(
            tdb, record_id, "processing_error", ocr_confidence=0.0,
        )
        await _create_notification(tdb, user_id, neighborhood_id, False, "processing_error")
        return

    confidence = result.get("confidence", 0.0)
    rejection_reason = result.get("rejection_reason")

    if confidence >= 0.75:
        await verification_repo.set_approved(
            tdb, record_id,
            extracted_address=result.get("extracted_address"),
            ocr_confidence=confidence,
        )
        logger.info("Verification %s auto-approved (confidence=%.2f)", record_id, confidence)
        await _delete_documents(tdb, record_id)
        await _create_notification(tdb, user_id, neighborhood_id, True, None)
    elif confidence < 0.40:
        reason = rejection_reason or "address_mismatch"
        await verification_repo.set_rejected(tdb, record_id, reason, ocr_confidence=confidence)
        logger.info("Verification %s auto-rejected (confidence=%.2f)", record_id, confidence)
        await _delete_documents(tdb, record_id)
        await _create_notification(tdb, user_id, neighborhood_id, False, reason)
    else:
        logger.info(
            "Verification %s flagged for manual review (confidence=%.2f)",
            record_id, confidence,
        )


async def _delete_documents(db, record_id: UUID) -> None:
    """Delete verification documents from storage (privacy commitment)."""
    docs = await verification_repo.get_documents_by_record(db, record_id)
    for doc in docs:
        try:
            await storage_service.delete_file(doc["storage_path"])
            await verification_repo.mark_document_deleted(db, UUID(doc["id"]))
        except Exception:
            logger.error("Failed to delete verification document %s", doc["id"])


async def _create_notification(
    db, user_id: UUID, neighborhood_id: UUID,
    is_approved: bool, rejection_reason: str | None,
) -> None:
    """Create a notification record for the verification result."""
    if is_approved:
        await create_notification(
            db, user_id=user_id,
            notification_type="verification_approved",
            title="Address verified",
            body="You're now a verified member of your neighborhood.",
            data={
                "neighborhood_id": str(neighborhood_id),
                "deep_link": (
                    f"halqa://verification/result?status=approved"
                    f"&neighborhood_id={neighborhood_id}"
                ),
            },
            neighborhood_id=neighborhood_id,
        )
    else:
        await create_notification(
            db, user_id=user_id,
            notification_type="verification_rejected",
            title="Verification needs attention",
            body="We couldn't verify your address. Tap to try again.",
            data={
                "neighborhood_id": str(neighborhood_id),
                "rejection_reason": rejection_reason,
                "deep_link": (
                    f"halqa://verification/result?status=rejected"
                    f"&neighborhood_id={neighborhood_id}"
                    f"&reason={rejection_reason or 'address_mismatch'}"
                ),
            },
            neighborhood_id=neighborhood_id,
        )


async def _delete_record_on_failure(db, record_id: UUID) -> None:
    """Delete a verification record if document upload fails."""

    def _delete():
        from app.db.client import new_thread_safe_client
        client = new_thread_safe_client()
        client.table("verification_records").delete().eq("id", str(record_id)).execute()

    await asyncio.to_thread(_delete)

"""Verification flow business logic: document upload, OCR, tier upgrade decisions.

The verification service manages the complete flow from document upload through
OCR processing to tier upgrade or rejection. Document deletion is triggered
automatically after a decision is made (privacy commitment).
"""

import asyncio
import logging
from uuid import UUID

logger = logging.getLogger(__name__)


# async def upload_document(db, storage, user_id: UUID, neighborhood_id: UUID, file, document_type: str, declared_address: str):
#     """Upload a verification document and trigger OCR processing.
#
#     Steps:
#         1. Check current verification status — reject if already approved
#         2. Validate file size (max 10 MB) and MIME type
#         3. Upload to Supabase Storage private bucket
#         4. Create verification_documents record
#         5. Update record status to 'pending'
#         6. Trigger async OCR (fire-and-forget)
#     """
#     from app.repositories import verification_repo
#     from app.services import storage_service
#     from app.schemas.verification import VerificationStatus
#     record = await verification_repo.get_active(db, user_id, neighborhood_id)
#     if record and record["status"] == VerificationStatus.approved.value:
#         raise ...  # VERIFICATION_ALREADY_APPROVED
#     doc = await verification_repo.create_document(db, record["id"], document_type, storage_path)
#     asyncio.create_task(_run_ocr_and_decide(db, storage, record, doc, declared_address))
#     return doc


# async def _run_ocr_and_decide(db, storage, record, doc, declared_address: str):
#     """Run OCR on the uploaded document and decide the verification outcome.
#
#     Decision thresholds:
#     - confidence >= 0.75: auto-approve
#     - 0.40 <= confidence < 0.75: flag for manual review
#     - confidence < 0.40: auto-reject
#     """
    #     from app.services import ocr_service
    #     from app.repositories import verification_repo
    #     signed_url = await storage_service.get_signed_url(doc["storage_path"])
    #     ocr_result = await ocr_service.extract_address(signed_url, declared_address)
#     if ocr_result["confidence"] >= 0.75:
#         await verification_repo.set_status(db, record["id"], "approved")
#         # Trigger document deletion
#         asyncio.create_task(_delete_documents(db, storage, record["id"]))
#     elif ocr_result["confidence"] < 0.40:
#         await verification_repo.set_status(db, record["id"], "rejected", rejection_reason=ocr_result.get("rejection_reason"))
#         asyncio.create_task(_delete_documents(db, storage, record["id"]))
#     # else: stays pending for manual review


# async def _delete_documents(db, storage, verification_record_id: UUID):
#     """Delete verification documents from storage (privacy commitment).
#
#     Retries up to 3 times with exponential backoff.
#     Logs failures as compliance issues.
#     """
#     from app.repositories import verification_repo
#     docs = await verification_repo.get_documents_to_delete(db, verification_record_id)
#     for doc in docs:
#         try:
#             await storage_service.delete_file(doc["storage_path"])
#             await verification_repo.mark_document_deleted(db, doc["id"])
#         except Exception as e:
#             logger.error(f"Failed to delete verification document {doc['id']}: {e}")

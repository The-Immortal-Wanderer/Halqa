"""Verification flow endpoints: submit, status, tier upgrade."""

from fastapi import APIRouter, Depends, File, Form, UploadFile
from supabase import Client

from app.core.auth import get_current_user
from app.core.errors import ErrorCode, api_error
from app.db.dependencies import get_db
from app.schemas.common import APIResponse, AuthUser
from app.services import verification_service

router = APIRouter()


@router.post("/verification/submit")
async def submit_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    current_user: AuthUser = Depends(get_current_user),
    db: Client = Depends(get_db),
) -> APIResponse:
    """Upload a verification document for processing.

    Accepts JPEG, PNG, and PDF files up to 10 MB.
    Returns immediately — OCR runs asynchronously.
    """
    content = await file.read()
    result = await verification_service.submit_document(
        db,
        current_user.id,
        document_type,
        content,
        file.filename or "upload",
        file.content_type or "application/octet-stream",
    )
    return APIResponse.ok(result)


@router.get("/verification/status")
async def get_status(
    current_user: AuthUser = Depends(get_current_user),
    db: Client = Depends(get_db),
) -> APIResponse:
    """Get the current verification status for the user's active membership."""
    result = await verification_service.get_verification_status(db, current_user.id)
    return APIResponse.ok(result)


@router.patch("/verification/upgrade-tier")
async def upgrade_tier(
    current_user: AuthUser = Depends(get_current_user),
    db: Client = Depends(get_db),
) -> APIResponse:
    """Upgrade the user's membership to Tier 2 if verification approved.

    Must be called explicitly after the user sees the approved status
    (e.g., via the deep-link landing page) to perform the actual tier
    upgrade.
    """
    result = await verification_service.upgrade_tier(db, current_user.id)
    return APIResponse.ok(result)

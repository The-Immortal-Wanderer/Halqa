"""Verification flow request/response schemas."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import APIResponse


class VerificationStatusResponse(BaseModel):
    """Current verification record for the user's membership."""

    id: UUID
    membership_id: UUID
    tier_target: int  # 2 | 3
    status: str  # pending | approved | rejected | expired
    submitted_at: Optional[str] = None
    decided_at: Optional[str] = None
    rejection_reason: Optional[str] = None


class VerificationDocumentResponse(BaseModel):
    """Result of a document upload."""

    id: UUID
    document_type: str
    status: str  # pending | approved | rejected


class VerificationResultResponse(BaseModel):
    """Polled by the frontend after deep-link navigation from notification."""

    status: str
    tier: Optional[int] = None
    rejection_reason: Optional[str] = None


class Tier3VouchingRequest(BaseModel):
    """Tier 3 vouching request details."""

    id: UUID
    candidate_user_id: UUID
    candidate_display_name: str
    neighborhood_id: UUID
    anchor_signed: bool = False
    anchor_signed_at: Optional[str] = None
    cosigner_signed: bool = False
    cosigner_signed_at: Optional[str] = None
    status: str  # pending | approved | rejected | expired
    approved_at: Optional[str] = None
    expires_at: str
    created_at: str


class VerificationDocumentUpload(BaseModel):
    """Metadata for requesting a signed upload URL."""

    document_type: str
    file_name: str
    mime_type: str
    file_size_bytes: int


class SignedUploadResponse(BaseModel):
    """Response containing the signed upload URL."""

    document_id: UUID
    upload_url: str
    storage_path: str


# Type aliases
VerificationStatusAPIResponse = APIResponse[VerificationStatusResponse]
VerificationDocumentAPIResponse = APIResponse[VerificationDocumentResponse]
VerificationResultAPIResponse = APIResponse[VerificationResultResponse]
Tier3VouchingAPIResponse = APIResponse[Tier3VouchingRequest]
Tier3VouchingListAPIResponse = APIResponse[list[Tier3VouchingRequest]]
SignedUploadAPIResponse = APIResponse[SignedUploadResponse]

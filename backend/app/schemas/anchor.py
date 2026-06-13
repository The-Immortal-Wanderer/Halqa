"""Pydantic schemas for the Anchor role & moderation feature."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ── Request schemas ─────────────────────────────────────────────────────────

class ReportPostRequest(BaseModel):
    """Schema for a member reporting a post."""
    reason: str = Field(..., min_length=1, max_length=300)


class InitiateVouchingRequest(BaseModel):
    """Schema for an anchor initiating a vouching request."""
    candidate_member_id: UUID


class PostRemoveRequest(BaseModel):
    """Schema for anchor removing a post."""
    reason: str = Field("", max_length=300)


# ── Response schemas ────────────────────────────────────────────────────────

class AnchorStatus(BaseModel):
    """Whether the current user is the active anchor for a neighborhood."""
    is_anchor: bool = False
    anchor_role_id: UUID | None = None
    member_id: UUID | None = None
    neighborhood_id: UUID | None = None
    term_started_at: datetime | None = None
    term_ends_at: datetime | None = None


class PostPreview(BaseModel):
    """Minimal post preview for the moderation queue."""
    id: UUID
    body: str
    category: str
    is_emergency: bool
    author_display_name: str | None = None
    author_member_id: UUID | None = None
    created_at: datetime


class ModerationItem(BaseModel):
    """A single item in the anchor's moderation queue."""
    id: UUID
    post: PostPreview
    reporter_member_id: UUID
    reporter_display_name: str | None = None
    reason: str
    status: str
    created_at: datetime


class VouchingRequestItem(BaseModel):
    """A vouching request in the anchor's pending list."""
    id: UUID
    candidate_member_id: UUID
    candidate_display_name: str | None = None
    initiated_by_anchor_id: UUID
    cosigner_member_id: UUID | None = None
    cosigner_display_name: str | None = None
    anchor_signed_at: datetime
    cosigner_signed_at: datetime | None = None
    is_completed: bool
    is_rejected: bool
    rejection_reason: str | None = None
    created_at: datetime
    expires_at: datetime


class VouchingRequestCreated(BaseModel):
    """Returned after successfully creating a vouching request."""
    request_id: UUID
    candidate_member_id: UUID
    expires_at: datetime


class EscalationItem(BaseModel):
    """An anchor action escalation (read-only status display)."""
    id: UUID
    anchor_action_id: UUID
    action_type: str
    action_summary: str | None = None
    status: str
    flagged_by_count: int
    threshold_member_count: int
    created_at: datetime


class AuditEntry(BaseModel):
    """A single entry in the anchor's audit log."""
    id: UUID
    action_type: str
    target_post_id: UUID | None = None
    target_member_id: UUID | None = None
    metadata: dict | None = None
    created_at: datetime


class ReportCreated(BaseModel):
    """Returned after successfully reporting a post."""
    report_id: UUID
    status: str = "open"

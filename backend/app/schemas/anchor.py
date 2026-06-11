"""Anchor moderation request/response schemas."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import APIResponse
from app.schemas.post import PostResponse
from app.schemas.verification import Tier3VouchingRequest


class AnchorQueueResponse(BaseModel):
    """Anchor's moderation dashboard data."""

    pending_vouch_requests: list[Tier3VouchingRequest] = []
    flagged_posts: list[PostResponse] = []
    total_pending: int = 0


class AnchorActionLogEntry(BaseModel):
    """A single entry in the anchor's action log."""

    id: UUID
    action_type: str
    target_type: str  # post | user | verification_request
    target_id: UUID
    reason: Optional[str] = None
    created_at: str


class ClassificationOverride(BaseModel):
    """Body for overriding a post's AI classification."""

    ai_classification: str  # emergency | community | general
    is_emergency: bool


class AnchorPostRemoval(BaseModel):
    """Body for removing a post (soft-delete)."""

    reason: str = Field(..., min_length=1, max_length=200)


# Type aliases
AnchorQueueAPIResponse = APIResponse[AnchorQueueResponse]
AnchorActionLogAPIResponse = APIResponse[list[AnchorActionLogEntry]]
AnchorRemovalAPIResponse = APIResponse[dict]

"""Post (feed) request/response schemas."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import APIResponse


class PostResponse(BaseModel):
    """A single post in the neighborhood feed."""

    id: UUID
    neighborhood_id: UUID
    author_id: UUID
    author_display_name: str
    content: str
    category: str
    ai_classification: Optional[str] = None
    is_emergency: bool = False
    is_pinned: bool = False
    is_resolved: bool = False
    resolved_at: Optional[str] = None
    language_detected: Optional[str] = None
    flag_count: int = 0
    created_at: str
    updated_at: str


class PostCreate(BaseModel):
    """Body for creating a new post."""

    content: str = Field(..., min_length=2, max_length=1000)
    category: str  # PostCategory — validated at the service/runtime level


class PostListResponse(BaseModel):
    """Paginated response wrapper for the feed."""

    posts: list[PostResponse]
    has_more: bool = False
    next_cursor: Optional[str] = None


class FlagCreate(BaseModel):
    """Body for flagging a post."""

    flag_type: str
    reason: Optional[str] = Field(None, max_length=300)


class ClassificationResult(BaseModel):
    """Result of AI classification (returned by internal endpoint)."""

    post_id: UUID
    classification: str  # emergency | community | general
    confidence: float
    language_detected: str


# Type aliases
PostAPIResponse = APIResponse[PostResponse]
PostListAPIResponse = APIResponse[PostListResponse]
FlagAPIResponse = APIResponse[dict]
ClassificationAPIResponse = APIResponse[ClassificationResult]

"""Post (feed) request/response schemas.

All models mirror the actual posts table in Supabase:
- body (text), not "content"
- author_member_id (FK to neighborhood_members), not author_id
- ai_confidence (numeric(4,3)) as classification_confidence in API
- ai_civic_signal for structured civic summary
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import APIResponse


class AuthorInfo(BaseModel):
    """Nested author information from users + membership join."""

    id: UUID  # users.id
    display_name: str
    tier: str  # tier_1 | tier_2 | tier_3


class PostResponse(BaseModel):
    """A single post in the neighborhood feed."""

    id: UUID
    neighborhood_id: UUID
    author_member_id: UUID
    author: AuthorInfo
    body: str
    body_language: str = "en"
    category: str
    is_emergency: bool = False
    ai_confidence: Optional[float] = None
    classification_confidence: Optional[float] = None
    ai_civic_signal: Optional[str] = None
    is_pinned: bool = False
    is_resolved: bool = False
    resolved_at: Optional[str] = None
    created_at: str
    updated_at: str


class PostCreate(BaseModel):
    """Body for creating a new post."""

    body: str = Field(..., min_length=3, max_length=500)
    category: str  # post_category enum — validated at service level
    is_emergency: bool = False


class PostListResponse(BaseModel):
    """Paginated response wrapper for the feed."""

    posts: list[PostResponse]
    has_more: bool = False


class ClassificationResult(BaseModel):
    """Result from AI post classification."""

    post_id: UUID
    category: str
    ai_confidence: Optional[float] = None
    ai_civic_signal: Optional[str] = None


# Type aliases
PostAPIResponse = APIResponse[PostResponse]
PostListAPIResponse = APIResponse[PostListResponse]
FlagAPIResponse = APIResponse[dict]

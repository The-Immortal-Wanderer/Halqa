"""Feed and post management endpoints.

All endpoints use the standard ``APIResponse`` envelope.
Authentication is required on all endpoints.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.params import Path

from app.core.auth import get_current_member, require_tier
from app.core.errors import ErrorCode, api_error
from app.db.dependencies import get_db
from app.schemas.common import AuthMember
from app.schemas.post import PostCreate, PostListAPIResponse, PostAPIResponse
from app.services import post_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/neighborhoods/{neighborhood_id}/posts/{post_id}")
async def get_post(
    neighborhood_id: UUID = Path(...),
    post_id: UUID = Path(...),
    member=Depends(get_current_member),
    db=Depends(get_db),
) -> PostAPIResponse:
    """Get a single post by ID with author info.

    Returns 404 if the post does not exist or belongs to a different
    neighborhood.
    """
    result = await post_service.get_post(db, post_id, neighborhood_id)
    return PostAPIResponse.ok(data=result)


@router.get("/neighborhoods/{neighborhood_id}/posts")
async def list_posts(
    neighborhood_id: UUID = Path(...),
    category: str | None = Query(None, description="Filter by category"),
    emergency_only: bool = Query(False, description="Show only emergency posts"),
    limit: int = Query(20, ge=1, le=100, description="Max posts to return"),
    member: AuthMember = Depends(get_current_member),
    db=Depends(get_db),
) -> PostListAPIResponse:
    """Get the neighborhood feed with optional filters.

    Ordered by: emergency first, then unresolved, then newest.
    """
    result = await post_service.get_feed(
        db, neighborhood_id,
        category=category,
        emergency_only=emergency_only,
        limit=limit,
    )
    return PostListAPIResponse.ok(data=result)


@router.post("/neighborhoods/{neighborhood_id}/posts")
async def create_post(
    neighborhood_id: UUID = Path(...),
    body: PostCreate = ...,
    member: AuthMember = Depends(require_tier(2)),
    db=Depends(get_db),
) -> PostAPIResponse:
    """Create a new post in the neighborhood feed.

    Requires Tier 2 (verified) membership.
    AI classification runs asynchronously — the post is returned immediately.
    """
    post = await post_service.create_post(
        db, member, neighborhood_id,
        body=body.body,
        category=body.category,
        is_emergency=body.is_emergency,
    )
    return PostAPIResponse.ok(data=post)


@router.patch("/neighborhoods/{neighborhood_id}/posts/{post_id}/resolve")
async def resolve_post(
    neighborhood_id: UUID = Path(...),
    post_id: UUID = Path(...),
    member: AuthMember = Depends(get_current_member),
    db=Depends(get_db),
) -> PostAPIResponse:
    """Mark a post as resolved.

    Only the post author or the neighborhood anchor can resolve a post.
    """
    post = await post_service.resolve_post(
        db, post_id, neighborhood_id, member,
    )
    return PostAPIResponse.ok(data=post)

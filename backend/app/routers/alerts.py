"""Emergency alerts endpoints.

Returns only posts where ``is_emergency=true``.
Unresolved alerts first, newest first within each group.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.params import Path

from app.core.auth import get_current_member
from app.db.dependencies import get_db
from app.schemas.common import AuthMember
from app.schemas.post import PostListAPIResponse
from app.services import post_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/neighborhoods/{neighborhood_id}/alerts")
async def list_alerts(
    neighborhood_id: UUID = Path(...),
    limit: int = Query(10, ge=1, le=100, description="Max alerts to return"),
    include_resolved: bool = Query(False, description="Include resolved alerts"),
    member: AuthMember = Depends(get_current_member),
    db=Depends(get_db),
) -> PostListAPIResponse:
    """Get emergency alerts for the neighborhood.

    Returns only posts where ``is_emergency=true``.
    Unresolved alerts are returned first, then newest first within each group.
    """
    result = await post_service.get_feed(
        db, neighborhood_id,
        emergency_only=True,
        include_resolved=include_resolved,
        limit=limit,
    )
    return PostListAPIResponse.ok(data=result)

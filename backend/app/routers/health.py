"""Health check endpoint. No authentication required.

Used by Render for health checks and by frontend to verify API availability.
"""

from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.common import APIResponse

router = APIRouter()


@router.get("/health")
async def health_check():
    """Return API health status.

    Returns ``{"data": {"status": "ok", "environment": "..."}, "error": null}``.
    No authentication required.
    """
    settings = get_settings()
    return APIResponse.ok(
        data={"status": "ok", "environment": settings.environment}
    )

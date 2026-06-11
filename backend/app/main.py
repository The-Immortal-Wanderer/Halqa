"""Halqa FastAPI application factory.

Usage::

    uvicorn app.main:app --reload --port 8000
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.routers import (
    alerts,
    anchor,
    dashboard,
    health,
    internal,
    members,
    neighborhoods,
    posts,
    users,
    verification,
    workers,
)

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    Call this from the module level to produce the ASGI app object consumed
    by uvicorn::

        app = create_app()
    """
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title="Halqa API",
        version="1.0.0",
        docs_url="/docs" if settings.environment == "development" else None,
        redoc_url=None,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    # Routers
    app.include_router(health.router)
    app.include_router(users.router, prefix="/api/v1")
    app.include_router(neighborhoods.router, prefix="/api/v1")
    app.include_router(members.router, prefix="/api/v1")
    app.include_router(verification.router, prefix="/api/v1")
    app.include_router(posts.router, prefix="/api/v1")
    app.include_router(alerts.router, prefix="/api/v1")
    app.include_router(dashboard.router, prefix="/api/v1")
    app.include_router(workers.router, prefix="/api/v1")
    app.include_router(anchor.router, prefix="/api/v1")
    app.include_router(internal.router, prefix="/internal")

    logger.info("Halqa API application created (environment=%s)", settings.environment)
    return app


app = create_app()

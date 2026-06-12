"""Authentication endpoints: register, login, refresh.

Users authenticate via email and password.
Supabase Auth handles credential verification; this router manages
the session lifecycle and user profile creation.
"""

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, EmailStr
from supabase import Client

from app.core.errors import ErrorCode, api_error
from app.db.dependencies import get_db
from app.schemas.common import APIResponse
from app.services.user_service import get_or_create_user_profile

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Request Models ─────────────────────────────────────────────


class RegisterRequest(BaseModel):
    """Create a new Supabase Auth user and profile."""

    email: EmailStr
    password: str = Field(..., min_length=6)
    display_name: str = Field(..., min_length=2, max_length=60)


class LoginRequest(BaseModel):
    """Authenticate with email and password."""

    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    """Exchange a refresh token for a new session."""

    refresh_token: str


# ─── Endpoints ──────────────────────────────────────────────────


@router.post("/auth/register")
async def register(
    body: RegisterRequest,
    db: Client = Depends(get_db),
) -> APIResponse[dict[str, Any]]:
    """Register a new user.

    Creates a Supabase Auth user (email + password) and a corresponding
    profile row in the ``users`` table.
    """
    try:
        result = db.auth.admin.create_user(
            {
                "email": body.email,
                "password": body.password,
                "email_confirm": True,
            }
        )
    except Exception as exc:
        err_str = str(exc).lower()
        if "already exists" in err_str or "duplicate" in err_str or "already been registered" in err_str:
            raise api_error(
                409,
                ErrorCode.USER_ALREADY_EXISTS,
                "A user with this email already exists",
            )
        logger.exception("Supabase create_user failed")
        raise api_error(
            503,
            ErrorCode.SERVICE_UNAVAILABLE,
            "Unable to create account. Please try again later.",
        )

    try:
        auth_uid = UUID(result.user.id)
        user = await get_or_create_user_profile(
            db, auth_uid, body.display_name
        )
    except Exception as exc:
        logger.exception("Profile creation failed")
        raise api_error(500, ErrorCode.INTERNAL_SERVER_ERROR, str(exc))

    return APIResponse.ok(
        data={
            "user_id": str(user["id"]),
            "display_name": user["display_name"],
        }
    )


@router.post("/auth/login")
async def login(
    body: LoginRequest,
    db: Client = Depends(get_db),
) -> APIResponse[dict[str, Any]]:
    """Authenticate and return session tokens."""
    try:
        result = db.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception:
        raise api_error(
            401,
            ErrorCode.INVALID_CREDENTIALS,
            "Invalid email or password",
        )

    # result + session non-None here — exception raised on failure
    assert result is not None and result.session is not None and result.user is not None
    return APIResponse.ok(
        data={
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
            "user_id": result.user.id,
        }
    )


@router.post("/auth/refresh")
async def refresh(
    body: RefreshRequest,
    db: Client = Depends(get_db),
) -> APIResponse[dict[str, Any]]:
    """Refresh an expired access token."""
    try:
        result = db.auth.refresh_session(body.refresh_token)
    except Exception:
        raise api_error(
            401,
            ErrorCode.INVALID_CREDENTIALS,
            "Invalid or expired refresh token",
        )

    assert result is not None and result.session is not None
    return APIResponse.ok(
        data={
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
        }
    )

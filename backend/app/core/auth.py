"""JWT validation and FastAPI dependency injection for auth.

All protected endpoints use the dependency functions defined here.
The user_id is always extracted from the validated JWT — never from the request body.
"""

from uuid import UUID

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import get_settings
from app.core.errors import ErrorCode, api_error
from app.db.dependencies import get_db
from app.repositories import anchor_repo, membership_repo, user_repo
from app.schemas.common import AuthAnchor, AuthMember, AuthUser

security = HTTPBearer()


def verify_supabase_jwt(token: str) -> dict:
    """Validate a Supabase JWT and return the decoded payload.

    Uses HS256 with the configured JWT secret. The ``aud`` claim must be
    ``"authenticated"`` — this is what Supabase Auth sets on issued tokens.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except JWTError:
        raise api_error(401, ErrorCode.UNAUTHORIZED, "Invalid or expired token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db),
) -> AuthUser:
    """Extract the authenticated user from the Bearer token.

    Verifies the JWT, looks up the user in the database, and returns an
    ``AuthUser`` dataclass. Raises 401 if the token is invalid or the user
    has been soft-deleted.
    """
    payload = verify_supabase_jwt(credentials.credentials)
    user_id = UUID(payload["sub"])
    user = await user_repo.get_by_id(db, user_id)
    if not user or getattr(user, "deleted_at", None):
        raise api_error(401, ErrorCode.UNAUTHORIZED, "User account not found")
    return AuthUser(id=user_id, display_name=user.display_name)


async def get_current_member(
    neighborhood_id: UUID,
    current_user: AuthUser = Depends(get_current_user),
    db=Depends(get_db),
) -> AuthMember:
    """Require the user to be an active member of the given neighborhood.

    Returns an ``AuthMember`` with membership and tier information.
    Raises 403 if the user is not a member.
    """
    membership = await membership_repo.get_active(db, current_user.id, neighborhood_id)
    if not membership:
        raise api_error(403, ErrorCode.NOT_A_MEMBER, "You are not a member of this neighborhood")
    return AuthMember(user=current_user, membership=membership, tier=getattr(membership, "tier", 1))


def require_tier(min_tier: int):
    """Factory for tier-gated dependencies.

    Usage in router::

        @router.post("/posts")
        async def create_post(
            member: AuthMember = Depends(require_tier(2)),
            ...
        ):
    """

    async def _dependency(member: AuthMember = Depends(get_current_member)) -> AuthMember:
        if member.tier < min_tier:
            raise api_error(
                403,
                ErrorCode.TIER_INSUFFICIENT,
                f"This action requires tier {min_tier} verification",
            )
        return member

    return _dependency


async def get_current_anchor(
    neighborhood_id: UUID,
    member: AuthMember = Depends(get_current_member),
    db=Depends(get_db),
) -> AuthAnchor:
    """Require the user to be the active anchor of the given neighborhood.

    Raises 403 if the user is not the anchor.
    """
    anchor = await anchor_repo.get_active(db, member.user.id, neighborhood_id)
    if not anchor:
        raise api_error(403, ErrorCode.NOT_ANCHOR, "You are not the anchor of this neighborhood")
    return AuthAnchor(member=member, anchor_role=anchor)


async def require_internal_token(request: Request) -> None:
    """Validate the ``X-Service-Token`` header for ``/internal/*`` endpoints.

    This uses the service token, not a user JWT. Called by Supabase Edge
    Functions or scheduled background tasks.
    """
    settings = get_settings()
    token = request.headers.get("X-Service-Token")
    if token != settings.internal_service_token:
        raise api_error(401, ErrorCode.UNAUTHORIZED, "Invalid service token")

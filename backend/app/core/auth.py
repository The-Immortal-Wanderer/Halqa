"""JWT validation and FastAPI dependency injection for auth.

All protected endpoints use the dependency functions defined here.
The user_id is always extracted from the validated JWT — never from the request body.

Supabase Auth issues ES256-signed JWTs. Tokens are verified by calling the
GoTrue ``/auth/v1/user`` endpoint rather than decoding locally. This avoids
the complexity of JWKS key rotation and works regardless of the signing
algorithm (HS256 vs ES256).
"""

from uuid import UUID

import httpx
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings
from app.core.errors import ErrorCode, api_error
from app.db.dependencies import get_db
from app.repositories import anchor_repo, membership_repo, user_repo
from app.schemas.common import AuthAnchor, AuthMember, AuthUser

security = HTTPBearer()


async def verify_supabase_jwt(token: str) -> dict:
    """Validate a Supabase JWT via the GoTrue user endpoint.

    Calls ``GET /auth/v1/user`` with the Bearer token. This is the most
    reliable verification method — it works regardless of signing algorithm
    (HS256 or ES256) and avoids manual JWKS key management.
    """
    settings = get_settings()
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.supabase_anon_key,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers=headers,
        )
    if resp.status_code != 200:
        raise api_error(401, ErrorCode.UNAUTHORIZED, "Invalid or expired token")
    return resp.json()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db),
) -> AuthUser:
    """Extract the authenticated user from the Bearer token.

    Verifies the JWT via GoTrue, looks up the user in the database, and
    returns an ``AuthUser`` dataclass. Raises 401 if the token is invalid
    or the user has been soft-deleted / doesn't exist.
    """
    user_data = await verify_supabase_jwt(credentials.credentials)
    user_id = UUID(user_data["id"])
    user = await user_repo.get_by_id(db, user_id)
    if not user:
        raise api_error(401, ErrorCode.UNAUTHORIZED, "User account not found")
    return AuthUser(id=user_id, display_name=user["display_name"])


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

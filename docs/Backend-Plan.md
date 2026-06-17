# Backend-Plan.md — Halqa FastAPI Backend

**Version:** 1.0
**Date:** June 2026
**Stack:** Python 3.11+, FastAPI, Supabase (service role), Gemini API
**Hosting:** Render (free tier for prototype)

Read ARCHITECTURE.md for API contract, authentication flow, and shared type
definitions before working on any endpoint. Read Database-Schema.md for all
table definitions, constraints, and RLS policies before any repository work.

---

## 1. Project Structure

```
backend/
├── app/
│   ├── main.py                    ← FastAPI app factory, CORS, routers mounted
│   ├── core/
│   │   ├── config.py              ← Settings (pydantic-settings, env vars)
│   │   ├── auth.py                ← JWT validation, get_current_user dependencies
│   │   ├── errors.py              ← All error codes and HTTPException helpers
│   │   ├── logging.py             ← Structured logging configuration
│   │   └── rate_limit.py          ← Rate limiting middleware (slowapi)
│   ├── db/
│   │   ├── client.py              ← Supabase client singleton (service role)
│   │   └── dependencies.py        ← FastAPI Depends() for DB injection
│   ├── routers/
│   │   ├── health.py              ← GET /health (unauthenticated)
│   │   ├── users.py               ← User profile endpoints
│   │   ├── neighborhoods.py       ← Neighborhood search and management
│   │   ├── members.py             ← Membership join, tier, status
│   │   ├── verification.py        ← Verification flow endpoints
│   │   ├── posts.py               ← Feed, post creation, resolution
│   │   ├── alerts.py              ← Alert-specific queries
│   │   ├── dashboard.py           ← Civic dashboard data
│   │   ├── workers.py             ← Worker listings and reviews
│   │   ├── anchor.py              ← Anchor moderation tools
│   │   └── internal.py            ← /internal/* (service token protected)
│   ├── services/
│   │   ├── user_service.py
│   │   ├── neighborhood_service.py
│   │   ├── membership_service.py
│   │   ├── verification_service.py
│   │   ├── post_service.py
│   │   ├── classification_service.py   ← AI classification (Gemini API)
│   │   ├── dashboard_service.py
│   │   ├── worker_service.py
│   │   ├── anchor_service.py
│   │   ├── notification_service.py     ← Web Push delivery
│   │   ├── ocr_service.py              ← Gemini Vision OCR for verification documents
│   │   └── storage_service.py          ← Supabase Storage operations
│   ├── repositories/
│   │   ├── user_repo.py
│   │   ├── neighborhood_repo.py
│   │   ├── membership_repo.py
│   │   ├── verification_repo.py
│   │   ├── post_repo.py
│   │   ├── dashboard_repo.py
│   │   ├── worker_repo.py
│   │   ├── anchor_repo.py
│   │   └── notification_repo.py        ← push_subscriptions table access
│   └── schemas/
│       ├── user.py
│       ├── neighborhood.py
│       ├── membership.py
│       ├── verification.py
│       ├── post.py
│       ├── dashboard.py
│       ├── worker.py
│       ├── anchor.py
│       └── common.py                   ← APIResponse wrapper, shared enums
├── tests/
│   ├── conftest.py                ← Test fixtures, test Supabase client
│   ├── test_auth.py
│   ├── test_verification.py
│   ├── test_posts.py
│   ├── test_classification.py
│   └── test_dashboard.py
├── requirements.txt
├── requirements-dev.txt
├── .env.example
└── render.yaml                    ← Render deployment config
```

---

## 2. Core Configuration

### 2.1 `app/core/config.py`

```python
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Literal

class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str  # Service role key — bypasses RLS, never expose to frontend

    # Gemini
    gemini_api_key: str

    # Web Push (VAPID)
    vapid_public_key: str
    vapid_private_key: str
    vapid_email: str

    # Internal service token
    internal_service_token: str

    # App config
    environment: Literal["development", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    allowed_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

### 2.2 `app/core/errors.py`

```python
from fastapi import HTTPException

# All error codes used across the application.
# When adding a new error, add the code here first.

class ErrorCode:
    # Auth
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"

    # User
    USER_NOT_FOUND = "USER_NOT_FOUND"
    USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS"
    DISPLAY_NAME_TOO_SHORT = "DISPLAY_NAME_TOO_SHORT"

    # Neighborhood
    NEIGHBORHOOD_NOT_FOUND = "NEIGHBORHOOD_NOT_FOUND"
    NEIGHBORHOOD_SEARCH_REQUIRED = "NEIGHBORHOOD_SEARCH_REQUIRED"

    # Membership
    ALREADY_A_MEMBER = "ALREADY_A_MEMBER"
    NOT_A_MEMBER = "NOT_A_MEMBER"
    TIER_INSUFFICIENT = "TIER_INSUFFICIENT"
    ONE_NEIGHBORHOOD_LIMIT = "ONE_NEIGHBORHOOD_LIMIT"

    # Verification
    VERIFICATION_PENDING = "VERIFICATION_PENDING"
    VERIFICATION_ALREADY_APPROVED = "VERIFICATION_ALREADY_APPROVED"
    VERIFICATION_NOT_FOUND = "VERIFICATION_NOT_FOUND"
    DOCUMENT_TOO_LARGE = "DOCUMENT_TOO_LARGE"
    DOCUMENT_TYPE_INVALID = "DOCUMENT_TYPE_INVALID"
    OCR_FAILED = "OCR_FAILED"

    # Posts
    POST_NOT_FOUND = "POST_NOT_FOUND"
    POST_AUTHOR_REQUIRED = "POST_AUTHOR_REQUIRED"
    ALREADY_RESOLVED = "ALREADY_RESOLVED"
    RESOLVE_PERMISSION_DENIED = "RESOLVE_PERMISSION_DENIED"
    CONTENT_TOO_LONG = "CONTENT_TOO_LONG"

    # Anchor
    NOT_ANCHOR = "NOT_ANCHOR"
    ANCHOR_CANNOT_SELF_VOUCH = "ANCHOR_CANNOT_SELF_VOUCH"
    VOUCHING_REQUIRES_TWO_SIGNERS = "VOUCHING_REQUIRES_TWO_SIGNERS"
    ANCHOR_TERM_EXPIRED = "ANCHOR_TERM_EXPIRED"

    # Worker
    WORKER_NOT_FOUND = "WORKER_NOT_FOUND"
    JOB_NOT_CONFIRMED = "JOB_NOT_CONFIRMED"
    REVIEW_ALREADY_EXISTS = "REVIEW_ALREADY_EXISTS"

    # Rate limit
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"

    # Internal
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"


def api_error(status_code: int, code: str, message: str) -> HTTPException:
    """Return a consistently-shaped HTTPException."""
    return HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message}
    )
```

### 2.3 `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.routers import (
    health, users, neighborhoods, members,
    verification, posts, alerts, dashboard,
    workers, anchor, internal
)

def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title="Halqa API",
        version="1.0.0",
        docs_url="/docs" if settings.environment == "development" else None,
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    # Mount routers
    app.include_router(health.router)
    app.include_router(users.router,          prefix="/api/v1")
    app.include_router(neighborhoods.router,  prefix="/api/v1")
    app.include_router(members.router,        prefix="/api/v1")
    app.include_router(verification.router,   prefix="/api/v1")
    app.include_router(posts.router,          prefix="/api/v1")
    app.include_router(alerts.router,         prefix="/api/v1")
    app.include_router(dashboard.router,      prefix="/api/v1")
    app.include_router(workers.router,        prefix="/api/v1")
    app.include_router(anchor.router,         prefix="/api/v1")
    app.include_router(internal.router,       prefix="/internal")

    return app

app = create_app()
```

---

## 3. Database Client

### 3.1 `app/db/client.py`

```python
from supabase import create_client, Client
from app.core.config import get_settings
from functools import lru_cache

@lru_cache()
def get_supabase_client() -> Client:
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key  # Service role — bypasses RLS
    )
```

### 3.2 `app/db/dependencies.py`

```python
from supabase import Client
from app.db.client import get_supabase_client
from fastapi import Depends

def get_db() -> Client:
    return get_supabase_client()
```

All repositories receive the Supabase client via `Depends(get_db)`. Repositories
never instantiate the client themselves. No business logic touches the client
directly — only repositories do.

---

## 4. Authentication

### 4.1 JWT Validation (`app/core/auth.py`)

```python
import httpx
from uuid import UUID
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import get_settings
from app.core.errors import api_error, ErrorCode
from app.db.dependencies import get_db
from app.repositories import user_repo, membership_repo, anchor_repo
from app.schemas.common import AuthUser, AuthMember, AuthAnchor

security = HTTPBearer()

async def verify_supabase_jwt(token: str) -> dict:
    """Validate a Supabase JWT via the GoTrue user endpoint.
    
    Calls GET /auth/v1/user with the Bearer token. This is the most
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
    db = Depends(get_db)
) -> AuthUser:
    payload = verify_supabase_jwt(credentials.credentials)
    user_id = UUID(payload["sub"])
    user = await user_repo.get_by_id(db, user_id)
    if not user or user.deleted_at:
        raise api_error(401, ErrorCode.UNAUTHORIZED, "User account not found")
    return AuthUser(id=user_id, display_name=user.display_name)


async def get_current_member(
    neighborhood_id: UUID,
    current_user: AuthUser = Depends(get_current_user),
    db = Depends(get_db)
) -> AuthMember:
    membership = await membership_repo.get_active(db, current_user.id, neighborhood_id)
    if not membership:
        raise api_error(403, ErrorCode.NOT_A_MEMBER, "You are not a member of this neighborhood")
    return AuthMember(user=current_user, membership=membership, tier=membership.tier)


def require_tier(min_tier: int):
    async def _dependency(member: AuthMember = Depends(get_current_member)) -> AuthMember:
        if member.tier < min_tier:
            raise api_error(403, ErrorCode.TIER_INSUFFICIENT,
                          f"This action requires tier {min_tier} verification")
        return member
    return _dependency


async def get_current_anchor(
    neighborhood_id: UUID,
    member: AuthMember = Depends(get_current_member),
    db = Depends(get_db)
) -> AuthAnchor:
    anchor = await anchor_repo.get_active(db, member.user.id, neighborhood_id)
    if not anchor:
        raise api_error(403, ErrorCode.NOT_ANCHOR, "You are not the anchor of this neighborhood")
    return AuthAnchor(member=member, anchor_role=anchor)


def require_internal_token(token: str = Depends(...)):
    """For /internal/* endpoints — verifies the service token, not a user JWT."""
    settings = get_settings()
    if token != settings.internal_service_token:
        raise api_error(401, ErrorCode.UNAUTHORIZED, "Invalid service token")
```

---

## 5. Schemas (Pydantic)

### 5.1 `app/schemas/common.py`

```python
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional
from uuid import UUID
from dataclasses import dataclass

T = TypeVar("T")

class APIResponse(BaseModel, Generic[T]):
    """Standard response envelope. Every endpoint returns this."""
    data: Optional[T] = None
    error: Optional[dict] = None

    @classmethod
    def ok(cls, data: T) -> "APIResponse[T]":
        return cls(data=data, error=None)

    @classmethod
    def err(cls, code: str, message: str) -> "APIResponse":
        return cls(data=None, error={"code": code, "message": message})


@dataclass
class AuthUser:
    id: UUID
    display_name: str

@dataclass
class AuthMember:
    user: AuthUser
    membership: object   # NeighborhoodMembership domain model
    tier: int

@dataclass
class AuthAnchor:
    member: AuthMember
    anchor_role: object  # AnchorRole domain model
```

### 5.2 Schema conventions

All request schemas end in `Create`, `Update`, or `Request`:
- `PostCreate` — body for creating a post
- `VerificationDocumentUpload` — body for uploading a document
- `AnchorVouchRequest` — body for a Tier 3 vouch action

All response schemas end in `Response` or match the entity name:
- `PostResponse` — the shape returned from the posts endpoint
- `DashboardResponse` — dashboard aggregate data

Enums mirror the TypeScript types in ARCHITECTURE.md Section 4:
```python
from enum import Enum

class PostCategory(str, Enum):
    power = "power"
    security = "security"
    infrastructure = "infrastructure"
    water = "water"
    general = "general"

class AIClassification(str, Enum):
    emergency = "emergency"
    community = "community"
    general = "general"

class VerificationStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    expired = "expired"

class DocumentType(str, Enum):
    utility_bill = "utility_bill"
    rental_agreement = "rental_agreement"
    society_card = "society_card"
    delivery_confirmation = "delivery_confirmation"
    other = "other"

class RejectionReason(str, Enum):
    address_mismatch = "address_mismatch"
    document_unreadable = "document_unreadable"
    name_not_found = "name_not_found"
    document_type_invalid = "document_type_invalid"

class WorkerCategory(str, Enum):
    electrician = "electrician"
    plumber = "plumber"
    maid = "maid"
    cook = "cook"
    driver = "driver"
    other = "other"

class AnchorActionType(str, Enum):
    post_removed = "post_removed"
    post_classification_overridden = "post_classification_overridden"
    tier3_vouched = "tier3_vouched"
    tier3_cosigned = "tier3_cosigned"
    member_flagged = "member_flagged"
    escalation_reviewed = "escalation_reviewed"
```

---

## 6. Routers

Each router file contains only route definitions — HTTP method, path, dependencies,
and a single call to the relevant service. No business logic in routers.

### 6.1 Health (`app/routers/health.py`)

```python
GET  /health
     → 200 {"status": "ok", "environment": "production"}
     No auth required. Used by Render health checks.
```

### 6.2 Users (`app/routers/users.py`)

```python
GET  /users/me
     Auth: get_current_user
     → APIResponse[UserResponse]
     Returns the authenticated user's profile.

PATCH /users/me
      Auth: get_current_user
      Body: UserUpdate { display_name?: str }
      → APIResponse[UserResponse]
      Updates display_name only. Other fields are not user-editable.

POST /users/push-subscription
     Auth: get_current_user
     Body: PushSubscriptionCreate { endpoint: str, keys: { p256dh: str, auth: str } }
     → APIResponse[{ subscribed: bool }]
     Stores Web Push subscription for this user+device combination.
     Upserts — if a subscription for this endpoint already exists, updates it.

DELETE /users/push-subscription
       Auth: get_current_user
       Body: { endpoint: str }
       → APIResponse[{ unsubscribed: bool }]
       Removes a push subscription. Called when user opts out of notifications.
```

### 6.3 Neighborhoods (`app/routers/neighborhoods.py`)

```python
GET  /neighborhoods/search?q={query}&limit={limit}
     Auth: get_current_user
     Query params: q (string, min 2 chars), limit (int, default 10, max 20)
     → APIResponse[List[NeighborhoodSearchResult]]
     Trigram search on neighborhood name. Returns name, city, sector,
     member_count, total_member_count. Does not return neighborhoods the
     user is already a member of (filtered in service).

GET  /neighborhoods/{neighborhood_id}
     Auth: get_current_user
     → APIResponse[Neighborhood]
     Full neighborhood details. Any authenticated user can view.
```

### 6.4 Members (`app/routers/members.py`)

```python
POST /neighborhoods/{neighborhood_id}/join
     Auth: get_current_user
     Body: (none — user self-identified via JWT)
     → APIResponse[NeighborhoodMembership]
     Creates a Tier 1 membership. Enforces the one-neighborhood-per-user
     rule (service layer). Creates a verification_record for this membership.
     Fails with ALREADY_A_MEMBER if active membership exists.
     Fails with ONE_NEIGHBORHOOD_LIMIT if user has any other active membership.

GET  /neighborhoods/{neighborhood_id}/members/me
     Auth: get_current_member
     → APIResponse[MembershipDetail]
     Returns the current user's membership including tier, join date,
     and current verification status.

GET  /neighborhoods/{neighborhood_id}/members
     Auth: get_current_anchor (neighborhood_id)
     → APIResponse[List[MemberSummary]]
     Returns all active members for the anchor's management view.
     Includes: user_id, display_name, tier, joined_at.
     Does NOT include addresses. Paginated (default 50 per page).
```

### 6.5 Verification (`app/routers/verification.py`)

```python
GET  /neighborhoods/{neighborhood_id}/verification/status
     Auth: get_current_member
     → APIResponse[VerificationStatusResponse]
     Returns the current verification record for the user's membership:
     status, tier, submitted_at, decided_at, rejection_reason (if any).

POST /neighborhoods/{neighborhood_id}/verification/documents
     Auth: get_current_member
     Content-Type: multipart/form-data
     Form fields:
       file: UploadFile (JPEG, PNG, or PDF, max 10MB)
       document_type: DocumentType
       declared_address: str (the address the user claims to live at)
     → APIResponse[VerificationDocumentResponse]
     Uploads a verification document. Triggers async OCR + classification.
     The declared_address is stored in verification_records only, not
     returned in any user-facing response. Document upload is only permitted
     if current verification status is 'pending' or 'rejected'.

GET  /neighborhoods/{neighborhood_id}/verification/result
     Auth: get_current_member
     → APIResponse[VerificationResultResponse]
     Polled by the frontend deep-link handler after notification tap.
     Returns: status, tier (if approved), rejection_reason (if rejected).

POST /neighborhoods/{neighborhood_id}/verification/tier3/request
     Auth: require_tier(2) (for the neighborhood)
     Body: (none — user requests vouching for themselves)
     → APIResponse[Tier3VouchingRequest]
     Creates a Tier 3 vouching request for the current user.
     The anchor and one other Tier 2+ member must co-sign.
     Fails if a pending request already exists for this user.
```

### 6.6 Posts (`app/routers/posts.py`)

```python
GET  /neighborhoods/{neighborhood_id}/posts
     Auth: get_current_member (any tier — Tier 1 can read)
     Query: limit (default 30, max 50), before_id (cursor pagination)
     → APIResponse[PostListResponse]
     Returns posts for the neighborhood feed. Ordered: emergency (is_emergency=true,
     is_resolved=false) first, then by created_at DESC. Soft-deleted excluded.

POST /neighborhoods/{neighborhood_id}/posts
     Auth: require_tier(2)
     Body: PostCreate { content: str (max 1000 chars), category: PostCategory }
     → APIResponse[PostResponse]
     Creates a post. After creation, triggers async AI classification.
     Sets author_id from JWT (never from body).

GET  /neighborhoods/{neighborhood_id}/posts/{post_id}
     Auth: get_current_member
     → APIResponse[PostResponse]

PATCH /neighborhoods/{neighborhood_id}/posts/{post_id}/resolve
      Auth: get_current_member (must be author OR anchor)
      Body: (none)
      → APIResponse[PostResponse]
      Marks a post as resolved. Sets is_resolved=true, resolved_at=now().
      Once resolved, cannot be un-resolved except by original author or anchor.
      Fails with ALREADY_RESOLVED if already resolved.

POST /neighborhoods/{neighborhood_id}/posts/{post_id}/flags
     Auth: require_tier(2)
     Body: FlagCreate { flag_type: FlagType, reason?: str }
     → APIResponse[{ flagged: bool }]
     Creates a post flag for review. A post with 3+ flags from distinct
     Tier 2+ members is auto-escalated to the anchor's moderation queue.
```

### 6.7 Alerts (`app/routers/alerts.py`)

```python
GET  /neighborhoods/{neighborhood_id}/alerts
     Auth: get_current_member
     Query: limit (default 10), include_resolved (bool, default false)
     → APIResponse[List[PostResponse]]
     Returns only posts where is_emergency=true. Unresolved first.
     This is the alerts tab data source — not the full feed.
```

### 6.8 Dashboard (`app/routers/dashboard.py`)

```python
GET  /neighborhoods/{neighborhood_id}/dashboard
     Auth: require_tier(2)
     Query: period_days (7 | 30 | 90, default 30)
     → APIResponse[DashboardResponse]
     Returns the latest pre-computed civic dashboard snapshot for the
     neighborhood and period. If no snapshot exists (new neighborhood),
     triggers an on-demand compute and returns the result.

GET  /neighborhoods/{neighborhood_id}/dashboard/export
     Auth: require_tier(2)
     Query: period_days (7 | 30 | 90, default 30)
     → APIResponse[DashboardExportResponse]
     Returns a pre-formatted plain-text export of the dashboard data,
     ready to copy and share with a utility provider or union council.
     (See ARCHITECTURE.md Section 5.9 for the exact text format.)
```

### 6.9 Workers (`app/routers/workers.py`)

```python
GET  /neighborhoods/{neighborhood_id}/workers
     Auth: get_current_member
     Query: category? (WorkerCategory), limit (default 20), offset (int)
     → APIResponse[WorkerListResponse]
     Returns worker listings for the neighborhood. Tier 1: no contact_info.
     Tier 2+: full listing including contact_info. Verified-badge workers first.

GET  /neighborhoods/{neighborhood_id}/workers/{listing_id}
     Auth: get_current_member
     → APIResponse[WorkerListingResponse]
     Single worker listing detail. Tier-gated contact_info as above.

POST /neighborhoods/{neighborhood_id}/workers
     Auth: require_tier(2)
     Body: WorkerListingCreate {
       worker_name: str, category: WorkerCategory,
       contact_info: str (phone or note), description?: str
     }
     → APIResponse[WorkerListingResponse]
     Creates a worker listing. recommended_by is set to the current user.

POST /neighborhoods/{neighborhood_id}/workers/{listing_id}/reviews
     Auth: require_tier(2)
     Body: WorkerReviewCreate { rating: int (1-5), content: str, job_confirmed: bool }
     → APIResponse[WorkerReviewResponse]
     Creates a review. job_confirmed must be true — client enforces this.
     Fails with JOB_NOT_CONFIRMED if job_confirmed is false (extra server guard).
     Fails with REVIEW_ALREADY_EXISTS if this user already reviewed this listing.
     After creation, recomputes the listing's average rating and review count,
     then checks if the verified badge criteria are now met.
```

### 6.10 Anchor (`app/routers/anchor.py`)

```python
GET  /neighborhoods/{neighborhood_id}/anchor/queue
     Auth: get_current_anchor
     → APIResponse[AnchorQueueResponse]
     Returns: pending Tier 3 vouch requests, flagged posts awaiting review,
     escalated moderation decisions. This is the anchor's dashboard.

DELETE /neighborhoods/{neighborhood_id}/anchor/posts/{post_id}
       Auth: get_current_anchor
       Body: AnchorPostRemoval { reason: str }
       → APIResponse[{ removed: bool }]
       Soft-deletes the post (sets deleted_at). Logs the action to
       anchor_actions_log with action_type='post_removed' and the reason.
       Does NOT remove the author's membership — anchor cannot do that.

PATCH  /neighborhoods/{neighborhood_id}/anchor/posts/{post_id}/classification
       Auth: get_current_anchor
       Body: ClassificationOverride { ai_classification: AIClassification,
                                      is_emergency: bool }
       → APIResponse[PostResponse]
       Allows the anchor to override the AI classification on a post.
       Logs to anchor_actions_log with action_type='post_classification_overridden'.

POST   /neighborhoods/{neighborhood_id}/anchor/tier3/{request_id}/vouch
       Auth: get_current_anchor
       Body: (none — anchor's presence is the vouch)
       → APIResponse[Tier3VouchingRequest]
       Records the anchor's co-signature on a Tier 3 request.
       Fails if the request is for the anchor themselves (ANCHOR_CANNOT_SELF_VOUCH).
       Does NOT complete Tier 3 — a second non-anchor Tier 2+ member must also sign.

POST   /neighborhoods/{neighborhood_id}/anchor/tier3/{request_id}/cosign
       Auth: require_tier(2) (any Tier 2+ member who is not the anchor and not the applicant)
       Body: (none)
       → APIResponse[Tier3VouchingRequest]
       Records the second co-signature. When both signatures exist, the service
       upgrades the applicant's membership tier to 3.
       Fails if anchor has not yet vouched (VOUCHING_REQUIRES_TWO_SIGNERS).

GET    /neighborhoods/{neighborhood_id}/anchor/log
       Auth: get_current_anchor
       Query: limit (default 50), offset (int)
       → APIResponse[List[AnchorActionLogEntry]]
       Returns the anchor's own action log (for self-review).
       The full log is accessible only to the platform service role.
```

### 6.11 Internal (`app/routers/internal.py`)

```python
# Protected by INTERNAL_SERVICE_TOKEN header, not user JWT.
# Called by Supabase Edge Functions or scheduled background tasks.

POST /internal/classify
     Header: X-Service-Token: {INTERNAL_SERVICE_TOKEN}
     Body: ClassifyRequest { post_id: UUID, content: str, category: PostCategory }
     → APIResponse[ClassificationResult]
     Classifies a post and writes the result back to the posts table.
     Triggers a push notification if classification is 'emergency'.

POST /internal/dashboard/snapshot
     Header: X-Service-Token: {INTERNAL_SERVICE_TOKEN}
     Body: SnapshotRequest { neighborhood_id: UUID, period_days: int }
     → APIResponse[{ snapshot_id: UUID }]
     Computes and stores a civic dashboard snapshot for the given period.

POST /internal/verification/ocr
     Header: X-Service-Token: {INTERNAL_SERVICE_TOKEN}
     Body: OCRRequest { verification_record_id: UUID, document_id: UUID,
                        signed_url: str, declared_address: str }
     → APIResponse[OCRResult]
     Runs OCR on a verification document and returns structured output.
     Does NOT update verification status — that decision is made by the
     verification service after reviewing the OCR result.
```

---

## 7. Services

### 7.1 Classification Service (`app/services/classification_service.py`)

This is the most important service in the backend. It is called after every
post is created and its output determines whether an emergency notification
fires. The prompt must handle Pakistani mixed-language content.

```python
from google import genai
from app.core.config import get_settings
from app.schemas.post import PostCategory, AIClassification

CLASSIFICATION_PROMPT = """
You are an AI assistant for Halqa, a neighborhood coordination platform in Pakistan.
Your task is to classify a community post into one of three categories:

- "emergency": Requires immediate neighbor attention. Examples: power outage (bijli gai),
  robbery or theft (chori), fire (aag), medical emergency, dangerous gas leak, flooding,
  suspicious armed individual, crime in progress.

- "community": Neighborhood coordination that is important but not urgent. Examples:
  scheduled water shutdown, road maintenance, community meeting, lost pet, delivery
  collection request, general safety notice, service worker recommendation.

- "general": Everyday neighborhood conversation. Examples: greetings, casual questions,
  lost and found (non-urgent), food recommendations, general chit-chat.

The post may be written in English, Urdu (Arabic script), Roman Urdu (Urdu words
written in Latin letters), or a mix of these. Common Pakistani terms for emergencies:
- bijli gai / bijli nahi / load shedding = power outage (can be emergency if transformer
  failure, not emergency if routine load shedding)
- chori / daaka / robber = theft/robbery (always emergency)
- aag / fire = fire (always emergency)
- LESCO / IESCO / KESC / WAPDA = electricity providers (context determines urgency)
- pani nahi = no water (community unless flood-related)

The post's declared category is provided as additional context. A post declared as
"security" or "power" is more likely to be an emergency.

Respond with ONLY a valid JSON object, no other text:
{
  "ai_classification": "emergency" | "community" | "general",
  "is_emergency": true | false,
  "language_detected": "en" | "ur" | "mixed",
  "confidence": 0.0 to 1.0
}

"is_emergency" must be true if and only if ai_classification is "emergency".
"""

async def classify_post(
    content: str,
    category: PostCategory
) -> dict:
    """
    Classifies a post using the Gemini API.
    Returns classification result dict.
    Never raises — returns a safe fallback on any API error.
    """
    settings = get_settings()
    client = genai.Client(api_key=settings.gemini_api_key)

    user_message = f"Post category declared by author: {category.value}\n\nPost content:\n{content}"

    try:
        response = await client.messages.create(
            model="gemma-4-31b-it",
            max_tokens=200,
            system=CLASSIFICATION_PROMPT,
            messages=[{"role": "user", "content": user_message}]
        )
        raw = response.content[0].text
        import json
        result = json.loads(raw)
        # Validate required fields
        assert result["ai_classification"] in ("emergency", "community", "general")
        assert isinstance(result["is_emergency"], bool)
        assert result["language_detected"] in ("en", "ur", "mixed")
        return result
    except Exception as e:
        # Log the error but never fail the post creation
        import logging
        logging.getLogger(__name__).error(f"Classification failed: {e}")
        return {
            "ai_classification": "general",
            "is_emergency": False,
            "language_detected": "mixed",
            "confidence": 0.0
        }
```

### 7.2 Post Service (`app/services/post_service.py`)

```python
# Post creation flow (simplified):
async def create_post(db, post_data: PostCreate, author_id: UUID) -> Post:
    # 1. Validate content length (max 1000 chars)
    # 2. Create post in DB via post_repo (classification fields null initially)
    # 3. Trigger async classification — fire and forget (do not await)
    #    asyncio.create_task(classify_and_update(post.id, post_data.content, post_data.category))
    # 4. Return the post immediately (classification applied asynchronously)
    ...

async def classify_and_update(db, post_id: UUID, content: str, category: PostCategory):
    # 1. Call classification_service.classify_post()
    # 2. Update post with classification result via post_repo
    # 3. If is_emergency=True, call notification_service.send_emergency_alert()
    ...

async def resolve_post(db, post_id: UUID, neighborhood_id: UUID, requester_id: UUID) -> Post:
    post = await post_repo.get_by_id(db, post_id, neighborhood_id)
    if not post:
        raise api_error(404, ErrorCode.POST_NOT_FOUND, "Post not found")
    if post.is_resolved:
        raise api_error(409, ErrorCode.ALREADY_RESOLVED, "This post is already resolved")
    # Check: requester is author OR is the anchor
    is_author = post.author_id == requester_id
    is_anchor_of_neighborhood = await anchor_repo.is_active_anchor(db, requester_id, neighborhood_id)
    if not (is_author or is_anchor_of_neighborhood):
        raise api_error(403, ErrorCode.RESOLVE_PERMISSION_DENIED,
                       "Only the post author or the neighborhood anchor can resolve this post")
    return await post_repo.mark_resolved(db, post_id)
```

### 7.3 Verification Service (`app/services/verification_service.py`)

```python
# Document upload and OCR flow:
async def upload_document(
    db, storage,
    user_id: UUID, neighborhood_id: UUID,
    file: UploadFile, document_type: DocumentType,
    declared_address: str
) -> VerificationDocumentResponse:
    # 1. Check current verification status — reject if already approved
    record = await verification_repo.get_active(db, user_id, neighborhood_id)
    if record.status == VerificationStatus.approved:
        raise api_error(409, ErrorCode.VERIFICATION_ALREADY_APPROVED,
                       "Your address is already verified")
    # 2. Validate file size (max 10MB) and MIME type
    # 3. Upload to Supabase Storage private bucket
    #    path: {user_id}/{record.id}/{document_id}.{ext}
    storage_path = await storage_service.upload_verification_doc(file, user_id, record.id)
    # 4. Create verification_documents record
    doc = await verification_repo.create_document(db, record.id, document_type, storage_path)
    # 5. Update record status to 'pending' if not already
    await verification_repo.set_status(db, record.id, VerificationStatus.pending)
    # 6. Trigger async OCR — fire and forget
    asyncio.create_task(run_ocr_and_decide(db, storage, record, doc, declared_address))
    return VerificationDocumentResponse(id=doc.id, document_type=document_type, status="pending")


async def run_ocr_and_decide(db, storage, record, doc, declared_address: str):
    # 1. Generate signed URL for the uploaded document (1 hour expiry)
    signed_url = await storage_service.get_signed_url(doc.storage_path)
    # 2. Call OCR service (Gemini vision)
    ocr_result = await ocr_service.extract_address(signed_url, declared_address)
    # 3. Apply decision logic:
    #    - confidence >= 0.75: auto-approve → set status='approved', upgrade tier to 2
    #    - 0.40 <= confidence < 0.75: flag for manual review (status stays 'pending',
    #                                  set needs_manual_review=true)
    #    - confidence < 0.40: auto-reject → set status='rejected' with rejection_reason
    # 4. On approved or rejected: trigger document deletion (privacy commitment)
    #    asyncio.create_task(delete_verification_documents(db, storage, record.id))
    # 5. Send push notification to user (approved or rejected)
    #    await notification_service.send_verification_result(user_id, status, neighborhood_id)
    ...


async def delete_verification_documents(db, storage, verification_record_id: UUID):
    # 1. Retrieve all documents for this record where deleted_from_storage_at IS NULL
    docs = await verification_repo.get_documents_to_delete(db, verification_record_id)
    # 2. For each document: delete from Supabase Storage with retry (max 3, exponential backoff)
    # 3. On success: set deleted_from_storage_at = now()
    # 4. Log any failures — these are compliance failures, not just errors
    ...
```

### 7.4 OCR Service

```python
# app/services/ocr_service.py
DOCUMENT_OCR_PROMPT = """
You are extracting address and name information from a Pakistani verification document.
The document may be a utility bill (LESCO, IESCO, SNGPL, KESC, SSGCL), a rental
agreement, a housing society membership card, or a courier delivery confirmation.

The user claims their address is: {declared_address}

Extract from the document:
1. The name appearing on the document
2. The address appearing on the document
3. Whether the document address matches the declared address (considering that
   Pakistani addresses may use abbreviated forms, different transliterations,
   or omit minor components like apartment numbers)

Respond ONLY with valid JSON:
{
  "name_found": "name from document or null",
  "address_found": "address from document or null",
  "address_matches": true | false,
  "confidence": 0.0 to 1.0,
  "rejection_reason": null | "address_mismatch" | "name_not_found" | "document_unreadable"
}

confidence: 1.0 = certain match, 0.75 = likely match, 0.40 = unclear, 0.0 = no match
If the document is unreadable (blurry, wrong format, not a document), set confidence=0.0
and rejection_reason="document_unreadable".
"""

async def extract_address(signed_url: str, declared_address: str) -> dict:
    client = genai.Client(api_key=get_settings().gemini_api_key)
    prompt = DOCUMENT_OCR_PROMPT.format(declared_address=declared_address)

    try:
        response = await client.messages.create(
            model="gemma-4-31b-it",
            max_tokens=300,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "url", "url": signed_url}
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }]
        )
        return json.loads(response.content[0].text)
    except Exception as e:
        logging.getLogger(__name__).error(f"OCR failed: {e}")
        return {"confidence": 0.0, "rejection_reason": "document_unreadable"}
```

### 7.5 Dashboard Service (`app/services/dashboard_service.py`)

```python
async def get_or_compute_snapshot(
    db, neighborhood_id: UUID, period_days: int
) -> DashboardSnapshot:
    # 1. Check for an existing snapshot from today
    snapshot = await dashboard_repo.get_latest(db, neighborhood_id, period_days)
    if snapshot:
        return snapshot
    # 2. No snapshot — compute on demand
    return await compute_snapshot(db, neighborhood_id, period_days)


async def compute_snapshot(db, neighborhood_id: UUID, period_days: int) -> DashboardSnapshot:
    from_date = datetime.utcnow() - timedelta(days=period_days)
    # Query posts table for the period
    posts = await post_repo.get_for_dashboard(db, neighborhood_id, from_date)

    counts = {
        "total_posts": len(posts),
        "emergency_count": sum(1 for p in posts if p.is_emergency),
        "resolved_count": sum(1 for p in posts if p.is_resolved),
        "power_count": sum(1 for p in posts if p.category == "power"),
        "security_count": sum(1 for p in posts if p.category == "security"),
        "infrastructure_count": sum(1 for p in posts if p.category == "infrastructure"),
        "water_count": sum(1 for p in posts if p.category == "water"),
        "general_count": sum(1 for p in posts if p.category == "general"),
    }

    # Store the snapshot
    snapshot = await dashboard_repo.create_snapshot(db, neighborhood_id, period_days, counts)
    return snapshot


def format_dashboard_export(snapshot: DashboardSnapshot, neighborhood: Neighborhood) -> str:
    """
    Returns the pre-formatted export text ready to copy and share
    with a utility provider or union council.
    See ARCHITECTURE.md Section 5.9 for the exact format.
    """
    period_label = {7: "past 7 days", 30: "past 30 days", 90: "past 3 months"}
    lines = [
        f"Halqa Neighborhood Report — {neighborhood.name}",
        f"Period: {period_label[snapshot.period_days]}",
        f"Generated: {snapshot.snapshot_date.strftime('%d %B %Y')}",
        "",
        f"Total community posts: {snapshot.total_posts}",
        f"Emergency alerts: {snapshot.emergency_count} ({snapshot.resolved_count} resolved)",
        "",
        "Breakdown by category:",
        f"  Power/Electricity: {snapshot.power_count}",
        f"  Security:          {snapshot.security_count}",
        f"  Infrastructure:    {snapshot.infrastructure_count}",
        f"  Water:             {snapshot.water_count}",
        f"  General:           {snapshot.general_count}",
        "",
        "This report was generated by verified residents of the above neighborhood",
        "using the Halqa community coordination platform.",
        "For more information: hello@halqa.pk",
    ]
    return "\n".join(lines)
```

### 7.6 Notification Service (`app/services/notification_service.py`)

```python
from pywebpush import webpush, WebPushException
import json

async def send_emergency_alert(db, neighborhood_id: UUID, post: Post):
    """
    Sends a Web Push notification to all Tier 2+ members of the neighborhood
    except the post author.
    """
    subscriptions = await notification_repo.get_neighborhood_subscriptions(
        db, neighborhood_id, exclude_user_id=post.author_id, min_tier=2
    )
    settings = get_settings()
    category_labels = {
        "power": "Power", "security": "Security",
        "infrastructure": "Infrastructure", "water": "Water", "general": "Alert"
    }
    notification_data = {
        "type": "emergency_alert",
        "title": f"⚠ {category_labels.get(post.category, 'Alert')} — {post.neighborhood_name}",
        "body": post.content[:120],
        "data": {
            "post_id": str(post.id),
            "neighborhood_id": str(neighborhood_id),
            "deep_link": f"halqa://feed/{neighborhood_id}/post/{post.id}"
        }
    }
    for subscription in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth}
                },
                data=json.dumps(notification_data),
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": settings.vapid_email}
            )
        except WebPushException as e:
            if e.response and e.response.status_code == 410:
                # Subscription expired — remove it
                await notification_repo.delete_subscription(db, subscription.id)
            else:
                logging.getLogger(__name__).error(f"Push failed: {e}")


async def send_verification_result(db, user_id: UUID, status: str, neighborhood_id: UUID,
                                    verification_record_id: UUID, rejection_reason: str = None):
    subscriptions = await notification_repo.get_user_subscriptions(db, user_id)
    if status == "approved":
        notification_data = {
            "type": "verification_approved",
            "title": "Address verified",
            "body": "You're now a verified member of your neighborhood.",
            "data": {
                "neighborhood_id": str(neighborhood_id),
                "deep_link": f"halqa://verification/result?status=approved&neighborhood_id={neighborhood_id}"
            }
        }
    else:
        notification_data = {
            "type": "verification_rejected",
            "title": "Verification needs attention",
            "body": "We couldn't verify your address. Tap to try again.",
            "data": {
                "verification_record_id": str(verification_record_id),
                "rejection_reason": rejection_reason,
                "deep_link": f"halqa://verification/result?status=rejected&record_id={verification_record_id}"
            }
        }
    for subscription in subscriptions:
        # Same send logic as emergency alert — omitted for brevity
        ...
```

### 7.7 Anchor Service (`app/services/anchor_service.py`)

```python
async def remove_post(db, anchor_id: UUID, neighborhood_id: UUID,
                      post_id: UUID, reason: str) -> Post:
    # 1. Get post — verify it belongs to this neighborhood
    post = await post_repo.get_by_id(db, post_id, neighborhood_id)
    if not post:
        raise api_error(404, ErrorCode.POST_NOT_FOUND, "Post not found")
    # 2. Soft delete the post
    await post_repo.soft_delete(db, post_id)
    # 3. Log the action — non-negotiable
    await anchor_repo.log_action(db, anchor_id=anchor_id,
        neighborhood_id=neighborhood_id, action_type=AnchorActionType.post_removed,
        target_id=post_id, details={"reason": reason})
    return post


async def complete_tier3_vouching(db, request_id: UUID, neighborhood_id: UUID) -> None:
    """
    Called when both co-signatures are present. Upgrades the applicant to Tier 3.
    """
    request = await verification_repo.get_tier3_request(db, request_id)
    if not (request.anchor_signed_at and request.cosigner_signed_at):
        # This should not be called unless both are present — guard anyway
        return
    # Upgrade membership tier
    await membership_repo.upgrade_tier(db, request.applicant_id, neighborhood_id, new_tier=3)
    # Mark request as completed
    await verification_repo.complete_tier3_request(db, request_id)
    # Log both vouch actions
    await anchor_repo.log_action(db, anchor_id=request.anchor_id,
        neighborhood_id=neighborhood_id, action_type=AnchorActionType.tier3_vouched,
        target_id=request.applicant_id)
```

### 7.8 Worker Service (`app/services/worker_service.py`)

```python
VERIFIED_BADGE_MIN_JOBS = 5
VERIFIED_BADGE_MIN_RATING = 4.0

async def create_review(db, listing_id: UUID, reviewer_id: UUID,
                        rating: int, content: str) -> WorkerReview:
    # 1. Check for duplicate review
    existing = await worker_repo.get_review_by_reviewer(db, listing_id, reviewer_id)
    if existing:
        raise api_error(409, ErrorCode.REVIEW_ALREADY_EXISTS,
                       "You have already reviewed this worker")
    # 2. Create review
    review = await worker_repo.create_review(db, listing_id, reviewer_id, rating, content)
    # 3. Recompute average rating and review count on the listing
    stats = await worker_repo.compute_listing_stats(db, listing_id)
    await worker_repo.update_listing_stats(db, listing_id, stats)
    # 4. Check badge eligibility
    if stats.review_count >= VERIFIED_BADGE_MIN_JOBS and stats.average_rating >= VERIFIED_BADGE_MIN_RATING:
        await worker_repo.set_verified_badge(db, listing_id, True)
    return review
```

---

## 8. Repository Pattern

Each repository contains only data access logic — no business decisions.
All methods are async. All methods accept `db: Client` as the first argument.

### 8.1 Repository conventions

```python
# app/repositories/post_repo.py — example

from supabase import Client
from uuid import UUID
from app.schemas.post import Post

async def get_by_id(db: Client, post_id: UUID, neighborhood_id: UUID) -> Post | None:
    result = (
        db.table("posts")
        .select("*, users(display_name)")
        .eq("id", str(post_id))
        .eq("neighborhood_id", str(neighborhood_id))
        .is_("deleted_at", "null")
        .single()
        .execute()
    )
    if not result.data:
        return None
    return _map_to_post(result.data)


async def get_feed(db: Client, neighborhood_id: UUID,
                   limit: int = 30, before_id: UUID | None = None) -> list[Post]:
    query = (
        db.table("posts")
        .select("*, users(display_name)")
        .eq("neighborhood_id", str(neighborhood_id))
        .is_("deleted_at", "null")
        .limit(limit)
    )
    if before_id:
        # Cursor pagination: posts created before the cursor post
        cursor_post = await get_by_id(db, before_id, neighborhood_id)
        if cursor_post:
            query = query.lt("created_at", cursor_post.created_at)
    # Emergency unresolved posts first, then chronological
    query = (
        query
        .order("is_emergency", desc=True)
        .order("is_resolved", desc=False)
        .order("created_at", desc=True)
    )
    result = query.execute()
    return [_map_to_post(row) for row in (result.data or [])]


async def soft_delete(db: Client, post_id: UUID) -> None:
    db.table("posts").update({"deleted_at": "now()"}).eq("id", str(post_id)).execute()


async def mark_resolved(db: Client, post_id: UUID) -> Post:
    result = (
        db.table("posts")
        .update({"is_resolved": True, "resolved_at": "now()"})
        .eq("id", str(post_id))
        .select("*, users(display_name)")
        .single()
        .execute()
    )
    return _map_to_post(result.data)


def _map_to_post(row: dict) -> Post:
    """Maps a raw Supabase row (with joined users) to the Post domain model."""
    return Post(
        id=row["id"],
        neighborhood_id=row["neighborhood_id"],
        author_id=row["author_id"],
        author_display_name=row.get("users", {}).get("display_name", ""),
        content=row["content"],
        category=row["category"],
        ai_classification=row.get("ai_classification"),
        is_emergency=row.get("is_emergency", False),
        is_pinned=row.get("is_pinned", False),
        is_resolved=row.get("is_resolved", False),
        resolved_at=row.get("resolved_at"),
        language_detected=row.get("language_detected"),
        created_at=row["created_at"],
    )
```

---

## 9. Background Tasks

FastAPI's `BackgroundTasks` is used for fire-and-forget operations. The two
primary uses are:

**Post classification:** Triggered immediately after post creation. Uses
`asyncio.create_task()` rather than FastAPI's `BackgroundTasks` parameter
because the classification must complete and update the post even after the
HTTP response has been returned.

**Verification OCR and document deletion:** Same pattern. OCR runs async;
deletion runs async after the decision is made.

For the prototype, no task queue (Celery, RQ) is needed. `asyncio.create_task()`
is sufficient for a single-instance Render deployment with demo-level traffic.

Post-prototype, replace with Celery + Redis for reliability, retries, and
observability.

---

## 10. Rate Limiting

```python
# app/core/rate_limit.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Applied to specific endpoints via decorator:
# @limiter.limit("100/minute")
# For the prototype, only apply to post creation and verification upload
# to prevent spam during the demo.
```

---

## 11. Logging

```python
# app/core/logging.py
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_dict = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_dict["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_dict)


def configure_logging(level: str = "INFO"):
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logging.basicConfig(level=level, handlers=[handler])
```

Render captures stdout/stderr. JSON-formatted logs are readable in the Render
dashboard and are parseable if log aggregation is added post-hackathon.

---

## 12. Dependencies (`requirements.txt`)

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
pydantic==2.7.0
pydantic-settings==2.3.0
supabase==2.5.0
google-genai>=1.0.0
python-jose[cryptography]==3.3.0   # JWT validation
httpx==0.27.0                      # Async HTTP client
python-multipart==0.0.9            # File uploads
pywebpush==2.0.0                   # Web Push notifications
slowapi==0.1.9                     # Rate limiting
python-json-logger==2.0.7          # JSON logging
```

```
# requirements-dev.txt
pytest==8.2.0
pytest-asyncio==0.23.0
httpx==0.27.0     # TestClient
pytest-cov==5.0.0
```

---

## 13. Deployment (`render.yaml`)

```yaml
services:
  - type: web
    name: halqa-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
    envVars:
      - key: ENVIRONMENT
        value: production
      - key: LOG_LEVEL
        value: INFO
      - key: SUPABASE_URL
        sync: false           # Set via Render dashboard
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: VAPID_PUBLIC_KEY
        sync: false
      - key: VAPID_PRIVATE_KEY
        sync: false
      - key: VAPID_EMAIL
        sync: false
      - key: INTERNAL_SERVICE_TOKEN
        sync: false
      - key: ALLOWED_ORIGINS
        value: "https://halqa.pk,https://www.halqa.pk"
```

---

## 14. Implementation Order

Build in this sequence. Each step depends on the previous.

1. **Project scaffold** — directory structure, requirements.txt, main.py, config.py,
   errors.py, logging.py, db/client.py. Deploy to Render with `/health` endpoint.

2. **Database migrations** — run all migrations via `supabase db push`. Apply seed data.
   Verify all tables, indexes, RLS policies, and triggers are present.

3. **Auth middleware** — JWT validation, `get_current_user`, `get_current_member`,
   `require_tier`, `get_current_anchor`. Write auth tests before moving on.

4. **Users router + service + repo** — `/users/me` GET and PATCH. Push subscription
   endpoints. Foundation for all subsequent work.

5. **Neighborhoods router + service + repo** — search and detail endpoints. Test
   trigram search with seed data.

6. **Members router + service + repo** — join endpoint with one-neighborhood enforcement.
   Membership detail endpoint.

7. **Verification router + service + repo + OCR service** — document upload, OCR
   integration, decision logic, document deletion. This is the most complex flow —
   test thoroughly with real document images before moving on.

8. **Posts router + service + repo** — feed, create, resolve, flag. The create flow
   must fire async classification.

9. **Classification service** — AI prompt, Gemini API integration, post update,
   emergency notification trigger. Test with Pakistani mixed-language content samples.

10. **Notification service** — Web Push setup, VAPID key generation, subscription
    management, emergency alert delivery, verification result delivery.

11. **Dashboard service + router + repo** — snapshot compute, export formatter,
    dashboard endpoint. Test with seed data.

12. **Workers router + service + repo** — listings, reviews, badge computation.

13. **Anchor router + service** — moderation queue, post removal, classification
    override, Tier 3 vouching flow.

14. **Internal router** — `/internal/classify`, `/internal/dashboard/snapshot`,
    `/internal/verification/ocr`. These are the machine-to-machine endpoints.

15. **Full integration test pass** — end-to-end flows with the frontend against
    the deployed Render instance.

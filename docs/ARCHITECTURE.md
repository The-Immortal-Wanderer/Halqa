# ARCHITECTURE.md — Halqa System Architecture

**Version:** 1.0
**Date:** June 2026

This document is the shared foundation for both Backend-Plan.md and
Frontend-Plan.md. The API contract defined here is the single source of
truth for all request/response shapes. Any divergence between implementation
and this document must be resolved by updating this document first, then
updating the implementation — never the other way around.

---

## 1. System Overview

Halqa is a three-tier web application deployed across three managed services:

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                                │
│              Next.js PWA (Vercel)                           │
│    Server Components + Client Components + Service Worker   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
                        │ REST API + Supabase Realtime (WSS)
           ┌────────────┴────────────┐
           │                         │
           ▼                         ▼
┌──────────────────┐      ┌─────────────────────┐
│   FastAPI        │      │   Supabase           │
│   (Render)       │      │   (managed cloud)    │
│                  │      │                      │
│  - Auth verify   │      │  - PostgreSQL DB     │
│  - Business logic│      │  - Auth (JWT/OTP)    │
│  - AI classify   │      │  - Storage (private) │
│  - Verification  │      │  - Realtime (WSS)    │
│  - Notifications │      │  - Edge Functions    │
│  - Civic agg.    │      │                      │
└────────┬─────────┘      └─────────────────────┘
         │                          ▲
         │ Supabase service role    │
         └──────────────────────────┘
         │
         ▼
┌──────────────────┐
│  Gemini API     │
│  (gemma-4-31b-it) │
│  - Classification│
│  - OCR on docs   │
└──────────────────┘
```

**Key topology decisions:**

- The Next.js frontend communicates with **both** FastAPI (for mutations and
  AI-backed operations) and Supabase directly (for Realtime subscriptions
  and read queries where RLS is sufficient).
- The FastAPI backend uses the **Supabase service role key** for all database
  operations, bypassing RLS. All authorization logic lives in FastAPI
  middleware and service layers — not delegated to Supabase RLS alone.
- Supabase Realtime subscriptions go **directly** from browser to Supabase.
  FastAPI does not mediate Realtime — it writes to the database, and Supabase
  broadcasts the change automatically.
- The Gemini API is called **only from FastAPI**. The API key is never
  exposed to the frontend or to Supabase Edge Functions.

---

## 2. Authentication Architecture

### 2.1 Auth Provider (Finalized vs. Planned)

#### Finalized / Active State (Working Prototype)
The hackathon prototype implements **Email and Password** authentication. Supabase Auth manages credential verification, while the backend `/auth/register` and `/auth/login` endpoints manage session tokens, user profile rows, and complete onboarding records.
- Pre-staged demo accounts bypass email confirmation (`email_confirm: True` is set via admin API).
- Authentication state is persisted in the frontend via cookies and `@supabase/ssr` session checks in Next.js middleware and layouts.

#### Original Planned Design (Future Scope)
- **Primary:** Phone number + OTP (SMS via Supabase's Twilio integration).
- **Fallback:** Email + magic link (for users without SMS access).
- No password-based auth.

---

### 2.2 JWT Flow

1. User registers or logs in via the app's auth routes.
2. Supabase verifies credentials and issues an `access_token` (JWT) + `refresh_token`.
3. Frontend attaches the token to all FastAPI requests: `Authorization: Bearer {access_token}`.
4. FastAPI validates the JWT by calling the GoTrue `/auth/v1/user` endpoint of the Supabase project.
5. User ID and profile metadata are extracted from the verified token.

---

### 2.3 FastAPI Auth Middleware

```python
# app/core/auth.py

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: SupabaseClient = Depends(get_db)
) -> AuthUser:
    user_data = await verify_supabase_jwt(token)
    user_id = UUID(user_data["id"])
    user = await user_repo.get_by_id(user_id)
    if not user or not user["is_active"]:
        raise HTTPException(status_code=401)
    return AuthUser(id=user_id, display_name=user["display_name"])

async def get_current_member(
    neighborhood_id: UUID,
    current_user: AuthUser = Depends(get_current_user),
    db: SupabaseClient = Depends(get_db)
) -> AuthMember:
    membership = await membership_repo.get_active(current_user.id, neighborhood_id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")
    return AuthMember(user=current_user, membership=membership, tier=membership["tier"])

def require_tier(min_tier: int):
    async def dependency(member: AuthMember = Depends(get_current_member)):
        # Maps string tiers ('tier_1', 'tier_2', 'tier_3') to numeric comparison
        tier_values = {"tier_1": 1, "tier_2": 2, "tier_3": 3}
        current_val = tier_values.get(member.tier, 1)
        if current_val < min_tier:
            raise HTTPException(status_code=403, detail="Insufficient tier")
        return member
    return dependency
```

---

## 3. API Contract

### 3.1 Base Configuration

```
Base URL (development):  http://localhost:8000/api/v1
Base URL (production):   https://api.halqa.pk/api/v1 (Render)

Content-Type:            application/json
Authorization:           Bearer {supabase_access_token} (protected routes)
```

### 3.2 Standard Response Envelope

Every FastAPI endpoint returns this shape:

```typescript
// Success
{
  "data": T,          // The response payload
  "error": null
}

// Error
{
  "data": null,
  "error": {
    "code": string,   // Machine-readable error code from errors.py
    "message": string // Human-readable message (safe to display to users)
  }
}
```

---

## 4. Shared Type Definitions

These TypeScript definitions mirror the API shapes and Pydantic models in the codebase:

```typescript
// ─── Enums ───────────────────────────────────────────────────
type PostCategory = 'power' | 'security' | 'infrastructure' | 'water' | 'general'
type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'expired'
type DocumentType = 'utility_bill' | 'rental_agreement' | 'society_card' | 'other'
type WorkerCategory = 'electrician' | 'plumber' | 'maid' | 'cook' | 'driver' | 'other'
type AnchorActionType = 'post_removed' | 'post_pinned' | 'post_unpinned' | 'member_flagged' | 'vouching_initiated' | 'vouching_completed' | 'vouching_rejected' | 'dismiss_report'

// ─── Core Entities ───────────────────────────────────────────

interface User {
  id: string                   // UUID
  display_name: string
  onboarding_complete: boolean
  is_active: boolean
  created_at: string
}

interface Neighborhood {
  id: string
  name: string
  name_urdu: string | null
  city: string
  sector: string | null
  province: string
  member_count: number         // Tier 2+ verified count
  is_active: boolean
  created_at: string
}

interface NeighborhoodMembership {
  id: string
  user_id: string
  neighborhood_id: string
  tier: 'tier_1' | 'tier_2' | 'tier_3'
  declared_address: string
  joined_at: string
  tier_upgraded_at: string | null
  is_active: boolean
}

interface Post {
  id: string
  neighborhood_id: string
  author_member_id: string
  author: {
    id: string
    display_name: string
    tier: 'tier_1' | 'tier_2' | 'tier_3'
  }
  body: string
  body_language: string
  category: PostCategory
  is_emergency: boolean
  ai_confidence: number | null
  ai_civic_signal: string | null
  is_pinned: boolean
  is_resolved: boolean
  resolved_at: string | null
  created_at: string
  updated_at: string
}

interface VerificationRecord {
  id: string
  member_id: string
  status: VerificationStatus
  tier_target: number
  declared_address: string
  extracted_address: string | null
  ocr_confidence: number | null
  rejection_reason: string | null
  submitted_at: string
  reviewed_at: string | null
}

interface AnchorRole {
  id: string
  neighborhood_id: string
  user_id: string
  member_id: string
  term_started_at: string
  term_ends_at: string
  is_active: boolean
}

interface WorkerListing {
  id: string
  neighborhood_id: string
  created_by_member_id: string
  worker_name: string
  service_type: WorkerCategory
  description: string | null
  worker_phone: string | null  // Hidden from Tier 1 members in public views
  earned_badge: 'none' | 'earning' | 'earned'
  min_completed_jobs: number
  avg_rating: number | null
  status: 'active' | 'suspended'
  created_at: string
}

interface WorkerReview {
  id: string
  listing_id: string
  reviewer_member_id: string
  rating: number
  review_body: string | null
  job_confirmed_by_worker: boolean
  job_confirmed_by_member: boolean
  is_published: boolean
  created_at: string
  published_at: string | null
}

interface CivicDashboardSnapshot {
  id: string
  neighborhood_id: string
  period_start: string
  period_end: string
  period_type: '7d' | '30d' | '90d'
  total_posts: number
  emergency_posts: number
  resolved_posts: number
  category_breakdown: Record<PostCategory, number>
  active_members: number
  computed_at: string
}

interface VouchingRequest {
  id: string
  neighborhood_id: string
  candidate_member_id: string
  initiated_by_anchor_id: string
  cosigner_member_id: string | null
  anchor_signed_at: string
  cosigner_signed_at: string | null
  is_completed: boolean
  is_rejected: boolean
  rejection_reason: string | null
  created_at: string
  expires_at: string
}

// ─── Request Bodies ──────────────────────────────────────────

interface RegisterRequest {
  email: string
  password: str
  display_name: string
}

interface LoginRequest {
  email: string
  password: str
}

interface PostCreate {
  body: string
  category: PostCategory
  is_emergency?: boolean
}

interface WorkerListingCreate {
  worker_name: string
  service_type: WorkerCategory
  description?: string
  worker_phone?: string
}

interface MembershipJoinRequest {
  neighborhood_id: string
  tier: 'tier_1' | 'tier_2' | 'tier_3'
  declared_address: string
}
```

---

## 5. API Endpoints

All endpoints require `Authorization: Bearer {token}` unless marked `[public]`.

---

### 5.1 Auth & User

#### `POST /auth/register`
Creates a user in Supabase Auth and triggers profile record creation.
- **Request:** `RegisterRequest`
- **Response:** `{ "data": { "user_id": string, "display_name": string } }`

#### `POST /auth/login`
Authenticates a user and yields tokens.
- **Request:** `LoginRequest`
- **Response:** `{ "data": { "access_token": string, "refresh_token": string, "user_id": string } }`

#### `POST /auth/refresh`
Refreshes an active session token.
- **Request:** `{ "refresh_token": string }`
- **Response:** `{ "data": { "access_token": string, "refresh_token": string } }`

#### `GET /auth/me`
Gets current user details and their active neighborhood association.
- **Response:**
```json
{
  "data": {
    "user": User,
    "membership": NeighborhoodMembership | null,
    "neighborhood": Neighborhood | null,
    "is_anchor": boolean,
    "verification_status": VerificationStatus | null
  }
}
```

---

### 5.2 Neighborhoods

#### `GET /neighborhoods/search` `[public]`
Debounced search of neighborhoods.
- **Query params:** `?q={query}&limit=10`
- **Response:** `{ "data": Neighborhood[] }`

#### `POST /neighborhoods`
Creates a neighborhood.
- **Request:** `{ "name": string, "city": string, "sector"?: string, "province": string }`
- **Response:** `{ "data": Neighborhood }`

#### `GET /neighborhoods/{id}`
Returns details for a neighborhood.
- **Response:** `{ "data": Neighborhood }`

#### `POST /members/join`
Join a neighborhood as a member. Completed at onboarding Screen 5.
- **Request:** `MembershipJoinRequest`
- **Response:** `{ "data": { "membership_id": string, "neighborhood_id": string, "tier": number, "onboarding_complete": boolean } }`

#### `GET /neighborhoods/{neighborhood_id}/members`
Gets a list of all active members in the neighborhood.
- **Response:** `{ "data": { "members": MemberListItem[], "total": number } }`

---

### 5.3 Posts (Feed)

#### `GET /neighborhoods/{neighborhood_id}/posts`
Loads neighborhood posts feed.
- **Query params:** `?category={category}&emergency_only=true&limit=20`
- **Response:** `{ "data": { "posts": Post[], "has_more": boolean } }`

#### `GET /neighborhoods/{neighborhood_id}/posts/{post_id}`
Retrieves a single post by ID.
- **Response:** `{ "data": Post }`

#### `POST /neighborhoods/{neighborhood_id}/posts`
Creates a feed post. Requires Tier 2+. Background classification triggers immediately.
- **Request:** `PostCreate`
- **Response:** `{ "data": Post }`

#### `PATCH /neighborhoods/{neighborhood_id}/posts/{post_id}/resolve`
Marks a post as resolved (Author or Anchor only).
- **Response:** `{ "data": Post }`

#### `POST /neighborhoods/{neighborhood_id}/posts/{post_id}/report`
Flags/reports a post. Requires Tier 2+ membership.
- **Request:** `{ "reason": string }`
- **Response:** `{ "data": { "report_id": string, "post_id": string } }`

#### `GET /neighborhoods/{neighborhood_id}/alerts`
Special alerts tab loader. Returns only emergency posts.
- **Query params:** `?limit=10&include_resolved=false`
- **Response:** `{ "data": { "posts": Post[], "has_more": boolean } }`

---

### 5.4 Verification Flow

#### `POST /verification/submit`
Uploads a document image/PDF directly to trigger async OCR checks.
- **Request:** Multipart Form (`file` UploadFile, `document_type` string)
- **Response:** `{ "data": { "verification_record_id": string, "status": "pending" } }`

#### `GET /verification/status`
Gets the latest verification record status.
- **Response:** `{ "data": { "status": string | null, "rejection_reason": string | null } }`

#### `PATCH /verification/upgrade-tier`
Triggers actual tier upgrade once approved.
- **Response:** `{ "data": { "tier": "tier_2" } }`

---

### 5.5 Anchor Moderation

The following endpoints require active Anchor status in the target neighborhood:

#### `GET /neighborhoods/{neighborhood_id}/anchor/status`
Checks if the current user is active anchor.
- **Response:** `{ "data": { "is_anchor": boolean, "anchor_role_id": string | null } }`

#### `GET /neighborhoods/{neighborhood_id}/anchor/queue`
Moderation queue: displays reported posts.
- **Response:** `{ "data": ModerationItem[] }`

#### `POST /neighborhoods/{neighborhood_id}/anchor/posts/{post_id}/remove`
Removes a reported post (soft-delete).
- **Request:** `{ "reason": string }`
- **Response:** `{ "data": { "post_id": string, "removed_at": string } }`

#### `POST /neighborhoods/{neighborhood_id}/anchor/reports/{report_id}/dismiss`
Dismisses a flag report without removing the post.
- **Response:** `{ "data": { "report_id": string, "dismissed_at": string } }`

#### `GET /neighborhoods/{neighborhood_id}/anchor/vouching`
Gets pending Tier 3 vouching requests.
- **Response:** `{ "data": VouchingRequest[] }`

#### `POST /neighborhoods/{neighborhood_id}/anchor/vouching`
Anchor initiates a vouching request for a Tier 2 resident.
- **Request:** `{ "candidate_member_id": string }`
- **Response:** `{ "data": VouchingRequest }`

#### `POST /neighborhoods/{neighborhood_id}/anchor/vouching/{request_id}/cosign`
Second verified member co-signs a vouching request (unlocked for Tier 2+, not anchor).
- **Response:** `{ "data": { "vouching_request_id": string, "is_completed": boolean } }`

#### `GET /neighborhoods/{neighborhood_id}/anchor/escalations`
Displays active moderation disputing counters (read-only for anchors).
- **Response:** `{ "data": EscalationItem[] }`

#### `GET /neighborhoods/{neighborhood_id}/anchor/audit-log`
Anchor moderation actions log history.
- **Response:** `{ "data": AuditEntry[] }`

---

### 5.6 Worker Directory

#### `GET /neighborhoods/{neighborhood_id}/workers`
Lists workers. Contacts hidden for Tier 1 browse.
- **Query params:** `?service_type={category}&limit=20`
- **Response:** `{ "data": WorkerListing[] }`

#### `GET /neighborhoods/{neighborhood_id}/workers/{listing_id}`
Gets a worker's details alongside their reviews.
- **Response:** `{ "data": { "listing": WorkerListing, "reviews": WorkerReview[] } }`

#### `POST /neighborhoods/{neighborhood_id}/workers`
Adds a worker listing. Requires Tier 2+.
- **Request:** `WorkerListingCreate`
- **Response:** `{ "data": WorkerListing }`

#### Planned Endpoints (Post-Prototype / Out of Scope)
- `POST /neighborhoods/{id}/workers/{listing_id}/confirm-job` - Job dual-confirmation.
- `POST /neighborhoods/{id}/workers/{listing_id}/reviews` - Review submission.

---

### 5.7 Civic Dashboard

#### `GET /neighborhoods/{neighborhood_id}/dashboard`
Returns the dashboard analytics snapshot.
- **Query params:** `?period_type=7d | 30d | 90d`
- **Response:** `{ "data": CivicDashboardSnapshot }`

#### `GET /neighborhoods/{neighborhood_id}/dashboard/export`
Generates text summary for social channels.
- **Query params:** `?period_type=7d | 30d | 90d`
- **Response:** `{ "data": { "export_text": string, "period_type": string, "generated_at": string } }`

---

### 5.8 Push Notifications

#### `POST /notifications/subscribe`
Registers a push subscription (Web Push).
- **Request:** `{ "endpoint": string, "keys": { "p256dh": string, "auth": string } }`
- **Response:** `{ "data": { "subscribed": true } }`

---

## 6. AI Classification Layer

### 6.1 Overview

AI classification runs as an asynchronous background task triggered inside `post_service.py` immediately after a post is saved to the database. It calls the Gemini API to analyze post language, category, and urgency. 

If confidence is >= 0.70, the AI overrides the user's category and sets the emergency flags, which subsequently dispatches push notifications.

> [!NOTE]
> **Internal classification endpoint**: The original design spec proposed a `POST /internal/classify` endpoint. In the active prototype, this is structured as an async python module dependency (`classification_service.py`) run in the main backend service background thread loop instead of exposing a separate HTTP microservice endpoint.

---
## 7. Push Notification Architecture

### 7.1 Web Push via Supabase Edge Function

Push notifications use the Web Push protocol (RFC 8030). The VAPID keys
are generated once and stored as environment variables.

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=  (frontend — for subscription)
VAPID_PRIVATE_KEY=             (backend — for sending)
VAPID_EMAIL=                   (backend — for VAPID identification)
```

### 7.2 Notification Types and Payloads

**Emergency Alert:**
```json
{
  "type": "emergency_alert",
  "title": "⚠ Power — Block 5, DHA Phase 5",
  "body": "Transformer blast ہوگئی, bijli nahi hai",
  "data": {
    "post_id": "uuid",
    "neighborhood_id": "uuid",
    "deep_link": "halqa://feed/{neighborhood_id}/post/{post_id}"
  }
}
```

**Verification Approved:**
```json
{
  "type": "verification_approved",
  "title": "Address verified",
  "body": "You're now a verified member of Block 5, DHA Phase 5.",
  "data": {
    "neighborhood_id": "uuid",
    "deep_link": "halqa://verification/result?status=approved&neighborhood_id={uuid}"
  }
}
```

**Verification Rejected:**
```json
{
  "type": "verification_rejected",
  "title": "Verification needs attention",
  "body": "We couldn't verify your address. Tap to try again.",
  "data": {
    "verification_record_id": "uuid",
    "rejection_reason": "address_mismatch",
    "deep_link": "halqa://verification/result?status=rejected&record_id={uuid}"
  }
}
```

### 7.3 Deep Link Scheme

The PWA handles deep links via the service worker's `notificationclick`
event. URL scheme: `halqa://{path}`.

| Deep link | Destination screen |
|---|---|
| `halqa://feed/{neighborhood_id}` | Neighborhood feed |
| `halqa://feed/{neighborhood_id}/post/{post_id}` | Feed scrolled to specific post |
| `halqa://verification/result?status=approved&neighborhood_id={id}` | Verification approved screen |
| `halqa://verification/result?status=rejected&record_id={id}` | Verification rejected screen |
| `halqa://dashboard/{neighborhood_id}` | Civic dashboard |

The service worker translates deep links to Next.js routes:
```
halqa://feed/{nid}                  →  /neighborhood/{nid}/feed
halqa://feed/{nid}/post/{pid}       →  /neighborhood/{nid}/feed?post={pid}
halqa://verification/result?...     →  /onboarding/verification-result?...
halqa://dashboard/{nid}             →  /neighborhood/{nid}/dashboard
```

---

## 8. Design Tokens (Tailwind Configuration)

All design tokens from the visual identity system, expressed as Tailwind
config values. Import in `tailwind.config.ts`.

```typescript
// tailwind.config.ts — theme.extend.colors
colors: {
  halqa: {
    // Primary
    teal:        '#1D6A58',
    'teal-light':'#E6F4F0',
    'teal-dark': '#0F4A3C',
    // Sand
    sand:        '#F7F4EE',
    'sand-mid':  '#EDE9DF',
    'sand-dark': '#C9C3B4',
    // Amber (emergency only)
    amber:        '#C97A1B',
    'amber-light':'#FDF3E3',
    'amber-dark': '#8A5210',
    // Ink
    ink:          '#1E1C18',
    'ink-mid':    '#5C574E',
    'ink-light':  '#9C9589',
    // Semantic
    success:      '#2E7D5C',
    'success-bg': '#EBF6F1',
    danger:       '#B84040',
    'danger-bg':  '#FAEAEA',
    // Category (civic dashboard only)
    'cat-power':          '#1D6A58',
    'cat-security':       '#4A5B7A',
    'cat-infrastructure': '#7A5C3A',
    'cat-water':          '#3A7A8C',
    'cat-other':          '#9C9589',
  }
},
// theme.extend.fontFamily
fontFamily: {
  sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
  urdu: ['Noto Nastaliq Urdu', 'serif'],
},
// theme.extend.borderRadius
borderRadius: {
  sm:   '6px',
  md:   '10px',
  lg:   '14px',
  xl:   '20px',
  full: '9999px',
},
// theme.extend.spacing (4px base, 4-unit increments only)
spacing: {
  '1':  '4px',
  '2':  '8px',
  '3':  '12px',
  '4':  '16px',
  '5':  '20px',
  '6':  '24px',
  '8':  '32px',
  '10': '40px',
  '12': '48px',
},
```

---

## 9. Environment Variables

### 9.1 Frontend (Next.js — Vercel)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://{ref}.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY={anon_key}

# FastAPI
NEXT_PUBLIC_API_URL=https://api.halqa.pk/api/v1   # prod
# NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1  # dev

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY={vapid_public_key}
```

### 9.2 Backend (FastAPI — Render)

```bash
# Supabase
SUPABASE_URL=https://{ref}.supabase.co
SUPABASE_SERVICE_ROLE_KEY={service_role_key}       # Never exposed to frontend
SUPABASE_JWT_SECRET={jwt_secret}                   # For JWT validation

# Gemini
GEMINI_API_KEY={api_key}

# Web Push (VAPID)
VAPID_PUBLIC_KEY={vapid_public_key}
VAPID_PRIVATE_KEY={vapid_private_key}
VAPID_EMAIL=mailto:hello@halqa.pk

# Internal service token (for /internal/* endpoints)
INTERNAL_SERVICE_TOKEN={random_32_char_token}

# App config
ENVIRONMENT=production   # or development
LOG_LEVEL=INFO
ALLOWED_ORIGINS=https://halqa.pk,https://www.halqa.pk
```

### 9.3 Environment Strategy

| Variable | Development | Staging | Production |
|---|---|---|---|
| `SUPABASE_URL` | Local Supabase instance | Staging Supabase project | Prod Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Local key | Staging key | Prod key |
| `GEMINI_API_KEY` | Same key, dev model | Same key | Same key |
| `NEXT_PUBLIC_API_URL` | localhost:8000 | staging API URL | api.halqa.pk |
| `ENVIRONMENT` | development | staging | production |

For the prototype (hackathon), development and production are the only
environments. Staging is a future concern.

---

## 10. Deployment Architecture

### 10.1 Frontend — Vercel

```
Repository:     github.com/halqa-team/halqa
Build command:  next build
Output:         .next
Root dir:       apps/web (if monorepo) or / (if single repo)
Node version:   20.x
```

PWA configuration requires:
- `public/manifest.json` with Halqa brand colors and icon
- `public/sw.js` service worker (generated by next-pwa or custom)
- `vercel.json` with proper cache headers for static assets

### 10.2 Backend — Render

```
Repository:     github.com/halqa-team/halqa
Build command:  pip install -r requirements.txt
Start command:  uvicorn app.main:app --host 0.0.0.0 --port $PORT
Root dir:       apps/api (if monorepo) or / (if single repo)
Python version: 3.11
Instance type:  Free (prototype) → Starter ($7/mo, post-hackathon)
Health check:   GET /health
```

### 10.3 Repository Structure

```
halqa/
├── AGENTS.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── PRD.md
│   ├── Database-Schema.md
│   ├── Backend-Plan.md
│   ├── Frontend-Plan.md
│   └── features/
├── apps/
│   ├── web/          ← Next.js frontend
│   └── api/          ← FastAPI backend
├── supabase/
│   ├── migrations/
│   └── config.toml
└── .env.example
```

### 10.4 CI/CD (Prototype — Minimal)

- Vercel auto-deploys on push to `main` branch (frontend)
- Render auto-deploys on push to `main` branch (backend)
- Supabase migrations applied manually via `supabase db push` before
  deploying backend changes that depend on schema changes
- No automated test pipeline for the prototype — tests run locally

---

## 11. Monitoring (Prototype — Minimal)

- **Render logs:** FastAPI stdout/stderr, accessible via Render dashboard
- **Vercel logs:** Next.js serverless function logs, accessible via Vercel dashboard
- **Supabase logs:** Database query logs, auth events, accessible via Supabase dashboard
- **Gemini API:** Token usage monitored via Google AI Studio console to avoid
  unexpected spend during the demo period

No APM, error tracking, or alerting beyond the above for the prototype.
Post-hackathon: Sentry for error tracking, Uptime Robot for availability.

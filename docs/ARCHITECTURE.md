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
│  Anthropic API   │
│  (claude-sonnet) │
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
- The Anthropic API is called **only from FastAPI**. The API key is never
  exposed to the frontend or to Supabase Edge Functions.

---

## 2. Authentication Architecture

### 2.1 Auth Provider

Supabase Auth handles all authentication. Two methods supported:

- **Primary:** Phone number + OTP (SMS via Supabase's Twilio integration)
- **Fallback:** Email + magic link (for users without SMS access)

No password-based auth. No social login (Google, Apple).

### 2.2 JWT Flow

```
1. User completes OTP/magic link via Supabase Auth
2. Supabase issues access_token (JWT) + refresh_token
3. Frontend stores tokens in memory (not localStorage — PWA constraint)
   using Supabase client's built-in session management
4. All FastAPI requests include: Authorization: Bearer {access_token}
5. FastAPI validates JWT using Supabase JWKS endpoint:
   https://{project_ref}.supabase.co/auth/v1/.well-known/jwks.json
6. Validated token payload provides: sub (user_id), role, aud, exp
7. user_id extracted from token.sub — never from request body
```

### 2.3 FastAPI Auth Middleware

```python
# app/core/auth.py
# Every protected endpoint uses this dependency

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: SupabaseClient = Depends(get_db)
) -> AuthUser:
    token = credentials.credentials
    # Validate against Supabase JWKS
    payload = verify_supabase_jwt(token)
    user_id = UUID(payload["sub"])
    # Fetch user profile from users table
    user = await user_repo.get_by_id(user_id)
    if not user or user.deleted_at:
        raise HTTPException(status_code=401)
    return AuthUser(id=user_id, display_name=user.display_name)

# Neighborhood-scoped auth — also validates membership
async def get_current_member(
    neighborhood_id: UUID,
    current_user: AuthUser = Depends(get_current_user),
    db: SupabaseClient = Depends(get_db)
) -> AuthMember:
    membership = await membership_repo.get_active(current_user.id, neighborhood_id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")
    return AuthMember(user=current_user, membership=membership, tier=membership.tier)

# Tier-gated auth
def require_tier(min_tier: int):
    async def dependency(member: AuthMember = Depends(get_current_member)):
        if member.tier < min_tier:
            raise HTTPException(status_code=403, detail="Insufficient tier")
        return member
    return dependency

# Anchor auth
async def get_current_anchor(
    neighborhood_id: UUID,
    member: AuthMember = Depends(get_current_member),
    db: SupabaseClient = Depends(get_db)
) -> AuthAnchor:
    anchor = await anchor_repo.get_active(member.user.id, neighborhood_id)
    if not anchor:
        raise HTTPException(status_code=403, detail="Not the anchor")
    return AuthAnchor(member=member, anchor_role=anchor)
```

### 2.4 Frontend Auth State

```typescript
// lib/supabase/client.ts
// Supabase client initialized once, session managed automatically
// Frontend accesses session via: supabase.auth.getSession()
// Session stored in Supabase client's in-memory store (not localStorage)

// For Server Components: use server-side Supabase client with cookie session
// For Client Components: use browser Supabase client
// For FastAPI calls: attach session.access_token as Bearer token
```

---

## 3. API Contract

### 3.1 Base Configuration

```
Base URL (development):  http://localhost:8000/api/v1
Base URL (production):   https://api.halqa.pk/api/v1

Content-Type:            application/json
Authorization:           Bearer {supabase_access_token}  (all protected routes)

Rate limiting:           100 requests/minute per user (enforced by FastAPI)
```

### 3.2 Standard Response Envelope

Every FastAPI endpoint returns this shape:

```typescript
// Success
{
  "data": T,          // The response payload (type varies by endpoint)
  "error": null
}

// Error
{
  "data": null,
  "error": {
    "code": string,   // Machine-readable error code from errors.py
    "message": string // Human-readable message (safe to show to users)
  }
}
```

HTTP status codes follow the conventions in AGENTS.md.

---

## 4. Shared Type Definitions

These types are the contract between frontend and backend. The frontend
imports from `@/types/index.ts`. The backend uses equivalent Pydantic models
in `app/schemas/`.

```typescript
// ─── Enums ───────────────────────────────────────────────────

type PostCategory = 'power' | 'security' | 'infrastructure' | 'water' | 'general'
type AIClassification = 'emergency' | 'community' | 'general'
type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'expired'
type DocumentType = 'utility_bill' | 'rental_agreement' | 'society_card' | 'delivery_confirmation' | 'other'
type WorkerCategory = 'electrician' | 'plumber' | 'maid' | 'cook' | 'driver' | 'other'
type AnchorActionType = 'post_removed' | 'post_classification_overridden' | 'tier3_vouched' | 'tier3_cosigned' | 'member_flagged' | 'escalation_reviewed'
type FlagType = 'content_violation' | 'false_emergency' | 'exclusionary_content' | 'anchor_action_dispute'
type RejectionReason = 'address_mismatch' | 'document_unreadable' | 'name_not_found' | 'document_type_invalid'
type DashboardPeriod = 7 | 30 | 90

// ─── Core Entities ───────────────────────────────────────────

interface User {
  id: string                   // UUID
  display_name: string
  onboarding_complete: boolean
  created_at: string           // ISO 8601 UTC
}

interface Neighborhood {
  id: string                   // UUID
  name: string
  city: string
  sector_or_area: string | null
  member_count: number         // Tier 2+ only
  total_member_count: number
  is_active: boolean
}

interface NeighborhoodMembership {
  id: string
  user_id: string
  neighborhood_id: string
  tier: 1 | 2 | 3
  joined_at: string
  tier_upgraded_at: string | null
  is_active: boolean
}

interface Post {
  id: string
  neighborhood_id: string
  author_id: string
  author_display_name: string  // Joined from users — denormalized in response
  content: string
  category: PostCategory
  ai_classification: AIClassification | null
  is_emergency: boolean
  is_pinned: boolean
  is_resolved: boolean
  resolved_at: string | null
  language_detected: 'en' | 'ur' | 'mixed' | null
  created_at: string
  updated_at: string
  flag_count: number           // Computed: count of post_flags for this post
}

interface VerificationRecord {
  id: string
  user_id: string
  neighborhood_id: string
  membership_id: string
  tier_target: 2 | 3
  status: VerificationStatus
  submitted_at: string
  decided_at: string | null
  rejection_reason: RejectionReason | null
  // address fields NOT included — service role only
}

interface AnchorRole {
  id: string
  neighborhood_id: string
  user_id: string
  anchor_display_name: string  // Joined — so members can see who the anchor is
  term_start: string
  term_end: string
  is_active: boolean
}

interface WorkerListing {
  id: string
  neighborhood_id: string
  submitted_by: string
  worker_name: string
  category: WorkerCategory
  description: string | null
  contact_phone: string | null  // null for Tier 1 members (omitted by API)
  is_verified_badge: boolean
  confirmed_job_count: number
  average_rating: number | null
  is_promoted: boolean
  created_at: string
}

interface WorkerReview {
  id: string
  listing_id: string
  reviewer_id: string
  reviewer_display_name: string
  rating: 1 | 2 | 3 | 4 | 5
  review_text: string | null
  job_confirmed: boolean
  created_at: string
}

interface CivicDashboardSnapshot {
  neighborhood_id: string
  period_days: DashboardPeriod
  snapshot_date: string        // YYYY-MM-DD
  total_posts: number
  emergency_posts: number
  resolved_posts: number
  power_count: number
  security_count: number
  infrastructure_count: number
  water_count: number
  general_count: number
  power_resolved: number
  security_resolved: number
  infrastructure_resolved: number
  water_resolved: number
  active_members: number
  export_text: string | null
}

interface Tier3VouchingRequest {
  id: string
  candidate_user_id: string
  candidate_display_name: string
  neighborhood_id: string
  anchor_signed: boolean
  anchor_signed_at: string | null
  cosigner_signed: boolean
  cosigner_signed_at: string | null
  status: VerificationStatus
  approved_at: string | null
  expires_at: string
  created_at: string
}

// ─── Request Bodies ──────────────────────────────────────────

interface CreatePostRequest {
  content: string              // 2–1000 chars
  category: PostCategory
}

interface ResolvePostRequest {
  post_id: string
}

interface OverrideClassificationRequest {
  post_id: string
  classification: AIClassification
}

interface CreateListingRequest {
  worker_name: string          // 2–80 chars
  category: WorkerCategory
  description?: string         // max 300 chars
  contact_phone?: string
}

interface ConfirmJobRequest {
  listing_id: string
}

interface CreateReviewRequest {
  listing_id: string
  rating: 1 | 2 | 3 | 4 | 5
  review_text?: string         // max 500 chars
}

interface FlagPostRequest {
  post_id: string
  flag_type: FlagType
  description?: string         // max 300 chars
}

interface RemovePostRequest {
  post_id: string
  reason?: string
}

interface VouchTier3Request {
  candidate_membership_id: string
}

interface CoSignTier3Request {
  vouching_request_id: string
}

interface JoinNeighborhoodRequest {
  neighborhood_id: string
}

interface CreateNeighborhoodRequest {
  name: string                 // 3–120 chars
  city: string
  sector_or_area?: string
}

interface InitiateVerificationRequest {
  tier_target: 2 | 3
  address_submitted: string
}

interface ExportDashboardRequest {
  period_days: DashboardPeriod
}
```

---

## 5. API Endpoints

All endpoints require `Authorization: Bearer {token}` unless marked `[public]`.

---

### 5.1 Auth & User

#### `POST /auth/register`
Create user profile after Supabase Auth signup.

**Request:**
```json
{ "display_name": "Bilal Ahmed" }
```
**Response:** `{ "data": User }`

**Notes:** Called immediately after Supabase Auth OTP/magic link verification.
The user_id comes from the validated JWT, not from the request body.

---

#### `GET /auth/me`
Get the current user's profile and active membership.

**Response:**
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

#### `PATCH /auth/me`
Update display name.

**Request:** `{ "display_name": "Bilal Bhai" }`
**Response:** `{ "data": User }`

---

### 5.2 Neighborhoods

#### `GET /neighborhoods/search` `[public]`
Search neighborhoods by name. Used during onboarding before auth.

**Query params:** `?q={query}&city={city_optional}&limit=10`
**Response:** `{ "data": Neighborhood[] }`

**Notes:** Returns neighborhoods ordered by `member_count DESC` when query
matches multiple results. Public endpoint — no auth required.

---

#### `POST /neighborhoods`
Create a new neighborhood.

**Request:** `CreateNeighborhoodRequest`
**Response:** `{ "data": Neighborhood }`

**Notes:** Creates the neighborhood and automatically joins the creator as
a Tier 1 member. Does not auto-assign anchor — anchor assignment is manual
via platform admin (service role) for the prototype.

---

#### `GET /neighborhoods/{neighborhood_id}`
Get neighborhood details.

**Response:** `{ "data": Neighborhood }`

---

#### `POST /neighborhoods/{neighborhood_id}/join`
Join a neighborhood as Tier 1.

**Request:** none
**Response:**
```json
{
  "data": {
    "membership": NeighborhoodMembership,
    "neighborhood": Neighborhood
  }
}
```

**Error codes:**
- `ALREADY_MEMBER` — user is already an active member
- `NEIGHBORHOOD_NOT_FOUND`
- `NEIGHBORHOOD_INACTIVE`

---

#### `GET /neighborhoods/{neighborhood_id}/anchor`
Get the current active anchor for a neighborhood.

**Response:** `{ "data": AnchorRole | null }`

---

### 5.3 Posts (Feed)

#### `GET /neighborhoods/{neighborhood_id}/posts`
Get the neighborhood feed. Paginated.

**Query params:**
```
?limit=20           (default 20, max 50)
&before={post_id}   (cursor-based pagination — posts before this ID)
&emergency_only=true (optional filter)
```

**Response:**
```json
{
  "data": {
    "posts": Post[],
    "has_more": boolean,
    "next_cursor": string | null
  }
}
```

**Notes:**
- Posts ordered: pinned emergency posts first (by `created_at DESC`), then
  all others by `created_at DESC`.
- Tier 1 members get the feed but cannot create posts.
- Soft-deleted posts excluded.

---

#### `POST /neighborhoods/{neighborhood_id}/posts`
Create a post. Requires Tier 2+.

**Request:** `CreatePostRequest`
**Response:** `{ "data": Post }`

**Notes:**
After inserting the post (with `ai_classification = null`), the endpoint
returns immediately with the created post. Classification is enqueued as
a background task — it does not block the response. The Supabase Realtime
channel broadcasts the initial post to all subscribers. A second broadcast
fires when `ai_classification` is set (UPDATE event).

---

#### `PATCH /neighborhoods/{neighborhood_id}/posts/{post_id}/resolve`
Mark a post as resolved. Author or anchor only.

**Request:** none
**Response:** `{ "data": Post }`

**Error codes:**
- `NOT_AUTHOR_OR_ANCHOR` — requestor is neither the author nor the anchor
- `ALREADY_RESOLVED`
- `POST_NOT_FOUND`

---

#### `POST /neighborhoods/{neighborhood_id}/posts/{post_id}/flag`
Flag a post for moderation. Tier 2+ only.

**Request:** `FlagPostRequest`
**Response:** `{ "data": { "flag_id": string } }`

**Error codes:**
- `ALREADY_FLAGGED` — user has already flagged this post
- `CANNOT_FLAG_OWN_POST`

---

### 5.4 AI Classification (Internal)

This endpoint is called by the background task after post creation.
Not directly callable by frontend users — protected by service token.

#### `POST /internal/classify`

**Headers:** `X-Service-Token: {internal_service_token}`
**Request:**
```json
{
  "post_id": "uuid",
  "content": "Transformer blast ہوگئی, bijli nahi hai",
  "category": "power",
  "neighborhood_context": {
    "recent_emergency_count": 2,
    "neighborhood_name": "Block 5, DHA Phase 5"
  }
}
```
**Response:**
```json
{
  "data": {
    "post_id": "uuid",
    "classification": "emergency",
    "confidence": 0.97,
    "language_detected": "mixed",
    "reasoning": "Power outage reported with urgency markers in mixed Urdu/English"
  }
}
```

**Notes:** On receiving this response, the classification service updates
the post record and, if `classification == 'emergency'`, triggers the push
notification service.

---

### 5.5 Verification

#### `POST /neighborhoods/{neighborhood_id}/verification/initiate`
Begin a Tier 2 verification attempt.

**Request:** `InitiateVerificationRequest`
**Response:** `{ "data": VerificationRecord }`

**Notes:**
Creates the verification record with `status = 'pending'`. Returns the
record immediately. The upload URL(s) are obtained separately via the
document upload endpoint.

**Error codes:**
- `ALREADY_VERIFIED` — user is already Tier 2+ in this neighborhood
- `PENDING_VERIFICATION_EXISTS` — a pending attempt already exists
- `ALREADY_TIER_TARGET` — already at or above the requested tier

---

#### `POST /neighborhoods/{neighborhood_id}/verification/upload`
Get a signed upload URL for a verification document.

**Request:**
```json
{
  "verification_record_id": "uuid",
  "document_type": "rental_agreement",
  "file_name": "agreement.pdf",
  "mime_type": "application/pdf",
  "file_size_bytes": 245000
}
```
**Response:**
```json
{
  "data": {
    "document_id": "uuid",
    "upload_url": "https://...",  // Signed Supabase Storage URL, expires 15min
    "storage_path": "..."
  }
}
```

**Notes:** The frontend uploads directly to the signed URL (PUT request to
Supabase Storage). This endpoint does not handle the file bytes — only
issues the signed URL and records the document reference.

---

#### `POST /neighborhoods/{neighborhood_id}/verification/submit`
Signal that all documents have been uploaded and verification should begin.

**Request:** `{ "verification_record_id": "uuid" }`
**Response:** `{ "data": VerificationRecord }`

**Notes:**
Triggers the background OCR and review task. Updates record status to
`'pending'` with `submitted_at = now()`. The review task processes
documents, attempts OCR, and either auto-approves (high OCR confidence),
flags for manual review (low confidence), or auto-rejects (no matching
address found). On decision, sends push notification.

---

#### `GET /neighborhoods/{neighborhood_id}/verification/status`
Get the current user's verification status for this neighborhood.

**Response:** `{ "data": VerificationRecord | null }`

---

### 5.6 Tier 3 Vouching

#### `POST /neighborhoods/{neighborhood_id}/vouching/request`
Request Tier 3 vouching (initiated by the candidate).

**Request:** none
**Response:** `{ "data": Tier3VouchingRequest }`

**Error codes:**
- `ALREADY_TIER3`
- `PENDING_REQUEST_EXISTS`
- `NO_ACTIVE_ANCHOR` — neighborhood has no anchor yet

---

#### `POST /neighborhoods/{neighborhood_id}/vouching/{request_id}/anchor-sign`
Anchor co-signs a Tier 3 request. Anchor only.

**Request:** none
**Response:** `{ "data": Tier3VouchingRequest }`

**Error codes:**
- `NOT_ANCHOR`
- `CANNOT_VOUCH_SELF`
- `REQUEST_NOT_PENDING`

---

#### `POST /neighborhoods/{neighborhood_id}/vouching/{request_id}/cosign`
Second member co-signs a Tier 3 request. Any Tier 2+ member (not the
anchor, not the candidate).

**Request:** none
**Response:** `{ "data": Tier3VouchingRequest }`

**Notes:** If both signatures are now present (`anchor_signed = true` AND
`cosigner_signed = true`), the service automatically upgrades the candidate's
tier to 3 and marks the request as `approved`.

**Error codes:**
- `CANNOT_COSIGN_AS_ANCHOR` — the anchor must use the anchor-sign endpoint
- `CANNOT_COSIGN_OWN_REQUEST`
- `ALREADY_COSIGNED`

---

#### `GET /neighborhoods/{neighborhood_id}/vouching/pending`
Get all pending Tier 3 requests. Anchor only.

**Response:** `{ "data": Tier3VouchingRequest[] }`

---

### 5.7 Anchor Moderation

All endpoints in this section require the requesting user to be the active
anchor of the specified neighborhood.

#### `DELETE /neighborhoods/{neighborhood_id}/posts/{post_id}`
Remove a post from the feed.

**Request:** `{ "reason": "string (optional, max 200 chars)" }`
**Response:** `{ "data": { "post_id": string, "removed_at": string } }`

**Notes:** Soft-deletes the post (`deleted_at = now()`). Writes to
`anchor_actions_log`. Post disappears from all members' feeds immediately
via Supabase Realtime UPDATE event.

---

#### `PATCH /neighborhoods/{neighborhood_id}/posts/{post_id}/classification`
Override AI classification.

**Request:** `OverrideClassificationRequest`
**Response:** `{ "data": Post }`

**Notes:** Writes to `anchor_actions_log` with metadata containing the
previous classification. If new classification is `'emergency'`, sets
`is_emergency = true` and `is_pinned = true`. If overriding away from
emergency, sets both to `false`.

---

#### `GET /neighborhoods/{neighborhood_id}/moderation/queue`
Get posts flagged by members (ordered by flag count desc).

**Response:**
```json
{
  "data": {
    "flagged_posts": Array<Post & { flag_count: number, flag_types: FlagType[] }>,
    "total": number
  }
}
```

---

#### `GET /neighborhoods/{neighborhood_id}/moderation/log`
Get the anchor's action log for this neighborhood.

**Query params:** `?limit=50&before={log_id}`
**Response:**
```json
{
  "data": {
    "actions": AnchorActionLog[],
    "has_more": boolean
  }
}
```

Where `AnchorActionLog` is:
```typescript
interface AnchorActionLog {
  id: string
  action_type: AnchorActionType
  target_type: 'post' | 'user' | 'verification_request'
  target_id: string
  reason: string | null
  created_at: string
}
```

---

### 5.8 Worker Directory

#### `GET /neighborhoods/{neighborhood_id}/workers`
Get all worker listings for the neighborhood.

**Query params:** `?category={category}&verified_only=true`
**Response:** `{ "data": WorkerListing[] }`

**Notes:** `contact_phone` is included only if the requesting user is Tier 2+.
The API enforces this — the frontend does not need to filter.

---

#### `POST /neighborhoods/{neighborhood_id}/workers`
Add a worker listing. Tier 2+ only.

**Request:** `CreateListingRequest`
**Response:** `{ "data": WorkerListing }`

---

#### `POST /neighborhoods/{neighborhood_id}/workers/{listing_id}/confirm-job`
Confirm a job occurred (prerequisite for leaving a review).

**Request:** `ConfirmJobRequest`
**Response:** `{ "data": { "confirmed": true, "listing_id": string } }`

**Notes:** Creates a review record with `job_confirmed = true` and
`rating = null`, `review_text = null`. The review is in a "confirmed but
unwritten" state. A subsequent PUT to the review endpoint submits the
actual rating and text.

---

#### `GET /neighborhoods/{neighborhood_id}/workers/{listing_id}/reviews`
Get reviews for a worker listing.

**Response:** `{ "data": WorkerReview[] }`

---

#### `POST /neighborhoods/{neighborhood_id}/workers/{listing_id}/reviews`
Submit a review. Only available after job confirmation.

**Request:** `CreateReviewRequest`
**Response:** `{ "data": WorkerReview }`

**Error codes:**
- `JOB_NOT_CONFIRMED` — must confirm job before reviewing
- `ALREADY_REVIEWED`

---

### 5.9 Civic Dashboard

#### `GET /neighborhoods/{neighborhood_id}/dashboard`
Get the latest civic dashboard snapshot. Tier 2+ only.

**Query params:** `?period=7` (7, 30, or 90 — default 30)
**Response:** `{ "data": CivicDashboardSnapshot }`

**Notes:** Returns the most recent pre-computed snapshot for the requested
period. If no snapshot exists (new neighborhood), triggers an immediate
computation and returns the result (may be slower — acceptable for demo).

---

#### `POST /neighborhoods/{neighborhood_id}/dashboard/export`
Generate and return a plain-text summary for sharing. Tier 2+ only.

**Request:** `ExportDashboardRequest`
**Response:**
```json
{
  "data": {
    "export_text": "Neighborhood: Block 5, DHA Phase 5...",
    "period_days": 30,
    "generated_at": "2026-06-11T14:30:00Z"
  }
}
```

**Notes:** The export text format:
```
HALQA NEIGHBORHOOD REPORT
Block 5, DHA Phase 5, Lahore
Period: Last 30 days (May 12 – June 11, 2026)
Generated: June 11, 2026

SUMMARY
Total incidents reported: 15
Resolved: 11 (73%)
Active members who reported: 8

BREAKDOWN
Power outages:    6  (4 resolved)
Security:         4  (3 resolved)
Infrastructure:   3  (3 resolved)
Water:            1  (1 resolved)
General:          1  (0 resolved)

This report was generated by Halqa (halqa.pk).
For questions, contact your neighborhood anchor.
```

---

### 5.10 Push Notifications

#### `POST /notifications/subscribe`
Register a push notification subscription (Web Push).

**Request:**
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```
**Response:** `{ "data": { "subscribed": true } }`

---

#### `POST /notifications/unsubscribe`
Remove push subscription.

**Request:** `{ "endpoint": "string" }`
**Response:** `{ "data": { "unsubscribed": true } }`

---

## 6. AI Classification Layer

### 6.1 Overview

The AI classification layer runs as a FastAPI background task immediately
after a post is created. It calls the Anthropic Claude API, classifies the
post, and updates the post record. If the post is classified as an emergency,
it also triggers push notifications to all Tier 2+ neighborhood members.

### 6.2 Classification Prompt

```python
CLASSIFICATION_SYSTEM_PROMPT = """
You are a classification system for a Pakistani neighborhood coordination
platform called Halqa. Your job is to classify posts written by verified
neighborhood residents.

Posts may be written in English, Urdu (in Nastaliq script), Roman Urdu
(transliterated Urdu written in Latin characters), or a mix of these.
Common Pakistani terms you will encounter: bijli (electricity/power),
chori (theft), sadak (road), pani (water), transformer, load shedding,
WAPDA, KESC, LESCO, mohalla, gali, society.

Classify each post into exactly one of these three categories:
- emergency: Requires immediate neighbor attention. Includes: power
  outages, fires, robberies or security threats, medical emergencies,
  structural dangers, flooding.
- community: General neighborhood information, announcements, questions,
  social updates. Does not require immediate action.
- general: Routine content, marketplace-adjacent, opinions, complaints
  without urgency.

Respond with valid JSON only. No preamble, no explanation.
"""

CLASSIFICATION_USER_PROMPT = """
Post category selected by user: {category}
Post content: {content}
Recent emergency count in this neighborhood (last 24h): {recent_emergency_count}

Classify this post. Respond with:
{{
  "classification": "emergency" | "community" | "general",
  "confidence": 0.0 to 1.0,
  "language_detected": "en" | "ur" | "mixed",
  "reasoning": "one sentence"
}}
"""
```

### 6.3 Classification Logic

```python
async def classify_post(post_id: UUID, content: str, category: str,
                         recent_emergency_count: int) -> ClassificationResult:

    response = await anthropic_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=200,
        system=CLASSIFICATION_SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": CLASSIFICATION_USER_PROMPT.format(
                category=category,
                content=content,
                recent_emergency_count=recent_emergency_count
            )
        }]
    )

    result = json.loads(response.content[0].text)
    classification = result["classification"]
    confidence = result["confidence"]
    language = result["language_detected"]

    # Update post record
    await post_repo.update_classification(
        post_id=post_id,
        classification=classification,
        confidence=confidence,
        language_detected=language,
        is_emergency=(classification == "emergency"),
        is_pinned=(classification == "emergency")
    )

    # Trigger notifications if emergency
    if classification == "emergency":
        await notification_service.send_emergency_alert(post_id)

    return ClassificationResult(
        post_id=post_id,
        classification=classification,
        confidence=confidence,
        language_detected=language
    )
```

### 6.4 OCR for Verification Documents

```python
VERIFICATION_OCR_SYSTEM_PROMPT = """
You are a document verification assistant for a Pakistani neighborhood
platform. You receive images or PDFs of Pakistani identity and address
documents. Your job is to extract the person's name and address from
the document.

Pakistani utility bill providers: LESCO, IESCO, KESC, SNGPL, SSGC,
PESCO, QESCO, GEPCO. Pakistani address formats vary widely — they may
include house numbers, street numbers, block letters, phase numbers,
sector names, or informal locality names. Extract whatever is present.

Respond with valid JSON only.
"""

VERIFICATION_OCR_USER_PROMPT = """
Document type declared by user: {document_type}
Address submitted by user: {address_submitted}

Extract the name and address from this document. Respond with:
{{
  "name_found": "extracted name or null",
  "address_found": "extracted address or null",
  "address_match_confidence": 0.0 to 1.0,
  "document_readable": true | false,
  "notes": "any relevant observations"
}}

Address match confidence should reflect how closely the extracted address
matches the address submitted by the user (0.0 = no match, 1.0 = exact).
"""
```

**OCR decision thresholds:**
- `address_match_confidence >= 0.75` → auto-approve
- `0.40 <= address_match_confidence < 0.75` → flag for manual review
  (status stays `pending`, reviewer_notes set)
- `address_match_confidence < 0.40` OR `document_readable = false` →
  auto-reject with appropriate `rejection_reason`

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

# Anthropic
ANTHROPIC_API_KEY={api_key}

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
| `ANTHROPIC_API_KEY` | Same key, dev model | Same key | Same key |
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
│   ├── seed.sql
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
- **Anthropic API:** Token usage monitored via Anthropic console to avoid
  unexpected spend during the demo period

No APM, error tracking, or alerting beyond the above for the prototype.
Post-hackathon: Sentry for error tracking, Uptime Robot for availability.

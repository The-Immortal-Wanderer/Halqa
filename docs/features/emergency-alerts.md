# Feature Spec: Emergency Alerts + AI Classification

**Status:** Complete (June 17, 2026)
**Depends on:** Verification flow (complete), Authentication (complete)
**Produces:** The neighborhood feed with post creation, AI-powered alert
triage, real-time delivery to verified members, the resolved state, and
the notification banner for emergency posts.

---

## Overview

The neighborhood feed is where the platform's core value proposition
becomes visible. Verified members post updates. The AI classification
layer runs on every post and tags it with a category and urgency level.
Emergency posts surface at the top of the feed and trigger an in-app
banner. Supabase Realtime delivers new posts to all open clients without
polling. The post author and community anchor can mark a post as resolved.

This feature is the primary demo artifact — judges will see the feed,
create a post, watch it classified, and see the civic signal layer in
action. Every implementation decision should prioritize demo reliability
over feature completeness.

---

## Post Categories

Five categories, matching the civic dashboard color encoding:

| Value | Display label | Urdu label | Phosphor Icon |
|-------|--------------|------------|---------------|
| `power` | Power / Electricity | بجلی | `Lightning` |
| `security` | Security | حفاظت | `Shield` |
| `infrastructure` | Infrastructure | سڑک | `Wrench` |
| `water` | Water | پانی | `Drop` |
| `general` | General | عام | `ChatText` |

Emergency flag (`is_emergency: boolean`) is separate from category.
A power outage can be emergency or non-emergency. A security incident
almost always is. The AI sets both independently.

---

## Screens

### Screen A — Neighborhood Feed (`/feed` or `/neighborhoods/[id]/feed`)

**Route:** `app/(app)/feed/page.tsx`
**Auth required:** Yes. Tier 1 members see the feed read-only with the
amber banner. Tier 2+ members see the full feed with post creation.

**Layout:**

Top header bar:
- Left: Halqa mark 24px
- Center: neighborhood name (15px 600 ink-primary) + sector (12px ink-mid)
- Right: Bell icon (notifications) + ShieldCheck icon (verification
  status badge — teal if Tier 2, sand-dark if Tier 1)

Tier 1 amber banner (if member is tier_1, persistent, no dismiss):
ShieldCheck icon + "Browsing as unverified member. Verify to post."
+ "Verify now →" link to /verify/upload
Background: `bg-halqa-amber-light`, text: `text-halqa-amber-dark`

Feed filters (horizontal scroll, below header):
Pill buttons, single-select (teal filled when active, ghost when inactive):
"All" | "⚠ Emergency" | "بجلی Power" | "حفاظت Security" |
"سڑک Infra" | "پانی Water" | "عام General"
Default: "All" active.

Post cards (vertical list, 12px gap between cards):
Standard card: white bg, 1px sand-mid border, 14px radius, 24px padding
Emergency card: amber left border 4px, amber-light bg
(See Post Card component spec below)

Empty feed state:
Users Phosphor icon 48px sand-dark (centered)
"Your neighborhood is getting started."
"Posts from verified neighbors will appear here. Be the first to say
something."
CTA button "Post to the neighborhood" (primary, teal) — only for Tier 2+

Floating action button (FAB) — bottom right, above tab bar:
PencilSimple icon 24px white, 56px circle, bg-halqa-teal
Visible only to Tier 2+ members.
Tapping opens the post creation bottom sheet.

---

### Post Card Component (`components/feed/PostCard.tsx`)

**Emergency variant** (is_emergency: true):
- Left border: 4px solid `--color-halqa-amber`
- Background: `bg-halqa-amber-light`
- Category chip: amber background, amber-dark text, Warning icon

**Standard variant**:
- Left border: none
- Background: white
- Category chip: teal-light background, teal-dark text, category icon

**Card content (top to bottom):**
1. Row: Category chip (left) + timestamp (right, 11px ink-light, relative:
   "2 minutes ago", "1 hour ago", "Yesterday")
2. Post body text (15px ink-primary, max 4 lines with "Show more" if
   longer). `dir="auto"` on the text container for bilingual rendering.
3. Row: Verified badge (tier_2 → ShieldCheck teal 12px + "Verified
   member" 11px ink-light; tier_1 → omit) + flex-grow spacer +
   response count (ChatText icon 14px + count, ink-light, 11px)
4. Resolved banner (if post.resolved_at is not null):
   Full-width row, success-bg, CheckCircle success icon 14px,
   "Resolved · [relative time]" (12px success color)
   Replaces the amber emergency styling with success styling.

**Interactions:**
- Tap anywhere on card → navigate to post detail page (out of scope
  for this sprint — log "post detail not implemented" for now)
- Long press → show action sheet with "Report" option (log "report
  not implemented" for now)

---

### Post Creation Bottom Sheet

**Trigger:** FAB on the feed
**Component:** `components/feed/PostCreationSheet.tsx`
**Only accessible to Tier 2+ members** (FAB hidden for Tier 1)

**Layout (modal bottom sheet, slides up):**

Sheet handle (4px × 32px, sand-dark, 8px from top, centered)

Title row: "Post to [Neighborhood Name]" (15px 600 ink-primary)
+ close X button (right)

Category selector: 5 tappable rows (single-select required):
Each row: category icon 20px (ink-mid when unselected, teal when
selected) + category label in English + Urdu label (secondary ink)
+ right-side selection indicator (empty circle → filled teal circle)
No default selection — user must choose a category.

"Is this an emergency?" toggle:
Label text (15px ink-primary) + iOS-style toggle switch (right)
Default: off. Turning it on shows a 12px amber text below:
"Emergency posts appear at the top of the feed and alert all members."
This toggle is the user's declaration — AI classification also runs
independently and may override `is_emergency` if confidence is high
enough (see AI logic below).

Post body textarea:
Placeholder: "What's happening in your neighborhood? / آپ کے محلے میں
کیا ہو رہا ہے؟"
Min height 80px, max height 200px (grows with content).
Character counter: "0 / 500" (right-aligned, 11px ink-light).
Hard limit: 500 characters.
`dir="auto"` on the textarea.

Submit button "Post" (primary teal, full width):
Disabled until category is selected AND body has ≥ 3 characters.
On tap:
1. Call POST /api/v1/posts
2. Optimistically add the post to the feed (before API response)
3. Close the sheet
4. If API returns error: show danger toast, mark optimistic post
   as failed (show "Failed to post — tap to retry" state on the card)

---

## Realtime Feed

Posts are delivered to all connected clients via Supabase Realtime.

**Frontend subscription** (in the feed page, on mount):
```typescript
supabase
  .channel(`neighborhood:${neighborhoodId}:posts`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'posts',
    filter: `neighborhood_id=eq.${neighborhoodId}`
  }, (payload) => {
    // Prepend new post to feed state
    // If is_emergency: true, also show the emergency banner
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'posts',
    filter: `neighborhood_id=eq.${neighborhoodId}`
  }, (payload) => {
    // Update the post in feed state (handles resolved_at being set)
  })
  .subscribe()
```

**Emergency in-app banner:**
When a new post arrives via Realtime with `is_emergency: true`,
show the emergency banner (slides down from below the header):
- Background: `bg-halqa-amber`
- Content: WarningCircle icon 20px white + category label 12px white
  500 weight + post body truncated to 1 line 13px white
- Right: ChevronRight icon white
- Tappable: scrolls feed to the emergency post (no separate detail page)
- Auto-dismisses after 6 seconds
- Swipe up to dismiss early
- Under prefers-reduced-motion: appears/disappears instantly

---

## AI Classification

Every post is classified asynchronously after creation.
The classification result updates the post record, which Realtime
broadcasts to all connected clients (triggering the UPDATE handler above).

**Backend classification flow** (in post_service.py):
1. Create post record with user-declared `category` and `is_emergency`
2. Return the post immediately (don't wait for classification)
3. asyncio.create_task(classify_post(post_id, body, declared_category,
   declared_is_emergency))

**classify_post() in classification_service.py:**

The service already has the core implementation from the scaffold.
Verify it handles Pakistani mixed-language input correctly.

The classification prompt must:
- Handle Urdu script, Roman Urdu, and code-switched Pakistani English
- Recognize Pakistani-specific terms: bijli (power), chori/security,
  sadak (road/infrastructure), pani (water), transformer, WAPDA, LESCO,
  IESCO, KESC, SNGPL, DHA, Bahria Town, mohalla, gali, chowkidar
- Return JSON only: `{"category": "power|security|infrastructure|water|general",
  "is_emergency": true|false, "confidence": 0.0-1.0,
  "civic_signal": "brief 1-sentence description for the dashboard"}`

After classification:
- If confidence >= 0.70: update post.category and post.is_emergency
  with AI values (override user-declared values if different)
- If confidence < 0.70: keep user-declared values, set
  classification_confidence = confidence (for transparency)
- Always update post.ai_civic_signal with the civic_signal string
- Always update post.classification_confidence
- Realtime UPDATE on the post record broadcasts these changes to
  all connected clients automatically

**The civic_signal field** is what feeds the civic dashboard —
it is a compressed, structured summary of what happened:
"Power outage reported on Street 4, G-11/3 at 9:30pm"
This field must be populated for every post that has a category
other than 'general'.

---

## Post Resolved State

**Who can mark a post as resolved:**
- The post author (any tier)
- The community anchor for the neighborhood

**How:**
Long press on a post card → action sheet → "Mark as resolved"
Only visible to the author or anchor — check author_id === current_user_id
OR is_anchor check via the membership data.

**API call:** PATCH /api/v1/posts/{post_id}/resolve
**Body:** none (user identity comes from JWT)
**Guard:** 403 if caller is neither the author nor the anchor

**Visual result:** The post updates via Realtime UPDATE. The amber
emergency styling is replaced by success styling. The resolved banner
appears at the bottom of the card.

---

## Backend Endpoints Required

### POST /api/v1/posts
**Auth:** Required, Tier 2+ (guard: raise 403 INSUFFICIENT_TIER for tier_1)
**Body:**
```json
{
  "neighborhood_id": "uuid",
  "body": "string (3-500 chars)",
  "category": "power|security|infrastructure|water|general",
  "is_emergency": "boolean"
}
```
**Logic:**
1. Validate body length (3–500 chars)
2. Confirm caller is Tier 2+ member of the neighborhood
3. Insert post record (status: published, user-declared category and
   is_emergency, civic_signal: null initially)
4. asyncio.create_task(classify_post(...))
5. Return the created post immediately
**Response:**
```json
{
  "data": {
    "id": "uuid",
    "body": "string",
    "category": "power",
    "is_emergency": false,
    "civic_signal": null,
    "classification_confidence": null,
    "resolved_at": null,
    "created_at": "iso8601",
    "author": {
      "id": "uuid",
      "display_name": "string",
      "tier": "tier_2"
    }
  },
  "error": null
}
```

### GET /api/v1/posts
**Auth:** Required (any tier — tier_1 can read)
**Query params:** `neighborhood_id` (required), `category` (optional filter),
`emergency_only` (boolean, optional), `limit` (default 20), `before` (cursor
for pagination — ISO8601 timestamp of the oldest post currently loaded)
**Logic:** Return posts for the neighborhood, ordered by:
1. Emergency posts (is_emergency: true, resolved_at: null) first
2. Then all other posts by created_at DESC
**Response:** Array of post objects (same shape as POST response)

### PATCH /api/v1/posts/{post_id}/resolve
**Auth:** Required
**Guard:** Caller must be post author OR anchor for the neighborhood
**Logic:** Set posts.resolved_at = now()
**Response:**
```json
{
  "data": { "resolved_at": "iso8601" },
  "error": null
}
```

---

## Database Notes

The `posts` table already exists from the initial migration. Verify
these columns are present and add a migration if any are missing:
- `ai_civic_signal` TEXT (the structured civic summary for dashboard)
- `classification_confidence` FLOAT
- `is_emergency` BOOLEAN DEFAULT false
- `resolved_at` TIMESTAMPTZ nullable
- `category` post_category enum

The `post_category` enum should have values:
`power, security, infrastructure, water, general`

If the enum or any column is missing, create a migration:
`supabase/migrations/20260612_002_posts_ai_fields.sql`

---

## Seed Data for Demo

The demo neighborhood (id: 00000000-0000-0000-0000-000000000001) needs
realistic seed posts to make the civic dashboard meaningful. After the
post creation endpoint is working, insert via direct Supabase SQL:

5 seed posts for the demo neighborhood:
1. Emergency / power — "Transformer blast ho gaya Street 4 pe, bijli
   gayi puri gali ki" — created_at: 3 hours ago, is_emergency: true,
   civic_signal: "Power outage reported on Street 4 following transformer
   failure", resolved_at: null
2. Security — "Raat ko 2 baje suspicious car thi Block B ke bahar,
   number plate noted" — created_at: 1 day ago, is_emergency: false,
   civic_signal: "Suspicious vehicle reported outside Block B at 2am"
3. Power / resolved — "WAPDA wale aa gaye, bijli aa jayegi 1 ghante mein"
   — created_at: 2 days ago, is_emergency: false, resolved_at: 2 days
   ago (30 min after created_at), civic_signal: "Power restoration
   update — WAPDA crew on-site"
4. Infrastructure — "Nali band hai gali number 3 mein, pani aa raha hai
   raste pe" — created_at: 3 days ago, is_emergency: false,
   civic_signal: "Blocked drain causing street flooding on Gali 3"
5. General — "Eid mubarak neighbors, dawat hai hamare ghar Saturday 7pm"
   — created_at: 5 days ago, is_emergency: false, civic_signal: null

These posts should be inserted using the service-role client (bypass
RLS). The author_id can be a placeholder UUID
(00000000-0000-0000-0000-000000000002) — create a minimal user row for
it if needed.

---

## Completion Criteria

- [x] Feed loads with posts in correct order (emergency first, then
      by time)
- [x] Post creation: category selection + body + emergency toggle →
      POST /api/v1/posts → optimistic update in feed
- [x] AI classification runs after post creation and updates the post
      (visible via Realtime UPDATE in the feed within a few seconds)
- [x] Emergency banner appears when is_emergency post arrives via Realtime
- [x] Resolved state: long press → mark resolved → success styling via
      Realtime UPDATE
- [x] Tier 1 members see feed read-only (amber banner, no FAB, no post
      creation)
- [x] Feed filter pills work (category filter, emergency filter)
- [x] 5 seed posts visible in the demo neighborhood
- [x] next build passes with 0 errors
- [x] AGENTS.md "Emergency alerts + AI classification" → Complete
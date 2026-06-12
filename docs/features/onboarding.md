# Feature Spec: Onboarding

**Status:** Ready for implementation
**Depends on:** Authentication wiring (complete), Database migrations (complete)
**Produces:** The complete new-user flow from app entry to neighborhood feed

---

## Overview

Five screens taking a new user from first open to their first neighborhood
membership. No feature tours, no illustrations, no skip buttons that frame
onboarding as an obstacle. Progressive commitment: the user is inside the
product by Screen 3, not still reading about it.

Auth uses email + password (phone auth disabled — see auth wiring notes).
All references to "phone" in the visual identity spec are updated to "email"
for this implementation.

---

## Screens

### Screen 1 — Entry (`/onboarding` or `/`)

**Route:** `app/(onboarding)/page.tsx` or the root `app/page.tsx`
redirecting here for unauthenticated users.

**Layout:**
- Full sand background (`--color-halqa-sand` / `bg-halqa-sand`)
- Vertically centered content
- Halqa lockup: mark SVG at 48px equivalent + "Halqa" wordmark (Plus Jakarta
  Sans 600 28px) + "حلقہ" in Noto Nastaliq Urdu below (secondary ink color)
- Tagline below lockup (40px gap): "Your neighborhood, organized."
  Urdu below: "آپ کا حلقہ، منظم۔" (secondary ink, Nastaliq)
- Gap 32px
- Primary button (full width, 44px height): "Find my neighborhood"
  → navigates to Screen 2
- Ghost button below (16px gap): "I have an invite code"
  → placeholder route for now, log "invite code flow not yet implemented"

**No auth check on this screen** — it is the public entry point.
Authenticated users who land here should be redirected to `/feed`.

---

### Screen 2 — Neighborhood Search (`/onboarding/find`)

**Route:** `app/(onboarding)/find/page.tsx`

**Layout:**
- Header bar: back chevron (left), Halqa mark SVG 24px (right)
- Centered title: "Find your neighborhood" (H1, 18px 600)
- Search input (48px height, full width minus 32px margins):
  - Left icon: `MapPin` from Phosphor Icons, 20px, ink-light color
  - Placeholder: "Street name, society, or area"
  - `onChange` → debounced 300ms → calls `GET /neighborhoods/search?q={query}`
- Results list below input (no card borders, 1px dividers in sand-mid):
  - Each result: neighborhood name (15px ink-primary) + city/sector (13px
    ink-mid) + right-aligned member count (13px ink-light, e.g. "14 members")
  - Zero-member neighborhoods show "Start this neighborhood" in teal (13px)
    instead of member count
  - Tapping a result navigates to Screen 3 with the neighborhood data
- Bottom-pinned row (always visible):
  "Don't see your neighborhood? Add it." (13px teal link)
  → log "add neighborhood flow not yet implemented" for now

**API call:** `GET /api/v1/neighborhoods/search?q={query}&limit=10`
Backend returns array of `{id, name, name_urdu, city, sector, member_count}`.
If query is empty, return the 5 most recently active neighborhoods.

---

### Screen 3 — Neighborhood Confirmation (`/onboarding/confirm/[id]`)

**Route:** `app/(onboarding)/confirm/[id]/page.tsx`

**Layout:**
- Static map thumbnail at top: 180px tall, full bleed (no horizontal margin),
  border-radius 0. Use a placeholder image for MVP — a neutral map tile image
  with a subtle teal polygon overlay drawn in SVG on top. The actual
  neighborhood boundary from `neighborhoods.boundary_geojson` is null at
  MVP; use a generic placeholder tile. Do not integrate a map SDK for the
  prototype.
- Below map (24px padding): neighborhood name (22px 600 ink-primary)
- City/sector (15px ink-mid, 4px below name)
- Member count with Users icon (13px ink-light, 8px below)
- Teal-light info card (border 1px teal-light, bg teal-light, radius 14px,
  padding 16px, margin-top 24px):
  - ShieldCheck icon 20px teal inline-left
  - "Only verified residents of this neighborhood can see posts and
    participate." (13px ink-mid)
- Primary button (bottom, 24px above): "Join this neighborhood"
  → navigates to Screen 4 (passes neighborhood id in state or URL param)
- Below button (12px gap): "You'll verify your address in the next step."
  (13px ink-mid, centered)

**Data:** fetch `GET /api/v1/neighborhoods/{id}` on mount.

---

### Screen 4 — Account Creation (`/onboarding/register`)

**Route:** `app/(onboarding)/register/page.tsx`

**Note:** If the user is already authenticated (has a valid session), skip
this screen and go directly to Screen 5 (join the selected neighborhood).

**Layout:**
- Header: back chevron, centered title "Create your account"
- Three fields (16px gaps between):
  1. Display name
     Label: "Your name"
     Placeholder: "As your neighbors know you"
  2. Email
     Label: "Email address"
     Type: email
     Placeholder: "you@example.com"
  3. Password
     Label: "Create a password"
     Type: password with show/hide toggle (Eye / EyeSlash Phosphor icons)
     Helper text below (12px ink-light): "At least 8 characters"
- Terms line (24px below fields, 13px ink-mid centered):
  "By continuing, you agree to Halqa's "
  + teal underlined link "Community Guidelines"
  + " and "
  + teal underlined link "Privacy Policy"
  Both links → placeholder routes that show a simple text page for now.
- Primary button "Create account":
  Disabled (50% opacity, pointer-events none) until all three fields have
  content. Does NOT validate on keystroke — only on submit.
- On submit:
  1. Call POST /api/v1/auth/register {display_name, email, password}
  2. On success: call POST /api/v1/auth/login {email, password}
  3. Store session (access_token, refresh_token) via Supabase client
  4. Navigate to Screen 5

**Error handling:**
- 409 USER_ALREADY_EXISTS → show inline error below email field:
  "An account with this email already exists. Log in instead?" with a
  teal link to /login
- Any other error → show a toast/banner: "Something went wrong. Please
  try again." using the danger color scheme

---

### Screen 5 — Verification Entry (`/onboarding/verify`)

**Route:** `app/(onboarding)/verify/page.tsx`

**Layout:**
- Header: back chevron DISABLED (grayed, pointer-events none) — no going
  back to registration after account is created
- Vertically centered content:
  - ShieldCheck Phosphor icon 48px teal (centered)
  - 20px gap
  - "Verify your address" (22px 600 ink-primary, centered)
  - 12px gap
  - "We need to confirm that you live in [Neighborhood Name]. This keeps
    the community trustworthy for everyone."
    (15px ink-mid, centered, max-width 280px)
  - 32px gap
  - Three document type rows (informational, not tappable):
    Each row: FileText icon 20px ink-mid + document name 15px ink-primary
    Row 1: "Utility bill (LESCO, IESCO, SNGPL, KESC)"
    Row 2: "Rental agreement + any ID showing this address"
    Row 3: "Housing society membership card"
- Primary button (bottom): "Upload a document"
  → navigates to `/verify/upload` (the verification flow — next feature spec)
- Ghost button below (12px gap): "Skip for now — join as unverified"
  → calls POST /api/v1/members/join with tier: "tier_1"
  → navigates to `/feed` with tier_1 access
  → show a persistent banner in the feed: "You're browsing as an unverified
    member. Verify your address to post and interact."
    (amber surface background, amber text, dismiss button)

**On mount:** this screen must create the neighborhood_members row.
Call POST /api/v1/members/join:
  {neighborhood_id: [selected neighborhood id], tier: "tier_1",
   declared_address: ""}
This creates the Tier 1 membership immediately. If the user later completes
verification, the tier is upgraded. Do not wait for verification to create
the membership — the user is in the neighborhood from this point.

---

## Navigation Flow Summary

```
/ (entry)
  └── /onboarding/find (search)
        └── /onboarding/confirm/[id] (confirm neighborhood)
              └── /onboarding/register (create account)  ← skip if authed
                    └── /onboarding/verify (verification entry)
                          ├── /verify/upload  (→ next feature: verification flow)
                          └── /feed           (skip path, tier_1)
```

---

## API Endpoints Required

All must exist in the backend before the frontend build. Implement stubs
if full logic is not ready, returning plausible shaped responses.

| Method | Path | Notes |
|--------|------|-------|
| GET | /api/v1/neighborhoods/search | q param, limit param |
| GET | /api/v1/neighborhoods/{id} | single neighborhood |
| POST | /api/v1/members/join | creates neighborhood_members row |

### POST /api/v1/members/join request body:
```json
{
  "neighborhood_id": "uuid",
  "tier": "tier_1",
  "declared_address": ""
}
```
### Response:
```json
{
  "data": {
    "member_id": "uuid",
    "neighborhood_id": "uuid",
    "tier": "tier_1"
  },
  "error": null
}
```

---

## Component Checklist

All should already exist as stubs from the scaffold. Implement:

- `components/ui/Button.tsx` — primary, secondary, ghost, danger variants
  per visual identity spec. Accepts `disabled`, `loading` (spinner state),
  `fullWidth` props.
- `components/ui/Input.tsx` — label always above, focus ring teal, error
  state with message below. Accepts `label`, `error`, `helperText` props.
- `components/ui/PasswordInput.tsx` — extends Input with Eye/EyeSlash toggle
- `components/neighborhoods/NeighborhoodSearchResult.tsx` — single result row
- `components/neighborhoods/NeighborhoodCard.tsx` — confirmation screen card
- `components/onboarding/DocumentTypeRow.tsx` — icon + label row (Screen 5)
- `components/layout/OnboardingHeader.tsx` — back chevron + optional mark

---

## Design Token Usage

All styling via Tailwind classes using the Halqa tokens configured in
`tailwind.config.ts` during scaffold. Reference:

- Background: `bg-halqa-sand`
- Primary text: `text-halqa-ink`
- Secondary text: `text-halqa-ink-mid`
- Teal button bg: `bg-halqa-teal`, hover: `bg-halqa-teal-dark`
- Teal surface: `bg-halqa-teal-light`, border: `border-halqa-teal-light`
- Amber banner: `bg-halqa-amber-light`, text: `text-halqa-amber-dark`
- Dividers: `border-halqa-sand-mid`
- Border radius: `rounded-halqa-lg` (14px), `rounded-halqa-md` (10px)

Fonts load via next/font — use the CSS variable classes configured in
`app/layout.tsx` during scaffold.

---

## Completion Criteria

- [ ] All 5 screens render without errors
- [ ] Neighborhood search calls the API and displays results
- [ ] Full flow: search → confirm → register → membership created → feed
- [ ] Skip path: verify entry → "Skip for now" → feed with tier_1 banner
- [ ] Authenticated users landing on `/` redirect to `/feed`
- [ ] `next build` passes with 0 errors
- [ ] AGENTS.md "Onboarding feature" → Complete
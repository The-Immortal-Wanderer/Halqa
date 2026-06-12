# Feature Spec: Verification Flow

**Status:** Ready for implementation
**Depends on:** Onboarding feature (complete), Authentication (complete)
**Produces:** Complete Tier 2 address verification — upload, OCR processing,
pending/approved/rejected states, deep-link notification handling, and
the tier upgrade that unlocks full community feed access.

---

## Overview

Verification converts a Tier 1 (read-only) member into a Tier 2 (full access)
member. The user uploads a document proving their address. The OCR service
extracts the address from the document and compares it to the declared address.
High-confidence matches auto-approve. Low-confidence results go to a manual
review queue. The user is notified of the result via push notification with a
deep link back to the result screen.

This is the most trust-sensitive flow in the entire product. Every visual and
copy decision must reinforce that the process is secure, purposeful, and has
a known outcome.

---

## Document Types Accepted

Canonical list (replaces onboarding Screen 5 document rows — update those
rows to match during this implementation):

1. "Utility bill (LESCO, IESCO, SNGPL, KESC)"
2. "Rental agreement + any ID showing this address"
3. "Housing society membership card"

These map to document_type values in verification_documents:
'utility_bill', 'rental_agreement', 'society_card'

---

## Screens

### Screen A — Document Upload (`/verify/upload`)

**Route:** `app/(verify)/upload/page.tsx`
**Auth required:** Yes (redirects to /login if not authenticated)
**Entry point:** "Upload a document" button on onboarding Screen 5,
and the "Verify your address" CTA in the Tier 1 feed banner.

**Layout:**

Header: back chevron (active — user can go back to /onboarding/verify),
centered title "Verify your address"

Document type selector (above upload zone):
Three tappable rows using DocumentTypeRow component. One row selected
at a time (single-select). Selected state: teal-light background,
teal left border 3px, ShieldCheck icon replaces FileText icon.
Default: no selection. Upload button disabled until a type is selected.

Upload zone (180px tall, full width minus 32px margins):
- Border: 2px dashed sand-dark, border-radius 14px
- Content (centered): UploadSimple Phosphor icon 32px ink-light,
  "Tap to upload your document" (15px ink-primary),
  "JPG, PNG, or PDF — max 5MB" (13px ink-mid)
- Hover/tap state: border color transitions to teal (120ms)
- After file selected: zone collapses, replaced by file preview chip:
  File icon 16px + filename truncated to 24 chars + "×" remove button
  Chip: sand-mid background, radius 6px, padding 8px 12px

"Why do we need this?" disclosure (collapsed by default):
ChevronDown icon + "Why do we need this?" (13px teal, tappable)
Expanded content (13px ink-mid, 2 sentences max):
"We verify that you actually live in this neighborhood.
Your document is reviewed once and not stored after verification
is complete."

Primary button "Submit for verification":
Disabled until both a document type AND a file are selected.
On submit:
1. POST /api/v1/verification/submit (multipart/form-data):
   fields: member_id, declared_address (from neighborhood_members row),
   document_type, file
2. On success → navigate to Screen B (pending state)
3. On error → show danger banner: "Upload failed. Please try again."
   Preserve the selected file and type so the user doesn't have to
   reselect.

---

### Screen B — Pending (`/verify/pending`)

**Route:** `app/(verify)/pending/page.tsx`
**Entry point:** Navigated to after successful upload submission.
Also the landing screen for deep links when status is still 'pending'.

**Layout (full screen, vertically centered):**

Pulse indicator: a ring 48px diameter, 3px stroke, teal color,
single pulse animation (opacity 1.0 → 0.4 → 1.0, 1.5s ease-in-out,
runs once on mount, then stops — do not loop).
Under prefers-reduced-motion: static ring at 0.7 opacity, no animation.

"Verifying your address" (18px 600 ink-primary, centered, 20px below ring)

"This usually takes a few minutes." (15px ink-mid, 8px below headline)

"You can close the app — we'll notify you when it's done."
(13px ink-light, 8px below, centered, max-width 260px)

No CTA, no back button. The back chevron in the header is hidden.
The user should feel that something is happening, not that they are
waiting for something to happen.

**Polling:** Poll GET /api/v1/verification/status every 10 seconds.
If status returns 'approved' → navigate to Screen C.
If status returns 'rejected' → navigate to Screen D.
Stop polling when the component unmounts.

---

### Screen C — Approved (`/verify/result?status=approved`)

**Route:** `app/(verify)/result/page.tsx` with `?status=approved`
Also reachable via deep link: `halqa://verification/result?status=approved`

**Layout (full screen, vertically centered):**

Card: border 1px success color (#2E7D5C), background success-bg (#EBF6F1),
border-radius 14px, padding 24px, max-width 320px, centered horizontally.

CheckCircle Phosphor icon 28px success color (centered, top of card)
"Address verified" (18px 600 ink-primary, 16px below icon, centered)
"You're now a verified member of [Neighborhood Name]."
(15px ink-mid, 8px below headline, centered)

Primary teal button "Go to your neighborhood" (full width, 24px below text):
→ replaces entire navigation stack with /feed
→ the tab bar appears for the first time at this moment

**On mount:** call PATCH /api/v1/verification/upgrade-tier to upgrade
the calling user's membership from tier_1 to tier_2 for their neighborhood.
This must happen before navigating to /feed — the feed uses tier to
determine what the user can see and do.

**Animation:** The card fades in over 200ms after mount (opacity 0 → 1).
The button fades in 400ms after mount (200ms delay after card).
Under prefers-reduced-motion: no animation, both visible immediately.

---

### Screen D — Rejected (`/verify/result?status=rejected`)

**Route:** `app/(verify)/result/page.tsx` with `?status=rejected`
Also reachable via deep link: `halqa://verification/result?status=rejected`

**Layout (full screen, vertically centered):**

Card: border 1px danger (#B84040), background danger-bg (#FAEAEA),
border-radius 14px, padding 24px, max-width 320px, centered.

WarningCircle Phosphor icon 28px danger color (centered, top of card)
"We couldn't verify this document." (18px 600 ink-primary, centered)

Rejection reason (13px ink-mid, 8px below, centered):
Read from query param `?reason=` — map to human-readable string:
- address_mismatch → "The address on the document doesn't match
  what you entered."
- too_blurry → "The document was too blurry to read."
- name_not_found → "We couldn't find your name on this document."
- unsupported_type → "This document type isn't accepted."
- default (unknown) → "We weren't able to process this document."

Primary button "Try a different document" (full width, 24px below reason):
→ navigates back to Screen A (push, so back gesture returns here)

Ghost button "Ask for help" (full width, 12px below primary):
→ opens mailto:support@halqa.app
  (placeholder — use this address for the prototype)

**Tab bar does NOT appear on this screen.** The user is still Tier 1
and has not completed verification.

---

## Deep Link Handling

The frontend must register and handle the deep link scheme
`halqa://verification/result?status=[approved|rejected]&reason=[reason_code]`

For the Next.js PWA prototype, implement this as a URL redirect:
- Register a route `app/deeplink/page.tsx` that reads the URL parameters
  from the current URL when the app is opened (the PWA installable
  web app receives the URL as a query string on launch)
- Redirect to `/verify/result?status={status}&reason={reason}`

The push notification payload (sent by the backend notification service)
must include:
```json
{
  "title": "⚠ Verification Update — Halqa",
  "body": "Your address verification is complete. Tap to see the result.",
  "deep_link": "/verify/result?status=approved"
}
```

For the prototype, push notifications are simulated — the backend writes
to the notifications table (which Supabase Realtime broadcasts to the
frontend) rather than sending actual device push notifications. The
frontend subscribes to the user's notification channel and redirects
on receiving a verification result notification.

---

## Backend Endpoints Required

### POST /api/v1/verification/submit
**Auth:** Required
**Content-Type:** multipart/form-data
**Body:**
- `document_type`: string ('utility_bill' | 'rental_agreement' | 'society_card')
- `declared_address`: string (pulled from the user's neighborhood_members row)
- `file`: the uploaded document (jpg/png/pdf, max 5MB)

**Logic:**
1. Validate file type (jpg, jpeg, png, pdf only) and size (≤ 5MB)
2. Upload file to Supabase Storage bucket `verification-documents`
   Path: `{user_id}/{uuid}.{ext}`
3. Create verification_records row (status: 'pending')
4. Create verification_documents row (storage_path, document_type)
5. Trigger OCR asynchronously (asyncio.create_task):
   - Call ocr_service.extract_address(signed_url, declared_address)
   - On result: update verification_records with extracted_address,
     ocr_confidence, and apply threshold logic:
     - confidence >= 0.75 → status: 'approved', trigger tier upgrade
       + notification
     - confidence 0.40–0.749 → status: 'pending' (manual review queue,
       no further action for prototype — stays pending)
     - confidence < 0.40 → status: 'rejected', trigger rejection
       notification with appropriate reason code
6. Return immediately (do not wait for OCR):
```json
{
  "data": {
    "verification_record_id": "uuid",
    "status": "pending"
  },
  "error": null
}
```

### GET /api/v1/verification/status
**Auth:** Required
**Logic:** Returns the most recent verification_records row for the
calling user's active neighborhood membership.
**Response:**
```json
{
  "data": {
    "status": "pending | approved | rejected",
    "reason": "address_mismatch | too_blurry | name_not_found | unsupported_type | null"
  },
  "error": null
}
```

### PATCH /api/v1/verification/upgrade-tier
**Auth:** Required
**Logic:**
1. Confirm the calling user has an approved verification_record
2. Update neighborhood_members.tier to 'tier_2' for the calling user
3. Update neighborhood_members.tier_upgraded_at to now()
**Response:**
```json
{
  "data": { "tier": "tier_2" },
  "error": null
}
```
**Guard:** If no approved verification_record exists, return 403
VERIFICATION_REQUIRED. Do not allow self-upgrade without an approved record.

### OCR Service Note
`ocr_service.extract_address(signed_url, declared_address)` already exists
as a stub from the scaffold. Implement it fully:
- Generate a signed URL for the uploaded file from Supabase Storage
  (valid for 5 minutes — enough for the OCR call)
- Send the image/PDF to the Anthropic API as a vision request with the
  prompt: "Extract the address from this document. Return only the
  address text, nothing else. If no address is found, return empty string."
- Compare extracted address to declared_address using simple normalized
  string similarity (lowercase, strip punctuation, check if declared
  words appear in extracted text)
- Return: {extracted_address: str, confidence: float}

For PDF files: convert first page to image before sending to Anthropic.
Use pdf2image (requires poppler). If pdf2image is not available,
fall back to sending the raw PDF bytes — Anthropic's API accepts PDF
documents natively.

---

## Notification Wiring (Realtime substitute for push)

The backend notification_service must write to the notifications table
after a verification result. The frontend subscribes to this channel
and redirects accordingly.

**Backend** — after OCR result in verification_service:
```python
await notification_service.create(
    user_id=user_id,
    neighborhood_id=neighborhood_id,
    type="verification_approved",  # or "verification_rejected"
    title="Address verified" ,  # or "Verification unsuccessful"
    body="You're now a verified member...",  # or rejection message
    deep_link="/verify/result?status=approved"  # or rejected
)
```

**Frontend** — in Screen B (pending), subscribe to the user's
notification channel via Supabase Realtime:
```typescript
supabase
  .channel(`user:${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    if (payload.new.type === 'verification_approved') {
      router.push('/verify/result?status=approved')
    }
    if (payload.new.type === 'verification_rejected') {
      const reason = extractReasonFromDeepLink(payload.new.deep_link)
      router.push(`/verify/result?status=rejected&reason=${reason}`)
    }
  })
  .subscribe()
```

---

## Document Deletion Compliance

After OCR completes (regardless of result), the uploaded file must be
deleted from Supabase Storage:
```python
supabase.storage.from_("verification-documents").remove([storage_path])
```
Then update verification_documents.deleted_from_storage_at = now().

This is the privacy commitment made in the UI copy ("not stored after
verification is complete"). It must be implemented, not deferred.

---

## Tier 1 Feed Banner

The feed already redirects Tier 1 users correctly (from onboarding
skip path). Add a persistent amber banner at the top of the feed for
Tier 1 members:

```
[ShieldCheck icon] You're browsing as an unverified member.
Verify your address to post and interact.  [Verify now →]
```

Banner: bg-halqa-amber-light, text-halqa-amber-dark, no dismiss button
(persistent until verification is complete). "Verify now" links to
/verify/upload.

This banner should already exist as a stub — wire it to the user's
actual tier from the membership data.

---

## Completion Criteria

- [ ] All 4 screens render without errors
- [ ] Upload flow: file selected → submitted → pending screen shown
- [ ] OCR runs asynchronously after upload returns
- [ ] Approved path: OCR confidence ≥ 0.75 → notification → result screen
      → tier upgraded → /feed accessible as Tier 2
- [ ] Rejected path: OCR confidence < 0.40 → notification → rejected
      screen with correct reason → retry navigates to upload screen
- [ ] Document deleted from storage after OCR completes
- [ ] Tier 1 banner visible in feed for unverified members
- [ ] next build passes with 0 errors
- [ ] AGENTS.md "Verification flow" → Complete
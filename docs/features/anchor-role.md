# Feature Spec: Anchor Role + Moderation

**Status:** Complete (June 17, 2026)
**Depends on:** Feed (complete), Civic dashboard (complete)
**Produces:** The community anchor admin interface — moderation queue,
two-signature vouching, escalation, and audit logging. This is the screen
that makes the trust-and-safety claims in the submission demonstrable
rather than just stated.

---

## Overview

One anchor per neighborhood. The anchor has content moderation authority
(remove posts, resolve alerts — resolve is already implemented from the
feed phase) but NOT membership authority (cannot remove verified members —
that requires central platform action, out of scope for the prototype).

Four constraints from the refinement pass must be visible in this
implementation, not just described in the pitch:
1. Anchor authority is content-only, not membership-only
2. A 20% member threshold escalates any anchor moderation decision to
   central review
3. All anchor actions are logged (anchor_actions_log table — already exists)
4. Tier 3 vouching requires two signatures, not one

---

## Demo Setup

The demo neighborhood (Green Valley Housing Society,
00000000-0000-0000-0000-000000000001) needs an anchor assigned for the
demo to be meaningful. Check if an anchor_roles row already exists for
this neighborhood:

```sql
SELECT * FROM anchor_roles
WHERE neighborhood_id = '00000000-0000-0000-0000-000000000001'
AND is_active = true;
```

If none exists, assign the seed demo user (the one used to author seed
posts) as the anchor via a seed insert:
```sql
INSERT INTO anchor_roles (neighborhood_id, member_id, term_started_at,
  term_ends_at, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  [seed_member_id],
  now(),
  now() + interval '6 months',
  true
);
```

---

## Screens

### Anchor Dashboard (`/anchor`)

**Route:** `app/(app)/anchor/page.tsx`
**Access:** Only visible/reachable if the calling user has an active
anchor_roles row for their neighborhood. Non-anchors attempting to
navigate here see a 403-style "Not authorized" page, or the route is
simply not shown in navigation for non-anchors.

**Tab bar entry:** A 6th icon appears in the tab bar ONLY for anchors —
`ShieldCheck` icon, label "Anchor". Non-anchors see the standard 5 tabs.
This requires the tab bar component to check anchor status on load.

**Layout — top to bottom:**

#### 1. Header

"Community Anchor" (22px 600 ink-primary)
Neighborhood name (15px ink-mid, below)
Term info (13px ink-light): "Term ends [date]" — computed from
anchor_roles.term_ends_at

#### 2. Moderation Queue Section

Section label: "MODERATION QUEUE" (11px ink-light uppercase)

A list of flagged posts (posts where a member has reported it — see
"Reporting" section below for how posts get flagged). Each item:
- Post body truncated to 80 chars (13px ink-primary)
- Author display name (12px ink-mid)
- Report reason (12px ink-light, italic): the reason text submitted
  by the reporting member
- Two action buttons (inline, right-aligned):
  "Remove post" (danger ghost button)
  "Dismiss report" (ghost button)

If queue is empty: "No reports to review." (13px ink-mid, centered,
24px padding)

**Action: Remove post**
1. Set posts.is_removed = true
2. Write to anchor_actions_log: {anchor_id, action_type: 'remove_post',
   target_id: post_id, reason: [report reason]}
3. Check escalation threshold (see below)

**Action: Dismiss report**
1. Mark the moderation_escalations row (or report record) as resolved
   without action
2. Write to anchor_actions_log: {action_type: 'dismiss_report',
   target_id: post_id}

---

#### 3. Escalation Threshold Check

After EVERY anchor moderation action (remove_post, dismiss_report),
check: has this specific anchor action been flagged by 20% or more of
the neighborhood's verified (tier_2+) members?

For the prototype, this check is simplified:
- moderation_escalations table tracks: anchor_action_id, flagged_by_count,
  neighborhood_member_count (snapshot at time of flagging)
- If flagged_by_count / neighborhood_member_count >= 0.20, set
  moderation_escalations.escalated = true

When escalated = true, the action appears in a separate section:

#### 4. Escalated Actions Section (only shows if any exist)

Section label: "ESCALATED FOR REVIEW" (11px ink-light uppercase,
amber-light background card wrapping this whole section)

Each item shows:
- The original anchor action (e.g. "Removed post: '[truncated body]'")
- "[n] of [total] members flagged this decision" (13px ink-mid)
- A "Central review pending" badge (amber, non-interactive — this is
  a status display, not an action for the prototype. Central review
  itself is out of scope — the escalation existing and being visible
  IS the feature for the demo)

---

#### 5. Vouching Queue Section

Section label: "VOUCHING REQUESTS" (11px ink-light uppercase)

Tier 1 members who have requested Tier 3 (community-vouched) status
appear here. Each item:
- Requester display name (15px ink-primary)
- Requester's declared address (13px ink-mid)
- Signature progress: "1 of 2 signatures" or "0 of 2 signatures"
  (13px ink-light)
- If the anchor has not yet signed: "Sign as anchor" button (primary teal)
- If the anchor has already signed: "Waiting for second signature"
  (13px ink-light, no button)

**Two-signature logic:**
- vouching_requests table (already exists per schema) has columns for
  first_signer_id and second_signer_id
- The anchor can be EITHER signer, but not both (anchor cannot
  single-handedly approve — this is the constraint from the
  refinement pass)
- Any OTHER tier_2+ verified member can be the second signer
- When both signatures exist, the requester's neighborhood_members.tier
  upgrades to 'tier_3' automatically (via trigger or service logic)

For the prototype's anchor screen specifically: the anchor can act as
ONE of the two signers. The second signature comes from a different
member — this can be simulated for the demo via a second seed member
account, or by having the vouching request show "1 of 2" after the
anchor signs and remain there (still demonstrates the two-signature
requirement is enforced, even if the demo doesn't show full completion).

If queue is empty: "No vouching requests." (13px ink-mid, centered)

---

#### 6. Audit Log Section (collapsed by default)

Section label: "ACTIVITY LOG" (11px ink-light uppercase) with a
ChevronDown/ChevronUp toggle (collapsed by default)

When expanded: a flat list of the last 20 anchor_actions_log entries
for this anchor, each showing:
- Action type (formatted: "Removed post", "Dismissed report",
  "Signed vouching request")
- Timestamp (relative: "2h ago")
- Target reference (truncated post body or member name)

This section makes the "full audit logging" commitment from the
refinement pass tangible — a judge can expand this and see that
every anchor action is tracked.

---

## Reporting (Member-Side Addition)

For the moderation queue to have content, members need a way to report
posts. This is a small addition to the existing PostCard component.

**PostCard.tsx addition:**
A small "..." (DotsThree icon, 16px) overflow menu in the top-right of
each post card, visible to Tier 2+ members. Tapping opens a small
action sheet with one option: "Report this post"

Tapping "Report this post" opens a simple modal:
- "Why are you reporting this post?" (15px ink-primary)
- Textarea for reason (required, max 200 chars)
- "Submit report" button (primary)

On submit: POST /api/v1/posts/{id}/report {reason: string}
Creates a moderation_escalations row (or a reports table entry —
use whatever table Database-Schema.md defines for this; if no
table exists, create moderation_escalations with: post_id, reporter_id,
reason, created_at, escalated: false, flagged_by_count: 1)

Show a brief confirmation toast: "Report submitted. The community
anchor will review it."

---

## Backend Endpoints Required

### GET /api/v1/anchor/queue
**Auth:** Required, must have active anchor_roles row
**Returns:** moderation queue items (reported posts not yet actioned)
```json
{
  "data": {
    "queue": [
      {
        "report_id": "uuid",
        "post_id": "uuid",
        "post_body": "...",
        "author_name": "...",
        "reason": "...",
        "reported_at": "..."
      }
    ],
    "escalated": [
      {
        "action_id": "uuid",
        "action_type": "remove_post",
        "target_summary": "...",
        "flagged_by_count": 6,
        "total_members": 28
      }
    ]
  },
  "error": null
}
```

### POST /api/v1/anchor/queue/{report_id}/action
**Auth:** Required, must have active anchor_roles row
**Body:** `{action: "remove_post" | "dismiss_report"}`
**Logic:** per the action descriptions above. Writes to
anchor_actions_log. Checks escalation threshold after writing.

### GET /api/v1/anchor/vouching
**Auth:** Required, must have active anchor_roles row
**Returns:** pending vouching_requests for the anchor's neighborhood

### POST /api/v1/anchor/vouching/{request_id}/sign
**Auth:** Required, must have active anchor_roles row
**Logic:** sets first_signer_id or second_signer_id to the anchor's
member_id (whichever is empty). If both are now filled, upgrade
requester to tier_3.

### GET /api/v1/anchor/audit-log
**Auth:** Required, must have active anchor_roles row
**Returns:** last 20 anchor_actions_log entries for this anchor

### POST /api/v1/posts/{id}/report
**Auth:** Required, Tier 2+
**Body:** `{reason: string}`
**Logic:** creates moderation_escalations entry (or equivalent —
check Database-Schema.md for the actual table/columns available;
if the table doesn't match this shape, adapt to what's deployed,
following the same "deployed schema is ground truth" principle
established in the dashboard phase)

### GET /api/v1/anchor/status
**Auth:** Required
**Returns:** `{is_anchor: boolean, neighborhood_id: uuid | null,
term_ends_at: string | null}`
Used by the tab bar to determine whether to show the Anchor tab.

---

## Frontend Components Required

- `components/anchor/ModerationQueueItem.tsx` — flagged post + actions
- `components/anchor/EscalatedActionItem.tsx` — escalated action display
- `components/anchor/VouchingRequestItem.tsx` — requester info + sign button
- `components/anchor/AuditLogItem.tsx` — single log entry row
- `components/anchor/AuditLog.tsx` — collapsible wrapper + list
- `components/posts/ReportPostModal.tsx` — report reason modal
- `hooks/useAnchorStatus.ts` — checks if current user is an anchor
  (used by tab bar and the /anchor route guard)
- `hooks/useAnchorQueue.ts` — fetches queue + escalated + vouching + audit
- `lib/api/anchor.ts` — all anchor endpoint calls

---

## Tab Bar Update

`components/layout/TabBar.tsx` (or equivalent) — add conditional 6th tab:
```tsx
{isAnchor && (
  <TabBarItem icon={ShieldCheck} label="Anchor" href="/anchor" />
)}
```
Uses useAnchorStatus() hook. If the hook returns false or is loading,
the tab is not rendered (no flash of a tab that then disappears —
default to not rendered, show only after confirmed true).

---

## Completion Criteria

- [x] Demo neighborhood has an active anchor assigned
- [x] /anchor route accessible only to the anchor, shows 403 or hides
      for others
- [x] Tab bar shows 6th "Anchor" tab only for the anchor
- [x] Moderation queue displays reported posts with working
      remove/dismiss actions
- [x] Anchor actions write to anchor_actions_log
- [x] Escalation logic checks 20% threshold and surfaces escalated
      actions in their own section
- [x] Vouching queue displays pending requests with sign capability
- [x] Two-signature constraint enforced (anchor can be only one signer)
- [x] Audit log section displays last 20 actions, collapsible
- [x] Report post modal added to PostCard for Tier 2+ members
- [x] next build passes with 0 errors
- [x] AGENTS.md "Anchor role + moderation" → Complete
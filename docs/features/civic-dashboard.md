# Feature Spec: Civic Dashboard

**Status:** Ready for implementation
**Depends on:** Feed + emergency alerts (complete), Database migrations (complete)
**Produces:** The aggregated neighborhood intelligence view — the screen that
most directly answers the "AI for Civic Innovation" brief and differentiates
Halqa from every competing platform. This is the screen judges will look at
that no WhatsApp group or existing Pakistani platform can show.

---

## Overview

The civic dashboard converts individual neighbor reports into structured
civic intelligence. It answers: "What has been happening in this neighborhood,
in aggregate, over time?" — and produces that answer in a form that can be
shared with WAPDA, a union council member, or a municipal representative.

It is a retrospective analytical view, not a live feed. Data comes from
pre-computed snapshots in civic_dashboard_snapshots (already seeded with
3 rows for the demo neighborhood). A background job regenerates snapshots
after new posts are created.

---

## Access

- Route: `/dashboard` (within the authenticated app shell)
- Auth required: Yes
- Tier required: Tier 2+ (Tier 1 members see a prompt to verify first)
- Neighborhood: scoped to the user's active neighborhood membership

---

## Screens

### Main Dashboard (`/dashboard`)

**Route:** `app/(app)/dashboard/page.tsx`

**Layout — top to bottom:**

#### 1. Header Section

Neighborhood name (22px 600 ink-primary)
"Neighborhood Intelligence Report" (13px ink-mid, below name)
Period selector (right-aligned or below, on its own row on mobile):
Three ghost buttons grouped: "7 days" | "30 days" | "3 months"
Active period: teal background, white text (filled button style)
Default selected: "30 days"

Changing the period selector updates all metrics below without a page
reload — client-side state, re-fetches from the same endpoint with
a different period_type param.

---

#### 2. Summary Metric Cards (2×2 grid)

Four cards in a 2-column grid, each card:
- Border: 1px sand-mid, border-radius 14px, padding 16px
- Metric label: 11px ink-light UPPERCASE (exception to no-caps rule —
  dashboard metric labels only)
- Metric value: 28px 600 ink-primary
- Trend indicator below value: small text 12px showing change vs
  previous period (e.g. "+3 from last period") in success green if
  improved, danger red if worsened, ink-light if unchanged
  For MVP: show the raw number only, trend is optional stretch goal

The four cards:
1. TOTAL REPORTS — total_posts from snapshot
2. EMERGENCIES — emergency_posts from snapshot
3. RESOLVED — resolved_posts from snapshot
4. ACTIVE MEMBERS — active_members from snapshot

---

#### 3. Category Breakdown Bar

Section label: "REPORTS BY TYPE" (11px ink-light uppercase, 24px above)

A horizontal stacked bar, full width minus 32px margins, height 12px,
border-radius 6px (pill). Each segment is a category color:
- power: #1D6A58 (halqa-teal)
- security: #4A5B7A
- infrastructure: #7A5C3A
- water: #3A7A8C
- general: #9C9589

Segment width = (category_count / total_posts) * 100%
If total_posts is 0, show a full-width sand-mid placeholder bar.

Legend below the bar (horizontal, wrapping):
Each legend item: 10px × 10px colored square (border-radius 2px) +
category name in 12px ink-mid + count in 12px ink-light in parentheses.
e.g. ⬛ Power (22)  ⬛ Security (9)  ⬛ Infrastructure (7) ...

aria-label on the chart container must describe the full breakdown
as a text string for screen readers:
"Alert breakdown: [n] power, [n] security, [n] infrastructure,
[n] water, [n] general reports over the last [period]."

---

#### 4. Resolved vs Unresolved Indicator

Section label: "RESOLUTION RATE" (11px ink-light uppercase, 24px above)

A simple two-segment horizontal bar (same style as category bar):
- Resolved segment: success green #2E7D5C
  Width: (resolved_posts / total_posts) * 100%
- Unresolved segment: sand-mid #C9C3B4
  Width: remaining

Below bar: "[n] of [total] reports resolved"
(13px ink-mid, left-aligned)

If total_posts is 0: show placeholder bar + "No reports in this period."

---

#### 5. Recent Emergency List

Section label: "RECENT EMERGENCIES" (11px ink-light uppercase, 24px above)

A flat list (no card borders, 1px sand-mid dividers between items) of
up to 5 most recent unresolved emergency posts from the live posts table
(NOT from the snapshot — this section is live, not aggregated).

Each item:
- WarningCircle icon 16px amber (left)
- Post body truncated to 60 chars (13px ink-primary)
- Time ago (11px ink-light, right-aligned): "2h ago", "3d ago"
- If resolved: CheckCircle icon 16px success-green instead of
  WarningCircle, body shown with strikethrough (text-decoration:
  line-through), ink-light color

If no emergencies: "No active emergencies. Your neighborhood is quiet."
(13px ink-mid, centered, 24px padding top/bottom)
With a CheckCircle icon 32px success-green above the text.

Fetch from: GET /api/v1/alerts?neighborhood_id={id}&limit=5
(already implemented from the feed phase)

---

#### 6. Export / Share Section

Section label: "SHARE WITH INSTITUTIONS" (11px ink-light uppercase, 24px above)

A teal-light surface card (same style as the onboarding info card):
- ShieldCheck icon 20px teal (inline left)
- "Share this report with WAPDA, your union council, or municipal
  authorities." (13px ink-mid)

Two buttons below (full width, stacked, 8px gap):
1. Primary teal: "Copy report text"
   → copies the civic export text to clipboard
2. Ghost: "Download as PDF"
   → stretch goal for prototype — show a toast "PDF export coming soon"
      for the MVP rather than implementing it

**Civic export text** (copied to clipboard):

```
Halqa Neighborhood Intelligence Report
[Neighborhood Name] — [City]
Period: [start date] to [end date]

Summary:
• [total_posts] community reports submitted
• [emergency_posts] emergency alerts raised
• [resolved_posts] issues resolved

Reports by type:
• Power/Electricity: [n]
• Security: [n]
• Infrastructure: [n]
• Water: [n]
• General: [n]

Generated by Halqa — halqa.app
This report represents aggregated, anonymized community data.
Individual reporter identities are not disclosed.
```

This exact text — or as close to it as the data allows — is the
most important deliverable of this entire feature. It is the answer
to "what does civic intelligence actually look like?" for the judges.

---

## Backend Endpoint Required

### GET /api/v1/dashboard/snapshot

**Auth:** Required (Tier 2+)
**Query params:** `period_type` = '7d' | '30d' | '90d' (default: '30d')
**Logic:**
1. Get the calling user's active neighborhood_id from neighborhood_members
2. Query civic_dashboard_snapshots for the most recent snapshot matching
   neighborhood_id + period_type
3. If no snapshot exists for this period, compute it on-the-fly from
   the posts table and write it to civic_dashboard_snapshots before
   returning (do not return a 404 — always return usable data)

**On-the-fly computation (when snapshot missing):**
```python
# Count posts in the period
total = count posts where neighborhood_id = X
        and created_at >= now() - interval
        and is_removed = false

emergency = count where is_emergency = true
resolved = count where is_resolved = true

# Category breakdown
breakdown = group by category, count(*)

# Active members (posted or created a post in period)
active = count distinct author_member_id

# Write snapshot
insert into civic_dashboard_snapshots (...)
```

**Response:**
```json
{
  "data": {
    "neighborhood_id": "uuid",
    "neighborhood_name": "Green Valley Housing Society",
    "period_type": "30d",
    "period_start": "2026-05-13",
    "period_end": "2026-06-13",
    "total_posts": 47,
    "emergency_posts": 18,
    "resolved_posts": 11,
    "active_members": 28,
    "category_breakdown": {
      "power": 22,
      "security": 9,
      "infrastructure": 7,
      "water": 4,
      "general": 5
    },
    "computed_at": "2026-06-13T..."
  },
  "error": null
}
```

**Snapshot refresh trigger:** After any new post is created
(in post_service.create_post), invalidate the existing snapshots
for that neighborhood by deleting them from civic_dashboard_snapshots.
They will be recomputed on next dashboard load. This is simpler than
a background job for the prototype and works correctly for demo scale.

---

## Snapshot Refresh Trigger in Post Service

In `post_service.create_post`, after the post is successfully created,
add:
```python
# Invalidate dashboard snapshots so they recompute on next load
await dashboard_repo.invalidate_snapshots(neighborhood_id)
```

Add `invalidate_snapshots(neighborhood_id)` to dashboard_repo:
```python
async def invalidate_snapshots(self, neighborhood_id: uuid.UUID):
    await asyncio.to_thread(
        lambda: self.client.table("civic_dashboard_snapshots")
            .delete()
            .eq("neighborhood_id", str(neighborhood_id))
            .execute()
    )
```

---

## Frontend Components Required

- `components/dashboard/MetricCard.tsx` — label + value + optional trend
- `components/dashboard/CategoryBar.tsx` — stacked horizontal bar with
  legend. Accepts `breakdown: Record<string, number>`, `total: number`.
  Handles zero-total gracefully (placeholder bar).
- `components/dashboard/ResolutionBar.tsx` — two-segment bar +
  "[n] of [total] resolved" text. Handles zero-total gracefully.
- `components/dashboard/RecentEmergencyList.tsx` — fetches from
  /alerts endpoint, renders up to 5 items with icons, time-ago,
  resolved state.
- `components/dashboard/ExportCard.tsx` — info card + two buttons.
  Implements clipboard copy with the exact export text format.
  Shows a success toast "Copied to clipboard" for 2 seconds after copy.
- `hooks/useDashboard.ts` — fetches snapshot data, manages period_type
  state, re-fetches on period change.
- `lib/api/dashboard.ts` — getSnapshot(period_type) with auth header.

---

## Navigation

The dashboard is reachable from the bottom tab bar (tab 3 of 5: ChartBar
icon, label "Report"). The tab bar is already scaffolded — wire the
dashboard tab to navigate to /dashboard.

---

## Demo Behavior

The demo neighborhood (Green Valley Housing Society, UUID
00000000-0000-0000-0000-000000000001) already has 3 seeded snapshots
(7d, 30d, 90d) in civic_dashboard_snapshots from the initial migration.
The dashboard should display these immediately without requiring any
new posts to be created. This is the demo path for judges.

Confirm the seed data is still present:
```sql
SELECT period_type, total_posts, emergency_posts
FROM civic_dashboard_snapshots
WHERE neighborhood_id = '00000000-0000-0000-0000-000000000001'
ORDER BY period_type;
```
Expected: 3 rows. If missing (deleted by snapshot invalidation),
re-seed before the demo.

---

## Completion Criteria

- [ ] Dashboard loads with the 30-day view by default
- [ ] Period selector switches between 7d / 30d / 90d without page reload
- [ ] All 4 metric cards show correct values from snapshot
- [ ] Category breakdown bar renders with correct proportions and legend
- [ ] Resolution rate bar renders correctly
- [ ] Recent emergencies list shows live data (up to 5 items)
- [ ] "Copy report text" copies the exact civic export format to clipboard
- [ ] Tier 1 members see a verify-first prompt instead of the dashboard
- [ ] Seeded demo data (Green Valley Housing Society) displays correctly
- [ ] next build passes with 0 errors
- [ ] AGENTS.md "Civic dashboard" → Complete
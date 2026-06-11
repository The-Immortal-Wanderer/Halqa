# PRD.md — Halqa Product Requirements Document

**Version:** 1.0
**Date:** June 2026
**Hackathon:** AI for Civic Innovation 2026 — Code for Pakistan
**Prototype Deadline:** June 13, 2026

---

## 1. Executive Summary

**Product name:** Halqa (حلقہ)
**One-line description:** A hyperlocal, address-verified community platform
that turns Pakistani neighborhoods into organized, self-coordinating civic units.
**Tagline:** Your neighborhood, organized. / آپ کا حلقہ، منظم۔

Halqa is civic infrastructure with a human face. It is not a social app with
civic features — it is a civic coordination layer whose social features exist
to drive adoption and sustain engagement. The platform allows verified residents
of a Pakistani neighborhood to coordinate locally, receive and post emergency
alerts, access a service worker directory, and generate structured civic
intelligence that can be routed to institutions (utility providers, union
councils, municipal bodies).

---

## 2. Problem Statement

Residents in Pakistani neighborhoods lack a trusted, localized platform to
connect with immediate neighbors, leading to weak community coordination,
safety gaps, and missed opportunities for local support.

**The structural reality behind this statement:**

When neighborhoods cannot self-coordinate, they are also unable to engage with
or hold accountable the institutions meant to serve them. A power outage stays
a personal inconvenience rather than a documented pattern. A robbery goes
unreported to neighbors for hours. A service worker's unreliability is known
to one family but unknown to the street. The absence of a trusted coordination
layer is not just a social problem — it is a civic failure.

**The specific failure the prototype demonstrates:**

A transformer explodes in a residential society. Power goes out. Residents
cannot reach electricity authorities. Neighbors don't know whether to stay
inside or leave. A robbery happens on the next street that same night — and
residents only find out hours later because there was no fast, reliable way
to alert each other. One crisis compounded another because there was no
trusted local communication channel among verified neighbors.

**Validated from the outside:**

- The 2023 Pakistan nationwide blackout caused PKR 100 billion in economic
  losses — documented at national scale what happens when communities cannot
  self-coordinate during infrastructure failure.
- Only 3% of Pakistanis belong to formal community organizations (PIDE, 2023),
  quantifying the civic engagement gap.
- Pulse Pakistan's 2026 Karachi pilot — 46 families adopting a privacy-first
  safety system in a single school deployment — proves Pakistani residents
  will adopt structured local coordination when it addresses a genuine,
  emotionally salient concern.

**Why WhatsApp groups are not the solution:**

WhatsApp groups already exist in Pakistani neighborhoods. They fail to solve
the problem for three structural reasons, not just feature gaps:

1. They cannot verify that participants are actual residents. Anyone with an
   invite link joins — former residents, domestic workers, landlords elsewhere.
2. They cannot aggregate or structure information across time. A report about
   last week's robbery is unfindable in chat history.
3. They cannot route information to institutions. An alert stays inside the
   group. Halqa can surface it to WAPDA or a union council as structured data.

Halqa does not replace WhatsApp groups. It adds a verified, structured layer
alongside them — for the interactions WhatsApp structurally cannot handle.

---

## 3. Target Users

### 3.1 Primary User (Prototype Target)

**English-comfortable housing society resident, 25–45 years old.**

Lives in a DHA, Bahria Town, or equivalent gated/managed housing society in
a Pakistani city (Lahore, Islamabad, Karachi). Uses a smartphone daily.
Comfortable with app-based interactions. Has experienced neighborhood
coordination failures (power outages, security incidents) and currently uses
a fragmented mix of WhatsApp groups that lack trust and structure.

This user is the prototype target not because they need the platform most —
residents of informal mohallas arguably need it more — but because:

- Address formats are more standardized in housing societies
- Tech comfort is higher, reducing onboarding friction
- The proof-of-concept is demonstrable within hackathon constraints
- Housing societies are the natural first neighborhood unit

### 3.2 Secondary User (Post-Prototype Expansion)

**Urdu-primary mohalla resident in an older urban settlement.**

Lives in areas like Orangi Town, Liaquatabad, or similar informal urban
settlements. May use Roman Urdu or Urdu script. May have a shared or
family-shared smartphone. Represents the civic case where the platform's
impact is highest — state services are weakest, institutional coordination
is most absent, and community self-organization has the greatest effect.

This user is explicitly out of scope for the prototype. The platform is
designed with this user as the long-term horizon — which is why Urdu text
appears in the interface even at prototype stage, why the verification model
uses document bundles rather than a single standardized format, and why the
civic dashboard exists at all.

### 3.3 Institutional User (Future)

**Union council representative, utility company field officer, municipal
authority contact.**

Receives civic dashboard exports and structured alert summaries from Halqa.
Does not use the platform directly in the prototype. The civic dashboard is
the prototype touchpoint — it produces data that could be shared with
institutions. Actual institutional integration is post-prototype.

---

## 4. User Personas

### Persona 1 — Farrukh, 34, DHA Lahore

Software engineer. Lives in a Phase 5 apartment with his wife and one child.
Active in his building's WhatsApp group but frustrated by noise and
unverified membership. Experienced the 2023 load-shedding cascade and spent
three hours unable to confirm whether the outage was local or city-wide.
Wants a reliable emergency alert channel but won't trust a platform he can't
verify is made of actual neighbors. Privacy-conscious — won't join anything
that shows his address publicly.

**Adoption trigger:** A power outage alert that reaches him within two minutes
of a neighbor posting it, confirmed as coming from a verified resident of
his street.

### Persona 2 — Ayesha, 41, Bahria Town Islamabad

School principal. Manages a building with 24 apartments. Currently acts as an
informal coordinator — sends messages to her floor's WhatsApp group, relays
information between the building management and residents. Would be a natural
Community Anchor. Motivated by safety (children in the building), frustrated
by the informality of current coordination, and aware of service worker
reliability problems (she maintains an informal mental list of good and bad
plumbers).

**Adoption trigger:** Being approached as a Community Anchor with tools to
manage the neighborhood feed and verify neighbors she already knows personally.

### Persona 3 — Tariq, 28, F-7 Islamabad

Recent graduate, first year of working. Renting a flat for the first time.
Does not have a utility bill in his name. Has a rental agreement. Wants to
be part of the building community but feels like an outsider relative to
long-term owner-residents. Has experienced being excluded from building
decisions because he is a tenant.

**Adoption trigger:** Verification that accepts his rental agreement rather
than demanding a utility bill in his name — and a platform where tenant
status carries no visible stigma.

### Persona 4 — Sadia, 52, DHA Karachi

Housewife and active community organizer. Coordinates the block's Eid
collections, fateha arrangements, and informal service worker
recommendations. Operates entirely through WhatsApp and phone calls.
Not highly tech-literate but uses WhatsApp fluently. Would benefit from
a structured version of what she already does informally, but only if
onboarding is simple enough that she can join without a tutorial.

**Adoption trigger:** The Community Anchor (Ayesha equivalent in her
building) personally vouching for her and walking her through onboarding.

---

## 5. Feature Scope

### 5.1 In Scope — Prototype (June 13)

The prototype demonstrates one complete, end-to-end user journey:

> A resident joins a verified neighborhood → posts an emergency alert → the
> AI classifies it as urgent and surfaces it prominently → a neighbor sees
> it and responds → the aggregated alert data appears on the civic dashboard.

Features required to demonstrate this journey:

**Authentication & Onboarding**
- Five-screen onboarding flow (entry → neighborhood search → confirmation →
  account creation → verification entry)
- Supabase Auth (phone number + OTP, email as fallback)
- Tier 1 self-declaration (read-only access, immediate)
- Tier 2 document verification (full feed access, pending → approved/rejected)
- Neighborhood search by name, society, or area
- New neighborhood creation (basic — name and location, no address mapping)

**Neighborhood Feed**
- Real-time feed of posts from verified members (Supabase Realtime)
- Post creation with category selection (Power, Security, Infrastructure,
  Water, General)
- Emergency posts visually distinguished (amber left border, pinned at top)
- Post resolution by author or anchor ("Mark as resolved")
- Resolved state displayed distinctly (success green treatment)
- Feed is neighborhood-scoped — no content from outside the neighborhood

**AI Alert Classification**
- Every new post sent to the FastAPI AI service after creation
- Claude classifies into: Emergency / Community / General
- Emergency posts pinned to top of feed and trigger push notification
- Classification result stored on the post record
- Misclassification correction available to anchor (manual override)

**Civic Dashboard**
- Aggregated view of post categories and frequency over 7/30/90 days
- Five categories: Power, Security, Infrastructure, Water, Other
- Resolved vs open breakdown per category
- Exportable summary (plain text, formatted for sharing)
- Visible to all verified members of the neighborhood
- No individual user data exposed — neighborhood-level aggregation only

**Community Anchor Role**
- One anchor per neighborhood (assigned by platform, not self-appointed)
- Anchor dashboard: moderation queue, vouching queue, escalation counter
- Content moderation: anchor can remove posts (logged, auditable)
- Tier 3 vouching: requires anchor + one other verified member co-signature
- Moderation actions visible to platform admin, not to regular members
- Six-month term (enforced in data model, manual renewal for prototype)
- Community override: if 20% of verified members flag an anchor action,
  it escalates to platform admin review (counter tracked, threshold enforced)

**Verification Flow**
- Tier 2 document upload (multi-file, accepts: utility bill, rental
  agreement, society card, delivery confirmation)
- OCR attempt on uploaded documents (extract name and address fields)
- Pending state with notification on completion
- Approved and rejected states with specific rejection reason
- Deep-link from notification to correct verification result screen
- Tier 3 vouching (anchor + one verified member, two-signature requirement)

**Service Worker Directory**
- Listings-only (no transactions, no payments)
- Categories: Electrician, Plumber, Maid/Housekeeper, Cook, Driver, Other
- Listing fields: name, category, contact (shown only to Tier 2+ members),
  description, neighborhood, anchor-verified badge eligibility
- Worker review (unlocked only after both parties confirm a job)
- Verified worker badge: earned by minimum 5 confirmed jobs + 4.0 avg rating
  (not purchasable, not anchor-granted)

**Push Notifications**
- Emergency alert notification: fires when a post is classified as Emergency
- Verification result notification: fires on approval or rejection
- Deep-link to correct screen from both notification types

**Privacy Architecture**
- User addresses never returned in user-facing API responses
- Neighborhood-level granularity only in public-facing data
- Verification documents in private Supabase Storage bucket
- Documents deleted from storage after verification decision is recorded
- Published data handling policy (plain language, displayed in onboarding)

### 5.2 Out of Scope — Prototype (Do Not Build)

These are explicitly excluded from the prototype. Do not begin implementation
of any item on this list without explicit instruction.

- Marketplace (buy/sell listings between neighbors)
- Community events (dawat, Eid, fateha, block party management)
- Mobile native app (iOS or Android — prototype is PWA only)
- Offline support (service worker caching for low-network areas)
- Full Urdu interface (Urdu text appears as cultural signal, not full i18n)
- Automated institutional data routing (the export button exists;
  actual API integration with WAPDA, union councils, etc. is post-prototype)
- In-app payments or wallet
- Video or voice content in posts
- Map-based neighborhood browsing
- Electoral or political feature of any kind
- Admin panel beyond anchor dashboard (platform admin operates via Supabase
  dashboard for the prototype)
- Email newsletters or digest notifications
- Social login (Google, Apple) — phone OTP + email only

---

## 6. User Stories

### Authentication & Onboarding

- As a new user, I can search for my neighborhood by name so I can find my
  community before creating an account.
- As a new user, I can create an account with my phone number (OTP) or
  email so that I am authenticated.
- As a new user with no verified neighbors, I can join as a Tier 1 member
  and browse the neighborhood feed without posting so that I can see value
  before committing to verification.
- As a Tier 1 member, I can upload a document to begin Tier 2 verification
  so that I can unlock full posting access.
- As a user waiting for verification, I receive a push notification when
  my verification is approved or rejected so that I know my status without
  checking the app repeatedly.
- As a rejected user, I see a specific reason for rejection and can upload
  a different document so that I am not left without a path forward.

### Neighborhood Feed

- As a verified member (Tier 2+), I can post to my neighborhood feed with
  a category so that my neighbors know the nature of my post.
- As a member, I can see the neighborhood feed in real-time so that new
  posts appear without refreshing.
- As a member, I can see emergency posts pinned at the top of the feed,
  visually distinct from regular posts, so that urgent information is not
  missed.
- As a post author, I can mark my post as resolved so that my neighbors
  know the situation has been addressed.
- As a member, I can see when an emergency post has been resolved so that
  I know the situation is over.

### AI Classification

- As a member posting an emergency, the platform automatically identifies
  my post as urgent and elevates it without me having to select a special
  type so that time-critical alerts reach neighbors faster.
- As an anchor, I can override an AI classification if it was incorrect so
  that misclassified posts do not stay pinned incorrectly.

### Civic Dashboard

- As a verified member, I can see a dashboard showing the types and
  frequency of incidents in my neighborhood so that I understand local
  patterns over time.
- As a verified member, I can see which incidents are resolved and which
  are still open so that I have an accurate picture of current conditions.
- As a verified member, I can export a neighborhood summary so that I can
  share it with a utility provider or union council representative.

### Community Anchor

- As an anchor, I can access a moderation queue showing flagged posts so
  that I can review and act on community concerns.
- As an anchor, I can remove a post that violates community guidelines,
  with my action logged so that there is accountability for moderation
  decisions.
- As an anchor, I can vouch for a neighbor for Tier 3 verification, with a
  second verified member required to co-sign so that no single person
  controls full-access membership.
- As a verified member, I can flag an anchor's moderation action so that
  if 20% of the neighborhood does so, it escalates to platform review.

### Verification

- As a tenant without a utility bill, I can upload a rental agreement and
  another address-confirming document so that my living situation does not
  prevent me from joining my neighborhood.
- As a Tier 3 candidate, I need both the anchor and a second verified
  neighbor to vouch for me so that Tier 3 access reflects genuine
  community trust.

### Service Worker Directory

- As a verified member, I can see listings of service workers who have
  worked in my neighborhood so that I can find reliable local help.
- As a verified member who has confirmed a completed job, I can leave a
  review of a service worker so that my neighbors benefit from my experience.
- As a service worker, I can see my verified badge when I have completed
  5+ jobs with a 4.0+ average rating so that my reputation is represented
  fairly.

---

## 7. Business Rules

These rules are invariant. They must be enforced in application logic and,
where possible, in database constraints. Implementations that violate these
rules are incorrect regardless of technical correctness.

**Verification rules:**
- A user can only be a member of one neighborhood at prototype stage.
- Tier 1 members can read the feed but cannot create posts or access contact
  information in the worker directory.
- Tier 2 verification requires at minimum one uploaded document. OCR failure
  does not auto-reject — it flags for manual review.
- Tier 3 requires exactly two co-signatures: the anchor AND one other
  Tier 2+ member who is not the anchor.
- Verification documents must be deleted from storage after the verification
  decision (approved or rejected) is recorded. This is a privacy commitment,
  not a preference.
- An anchor cannot be the sole voucher for a Tier 3 application. The two-
  signature requirement is non-negotiable.

**Anchor role rules:**
- An anchor can remove posts from the feed. Anchor cannot remove verified
  members from the neighborhood — only platform admin can do that.
- Every anchor moderation action (post removal, vouching, escalation
  decisions) is logged with a timestamp and the anchor's user ID.
- Anchor terms are six months. Renewal is manual at prototype stage.
- The 20% escalation threshold is calculated against verified members
  (Tier 2+) only, not total neighborhood members.
- An anchor cannot vouch for themselves for any tier.

**Content rules:**
- No partisan political content (party affiliation, electoral content,
  candidate promotion). This is a platform rule enforced by anchor
  moderation, not automated filtering.
- Suspicious activity posts must describe a specific observed behavior,
  not a person's physical characteristics, religion, ethnicity, or
  employment status. This is stated in community guidelines. Enforcement
  is by anchor moderation and flagging.
- Posts that are resolved cannot be un-resolved by anyone other than the
  original author or the anchor.

**Worker directory rules:**
- The verified worker badge is earned, never purchased or anchor-granted.
  Criteria: minimum 5 confirmed jobs, minimum 4.0 average review score.
- A review can only be submitted after both the member and the worker
  (or the member on behalf of a confirmed job) confirm the job occurred.
  Unconfirmed reviews cannot be submitted.
- Contact details of service workers are visible only to Tier 2+ members.

**Revenue model rules:**
- Promoted business listings appear in the directory tab only, clearly
  labeled as promoted. They never appear in the neighborhood feed.
- The verified worker badge cannot be purchased. A premium listing tier
  (enhanced directory visibility, contact details unlocked) can be
  purchased. The badge itself is a community signal.
- These rules exist to ensure payment never purchases trust signals.

**Privacy rules:**
- User addresses are never returned in user-facing API responses.
  Neighborhood-level granularity is the public identifier.
- The civic dashboard exposes aggregated, anonymized neighborhood data only.
  No individual user activity is visible in the dashboard.
- Verification documents are stored in a private bucket and deleted after
  verification decision. This is enforced at the service layer.
- Law enforcement data requests: comply with lawful Pakistani court orders.
  Notify user when legally permitted. Refuse bulk surveillance requests.
  Log all requests. This policy is published in the app.

---

## 8. Success Metrics

### Adoption (6-month post-launch target)
- Five pilot neighborhoods each reaching 40+ verified (Tier 2+) households.
- At least two of those neighborhoods having posted and responded to at
  least one real emergency alert.
- Rationale: 40+ households is the threshold for a neighborhood feed to
  have enough density that an emergency alert has a meaningful chance of
  reaching someone who can respond.

### Engagement (3-month target)
- 30% weekly active participation rate among Tier 2+ members.
- "Active" means: created a post, responded to a post, or interacted with
  the directory in the past 7 days. Passive reading does not count.
- Rationale: this is the threshold that distinguishes platforms people use
  from platforms they install and forget. Google Neighbourly failed this test.

### Civic Impact (6-month target)
- At least two documented instances of neighborhood-aggregated platform data
  being shared with and acknowledged by a relevant institution (a utility
  provider, union council representative, or municipal body).
- Rationale: this is the metric that validates the civic infrastructure
  framing. Two instances is a low bar that can be met intentionally. It
  anchors the framing in a measurable, real-world outcome.

---

## 9. Non-Goals

Explicit exclusions. Do not interpret any of the following as implied
requirements at any point during prototype development.

- Serving rural or low-connectivity communities (Phase 2+)
- Supporting Urdu as a primary interface language (Phase 2+)
- Offline support for low-network areas (Phase 2+)
- Native iOS or Android app (Phase 2+)
- Marketplace (buy/sell transactions between neighbors)
- Community events management (dawat, Eid, fateha coordination)
- In-app messaging between individual members (feed only at prototype)
- Video or audio posts
- Integration with government databases or formal address registries
- Real-time routing of civic data to institutions via API
- Electoral or political features of any kind, ever
- Advertising or sponsored content in the neighborhood feed, ever
- Social login (Google, Apple)
- User-generated neighborhood boundary mapping

---

## 10. Assumptions

Key assumptions the prototype is built on. If any of these prove wrong,
the team must be notified before continuing.

1. Supabase Realtime is sufficient for feed update latency requirements
   in a prototype with seeded demo data (no load testing required for
   hackathon demo).
2. The Anthropic Claude API (claude-sonnet-4-20250514) is sufficient for
   alert classification with a well-designed prompt. No fine-tuned model
   is required for the prototype.
3. Push notifications can be implemented via Supabase Edge Functions +
   Web Push API for the PWA at prototype stage without a dedicated
   notification service.
4. OCR on verification documents uses Claude's vision capability via the
   Anthropic API — no separate OCR library required for the prototype.
5. A seeded demo neighborhood with plausible Pakistani context is
   sufficient to demonstrate the civic dashboard in the hackathon demo.
   Real resident data is not required.
6. Render's free tier is sufficient for the FastAPI backend during the
   demo period (low concurrent users, demo traffic only).
7. Vercel's free tier is sufficient for the Next.js frontend during the
   demo period.

---

## 11. Design References

The complete visual identity system is documented separately and must be
consulted for all frontend implementation decisions. Key design decisions
that affect implementation:

- Color tokens are defined in `tailwind.config.ts` under the `halqa`
  namespace. All design tokens in ARCHITECTURE.md Section 6.
- Phosphor Icons (phosphor-react) for all iconography.
- Plus Jakarta Sans + Noto Nastaliq Urdu from Google Fonts.
- `dir="auto"` on all post body text for bilingual rendering.
- Emergency posts: amber left border (`border-l-4 border-halqa-amber`),
  amber-light background (`bg-halqa-amber-light`).
- Verification tier badges: Tier 1 sand, Tier 2 teal-light, Tier 3 teal
  filled (inverted).
- Bottom tab navigation on mobile: Feed, Alerts, Community, Directory,
  Profile (5 tabs).
- No floating labels on input fields. Labels always above, always visible.
- Sentence case everywhere. No ALL CAPS except short badge labels (2–3 chars).
- Writing voice: direct, warm, civic. Not institutional, not chatty.

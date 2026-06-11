# Database-Schema.md — Halqa Database Schema

**Database:** PostgreSQL via Supabase
**Version:** 1.0
**Date:** June 2026

This document is the single source of truth for all data structure decisions.
Any change to a table, column, constraint, index, or RLS policy requires a
migration file. Never modify the database outside of a migration. Never
diverge from this document silently — update this document first, then write
the migration.

---

## 1. Overview

### 1.1 Design Principles

- **Soft deletes everywhere.** No row is hard-deleted except verification
  documents (privacy commitment) and ephemeral session data. All other
  entities have a `deleted_at TIMESTAMPTZ` column. Queries filter
  `WHERE deleted_at IS NULL` by default.
- **UUID primary keys throughout.** All tables use `gen_random_uuid()` as
  default. No integer sequences as primary keys.
- **UTC timestamps everywhere.** All `TIMESTAMPTZ` columns store UTC.
  Timezone conversion is a frontend concern.
- **Audit trail for anchor actions.** Every moderation action taken by an
  anchor is written to `anchor_actions_log`. This is append-only — no
  updates or deletes on this table.
- **RLS on every table.** No table exists without Row Level Security policies.
  The Supabase service role bypasses RLS for administrative operations only.
  All user-facing queries go through RLS.
- **Address data never in user-facing tables.** Raw address strings live only
  in `verification_records`, accessible only via the service role. The
  `neighborhood_id` is the public geographic identifier.

### 1.2 Extension Requirements

```sql
-- Required Supabase extensions (enabled by default in Supabase projects)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for text search on neighborhoods
```

### 1.3 Schema Diagram (Textual)

```
users
  └─< neighborhood_members >─ neighborhoods
                                    └─< posts
                                    |     └─< post_flags
                                    └─< anchor_roles
                                    |     └─< anchor_actions_log
                                    └─< civic_dashboard_snapshots
                                    └─< worker_listings
                                          └─< worker_reviews

users
  └─< verification_records
        └─ verification_documents (storage reference)

neighborhood_members (Tier 3 vouching)
  └─< tier3_vouching_requests
        └─ [anchor co-sign]
        └─ [second member co-sign]
```

---

## 2. Table Definitions

---

### 2.1 `users`

Extends Supabase Auth's `auth.users` table. This table stores application-
level user profile data. The `id` column is a foreign key to `auth.users.id`.

**Purpose:** Store display profile, onboarding state, and platform-level
user metadata. Not neighborhood-specific — a user exists once regardless
of how many neighborhoods they join (one neighborhood per user at prototype
stage, enforced by application logic).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | — | FK to `auth.users.id`. Primary key. |
| `display_name` | `TEXT` | NO | — | Name as the user's neighbors know them. Max 60 chars. |
| `phone` | `TEXT` | YES | NULL | E.164 format. Indexed. Unique where not null. |
| `email` | `TEXT` | YES | NULL | Lowercase. Indexed. Unique where not null. |
| `onboarding_complete` | `BOOLEAN` | NO | `false` | True once user has joined a neighborhood (any tier). |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | Account creation time. |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | Last profile update. Maintained by trigger. |
| `deleted_at` | `TIMESTAMPTZ` | YES | NULL | Soft delete timestamp. |

**Constraints:**
- `CHECK (char_length(display_name) >= 2 AND char_length(display_name) <= 60)`
- `CHECK (phone IS NOT NULL OR email IS NOT NULL)` — at least one contact.
- `UNIQUE (phone) WHERE phone IS NOT NULL AND deleted_at IS NULL`
- `UNIQUE (email) WHERE email IS NOT NULL AND deleted_at IS NULL`

**Indexes:**
- `idx_users_phone` on `(phone)` where `phone IS NOT NULL`
- `idx_users_email` on `(email)` where `email IS NOT NULL`
- `idx_users_deleted_at` on `(deleted_at)` where `deleted_at IS NOT NULL`

**RLS Policies:**
- `SELECT`: Users can read their own row. Anchor of a shared neighborhood
  can read display_name and id of members (joined via neighborhood_members).
  No other user can read another user's full row.
- `UPDATE`: Users can update their own display_name only.
- `INSERT`: Handled by auth trigger — not directly insertable by users.
- `DELETE`: Not permitted via RLS. Soft delete only via `deleted_at`.

**Trigger:**
```sql
-- Automatically update updated_at on any row change
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

---

### 2.2 `neighborhoods`

**Purpose:** Represents a single verified neighborhood unit — a street, a
housing society block, or a defined community area.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary key. |
| `name` | `TEXT` | NO | — | Display name. e.g. "Street 7, DHA Phase 5" or "Block C, Bahria Town". Max 120 chars. |
| `city` | `TEXT` | NO | — | City name. Max 60 chars. |
| `sector_or_area` | `TEXT` | YES | NULL | Sub-area within city (sector, phase, district). Max 80 chars. |
| `member_count` | `INTEGER` | NO | `0` | Cached count of Tier 2+ members. Updated by trigger. |
| `total_member_count` | `INTEGER` | NO | `0` | Cached count of all members (all tiers). Updated by trigger. |
| `is_active` | `BOOLEAN` | NO | `true` | False if neighborhood is suspended or merged. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | Maintained by trigger. |
| `deleted_at` | `TIMESTAMPTZ` | YES | NULL | Soft delete. |

**Constraints:**
- `CHECK (char_length(name) >= 3 AND char_length(name) <= 120)`
- `CHECK (member_count >= 0)`
- `CHECK (total_member_count >= member_count)`

**Indexes:**
- `idx_neighborhoods_name_trgm` on `name` using GIN with `gin_trgm_ops`
  — enables fast trigram search for neighborhood name lookup.
- `idx_neighborhoods_city` on `(city)`
- `idx_neighborhoods_active` on `(is_active)` where `is_active = true`

**RLS Policies:**
- `SELECT`: Any authenticated user can read non-deleted neighborhoods.
  (Neighborhood search must be possible before joining.)
- `INSERT`: Only service role. New neighborhoods created via the backend
  service, not directly by users.
- `UPDATE`: Only service role.
- `DELETE`: Not permitted. Soft delete via `deleted_at`.

---

### 2.3 `neighborhood_members`

**Purpose:** Join table between users and neighborhoods. Stores tier, join
date, and verification state per membership.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary key. |
| `user_id` | `UUID` | NO | — | FK to `users.id`. |
| `neighborhood_id` | `UUID` | NO | — | FK to `neighborhoods.id`. |
| `tier` | `INTEGER` | NO | `1` | Verification tier: 1, 2, or 3. |
| `joined_at` | `TIMESTAMPTZ` | NO | `now()` | When the user joined this neighborhood. |
| `tier_upgraded_at` | `TIMESTAMPTZ` | YES | NULL | When the user last moved to a higher tier. |
| `is_active` | `BOOLEAN` | NO | `true` | False if membership is suspended. |
| `deleted_at` | `TIMESTAMPTZ` | YES | NULL | Soft delete (user left neighborhood). |

**Constraints:**
- `UNIQUE (user_id, neighborhood_id) WHERE deleted_at IS NULL`
  — one active membership per user per neighborhood.
- `CHECK (tier IN (1, 2, 3))`

**Indexes:**
- `idx_nm_user_id` on `(user_id)` where `deleted_at IS NULL`
- `idx_nm_neighborhood_id` on `(neighborhood_id)` where `deleted_at IS NULL`
- `idx_nm_tier` on `(neighborhood_id, tier)` where `deleted_at IS NULL`
  — supports counting Tier 2+ members for escalation threshold calculation.

**RLS Policies:**
- `SELECT`: A user can read their own membership row. An anchor can read
  all membership rows for their neighborhood. Members can see the count and
  tier distribution (aggregate), not individual user memberships.
- `INSERT`: Service role only. Users join via the backend endpoint.
- `UPDATE`: Service role only. Tier changes via backend service.
- `DELETE`: Not permitted. Soft delete via `deleted_at`.

**Trigger:** On INSERT or UPDATE of `tier` column, update the
`neighborhoods.member_count` (Tier 2+ count) and
`neighborhoods.total_member_count` (all tiers).

---

### 2.4 `verification_records`

**Purpose:** Tracks the full verification lifecycle for a user's membership.
One record per user per neighborhood membership. Contains the only location
where address data is stored — service role access only.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary key. |
| `user_id` | `UUID` | NO | — | FK to `users.id`. |
| `neighborhood_id` | `UUID` | NO | — | FK to `neighborhoods.id`. |
| `membership_id` | `UUID` | NO | — | FK to `neighborhood_members.id`. |
| `tier_target` | `INTEGER` | NO | — | Which tier this verification attempt is for (2 or 3). |
| `status` | `TEXT` | NO | `'pending'` | Enum: `pending`, `approved`, `rejected`, `expired`. |
| `submitted_at` | `TIMESTAMPTZ` | NO | `now()` | When documents were submitted. |
| `decided_at` | `TIMESTAMPTZ` | YES | NULL | When status changed to approved/rejected. |
| `rejection_reason` | `TEXT` | YES | NULL | One of four defined rejection reason codes (see PRD). |
| `address_submitted` | `TEXT` | YES | NULL | Address string as entered by user. Service role only. |
| `address_extracted` | `TEXT` | YES | NULL | Address extracted by OCR from documents. Service role only. |
| `ocr_confidence` | `DECIMAL(4,3)` | YES | NULL | OCR confidence score 0.000–1.000. |
| `reviewer_notes` | `TEXT` | YES | NULL | Internal notes from manual review. Service role only. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | Maintained by trigger. |

**Constraints:**
- `CHECK (tier_target IN (2, 3))`
- `CHECK (status IN ('pending', 'approved', 'rejected', 'expired'))`
- `CHECK (ocr_confidence IS NULL OR (ocr_confidence >= 0 AND ocr_confidence <= 1))`
- `CHECK (rejection_reason IN ('address_mismatch', 'document_unreadable', 'name_not_found', 'document_type_invalid') OR rejection_reason IS NULL)`
- One active (non-expired) pending or approved record per user per
  neighborhood enforced at application layer.

**Indexes:**
- `idx_vr_user_id` on `(user_id)`
- `idx_vr_membership_id` on `(membership_id)`
- `idx_vr_status` on `(status)` where `status = 'pending'`

**RLS Policies:**
- `SELECT`: Users can read their own verification records (excluding
  `address_submitted`, `address_extracted`, `reviewer_notes` — these
  columns are service role only via a separate secure view).
- `INSERT`: Service role only.
- `UPDATE`: Service role only.
- `DELETE`: Not permitted.

---

### 2.5 `verification_documents`

**Purpose:** References to documents uploaded to Supabase Storage for
verification. The actual files live in the `verification-docs` private
storage bucket. This table tracks the reference and deletion status.

**Critical:** Document files must be deleted from storage after the
verification decision is recorded. The `deleted_from_storage_at` column
tracks compliance with this privacy commitment.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary key. |
| `verification_record_id` | `UUID` | NO | — | FK to `verification_records.id`. |
| `storage_path` | `TEXT` | NO | — | Path in Supabase Storage bucket. Service role only. |
| `document_type` | `TEXT` | NO | — | Enum: `utility_bill`, `rental_agreement`, `society_card`, `delivery_confirmation`, `other`. |
| `file_name` | `TEXT` | NO | — | Original filename as uploaded. |
| `file_size_bytes` | `INTEGER` | NO | — | File size. Reject uploads over 10MB at application layer. |
| `mime_type` | `TEXT` | NO | — | Must be `image/jpeg`, `image/png`, or `application/pdf`. |
| `uploaded_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `deleted_from_storage_at` | `TIMESTAMPTZ` | YES | NULL | When the file was deleted from storage. NULL means still present. |

**Constraints:**
- `CHECK (document_type IN ('utility_bill', 'rental_agreement', 'society_card', 'delivery_confirmation', 'other'))`
- `CHECK (mime_type IN ('image/jpeg', 'image/png', 'application/pdf'))`
- `CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760)` — 10MB max.

**Indexes:**
- `idx_vd_verification_record_id` on `(verification_record_id)`
- `idx_vd_pending_deletion` on `(deleted_from_storage_at)`
  where `deleted_from_storage_at IS NULL`
  — used by the cleanup job to find documents awaiting deletion.

**RLS Policies:**
- All operations: service role only. Users never access this table directly.

---

### 2.6 `anchor_roles`

**Purpose:** Tracks current and historical anchor assignments per
neighborhood. One active anchor per neighborhood at any time.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary key. |
| `neighborhood_id` | `UUID` | NO | — | FK to `neighborhoods.id`. |
| `user_id` | `UUID` | NO | — | FK to `users.id`. The anchor. |
| `membership_id` | `UUID` | NO | — | FK to `neighborhood_members.id`. Anchor must be a verified member. |
| `term_start` | `TIMESTAMPTZ` | NO | `now()` | Term start. |
| `term_end` | `TIMESTAMPTZ` | NO | — | Calculated as `term_start + interval '6 months'`. |
| `is_active` | `BOOLEAN` | NO | `true` | Only one active anchor per neighborhood. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `deactivated_at` | `TIMESTAMPTZ` | YES | NULL | When anchor role was ended (term expiry or removal). |

**Constraints:**
- `UNIQUE (neighborhood_id) WHERE is_active = true`
  — enforces one active anchor per neighborhood.
- `CHECK (term_end > term_start)`
- Anchor must be Tier 2+ member — enforced at application layer on insert.

**Indexes:**
- `idx_anchor_neighborhood_active` on `(neighborhood_id)` where `is_active = true`
- `idx_anchor_user_id` on `(user_id)`

**RLS Policies:**
- `SELECT`: Any member of the neighborhood can read the active anchor record
  (to see who the anchor is). Historical (inactive) records: service role only.
- `INSERT`: Service role only.
- `UPDATE`: Service role only.
- `DELETE`: Not permitted.

---

### 2.7 `anchor_actions_log`

**Purpose:** Immutable audit log of every action taken by an anchor in their
moderation capacity. Append-only — no updates, no deletes, ever.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary key. |
| `anchor_role_id` | `UUID` | NO | — | FK to `anchor_roles.id`. |
| `neighborhood_id` | `UUID` | NO | — | FK to `neighborhoods.id`. Denormalized for query performance. |
| `action_type` | `TEXT` | NO | — | Enum: `post_removed`, `post_classification_overridden`, `tier3_vouched`, `tier3_cosigned`, `member_flagged`, `escalation_reviewed`. |
| `target_type` | `TEXT` | NO | — | Enum: `post`, `user`, `verification_request`. |
| `target_id` | `UUID` | NO | — | ID of the post, user, or verification request acted upon. |
| `reason` | `TEXT` | YES | NULL | Anchor-supplied reason for the action. Optional but encouraged. |
| `metadata` | `JSONB` | YES | NULL | Additional context (e.g. previous classification value before override). |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | Immutable timestamp. |

**Constraints:**
- `CHECK (action_type IN ('post_removed', 'post_classification_overridden', 'tier3_vouched', 'tier3_cosigned', 'member_flagged', 'escalation_reviewed'))`
- `CHECK (target_type IN ('post', 'user', 'verification_request'))`
- No UPDATE or DELETE permitted — enforced via RLS and application layer.

**Indexes:**
- `idx_aal_neighborhood_id` on `(neighborhood_id, created_at DESC)`
- `idx_aal_anchor_role_id` on `(anchor_role_id)`
- `idx_aal_target_id` on `(target_id)`

**RLS Policies:**
- `SELECT`: Service role only. Anchor action logs are internal — not
  exposed to members or the anchor themselves via user-facing queries.
- `INSERT`: Service role only.
- `UPDATE`: Not permitted (enforced via RLS).
- `DELETE`: Not permitted (enforced via RLS).

---

### 2.8 `posts`

**Purpose:** Every content item published to a neighborhood feed. Emergency
alerts are posts with `ai_classification = 'emergency'` or
`category IN ('power', 'security', 'infrastructure', 'water')` and
`is_emergency = true`.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary key. |
| `neighborhood_id` | `UUID` | NO | — | FK to `neighborhoods.id`. |
| `author_id` | `UUID` | NO | — | FK to `users.id`. |
| `membership_id` | `UUID` | NO | — | FK to `neighborhood_members.id`. Captures tier at time of posting. |
| `content` | `TEXT` | NO | — | Post body. Min 2 chars, max 1000 chars. |
| `category` | `TEXT` | NO | — | User-selected: `power`, `security`, `infrastructure`, `water`, `general`. |
| `ai_classification` | `TEXT` | YES | NULL | AI output: `emergency`, `community`, `general`. Null until classified. |
| `ai_classification_confidence` | `DECIMAL(4,3)` | YES | NULL | Confidence score 0.000–1.000. |
| `ai_classified_at` | `TIMESTAMPTZ` | YES | NULL | When classification completed. |
| `is_emergency` | `BOOLEAN` | NO | `false` | True if AI classifies as emergency OR anchor overrides to emergency. |
| `is_pinned` | `BOOLEAN` | NO | `false` | True if `is_emergency = true` and not yet resolved. |
| `is_resolved` | `BOOLEAN` | NO | `false` | True when marked resolved by author or anchor. |
| `resolved_at` | `TIMESTAMPTZ` | YES | NULL | When resolved. |
| `resolved_by` | `UUID` | YES | NULL | FK to `users.id`. Who resolved it. |
| `moderated_at` | `TIMESTAMPTZ` | YES | NULL | When anchor removed or acted on this post. |
| `moderated_by` | `UUID` | YES | NULL | FK to `users.id` (anchor). |
| `moderation_action` | `TEXT` | YES | NULL | Enum: `removed`, `classification_overridden`. |
| `language_detected` | `TEXT` | YES | NULL | `en`, `ur`, `mixed`. Detected at classification time. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | Maintained by trigger. |
| `deleted_at` | `TIMESTAMPTZ` | YES | NULL | Soft delete (anchor removal). |

**Constraints:**
- `CHECK (char_length(content) >= 2 AND char_length(content) <= 1000)`
- `CHECK (category IN ('power', 'security', 'infrastructure', 'water', 'general'))`
- `CHECK (ai_classification IN ('emergency', 'community', 'general') OR ai_classification IS NULL)`
- `CHECK (moderation_action IN ('removed', 'classification_overridden') OR moderation_action IS NULL)`
- `CHECK (NOT (is_resolved = true AND resolved_at IS NULL))` — resolved must have timestamp.
- `CHECK (ai_classification_confidence IS NULL OR (ai_classification_confidence >= 0 AND ai_classification_confidence <= 1))`

**Indexes:**
- `idx_posts_neighborhood_feed` on `(neighborhood_id, created_at DESC)`
  where `deleted_at IS NULL` — primary feed query index.
- `idx_posts_emergency` on `(neighborhood_id, is_emergency, is_pinned)`
  where `deleted_at IS NULL AND is_emergency = true` — emergency pin query.
- `idx_posts_author` on `(author_id)` where `deleted_at IS NULL`
- `idx_posts_unclassified` on `(created_at)` where `ai_classified_at IS NULL AND deleted_at IS NULL`
  — used by background classification worker to find posts awaiting AI processing.

**RLS Policies:**
- `SELECT`: Members of the neighborhood can read non-deleted posts.
  Tier 1 members can read (feed browsing is a Tier 1 capability).
- `INSERT`: Tier 2+ members only. Enforced via RLS check on
  `neighborhood_members.tier >= 2` for the posting user's membership.
- `UPDATE`: Authors can update `is_resolved` and `resolved_at` on their
  own posts. Anchors (via service role) can update moderation fields.
  No user can update `ai_classification` directly.
- `DELETE`: Not permitted. Soft delete via `deleted_at`.

---

### 2.9 `post_flags`

**Purpose:** Tracks member flags on posts and anchor moderation actions.
Also used to count escalation flags for the 20% anchor override threshold.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary key. |
| `post_id` | `UUID` | NO | — | FK to `posts.id`. |
| `flagged_by` | `UUID` | NO | — | FK to `users.id`. |
| `membership_id` | `UUID` | NO | — | FK to `neighborhood_members.id`. |
| `flag_type` | `TEXT` | NO | — | Enum: `content_violation`, `false_emergency`, `exclusionary_content`, `anchor_action_dispute`. |
| `description` | `TEXT` | YES | NULL | Optional additional context. Max 300 chars. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |

**Constraints:**
- `UNIQUE (post_id, flagged_by)` — one flag per user per post.
- `CHECK (flag_type IN ('content_violation', 'false_emergency', 'exclusionary_content', 'anchor_action_dispute'))`

**Indexes:**
- `idx_pf_post_id` on `(post_id)` — count flags per post.
- `idx_pf_flagged_by` on `(flagged_by)`

**RLS Policies:**
- `SELECT`: Users can see their own flags. Anchors can see all flags for
  their neighborhood's posts. Service role sees all.
- `INSERT`: Tier 2+ members can flag. One flag per post per user (unique
  constraint enforced).
- `UPDATE`: Not permitted.
- `DELETE`: Not permitted.

---

### 2.10 `tier3_vouching_requests`

**Purpose:** Tracks Tier 3 vouching requests requiring two co-signatures
(anchor + one other verified member).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary key. |
| `candidate_user_id` | `UUID` | NO | — | FK to `users.id`. User requesting Tier 3. |
| `candidate_membership_id` | `UUID` | NO | — | FK to `neighborhood_members.id`. |
| `neighborhood_id` | `UUID` | NO | — | FK to `neighborhoods.id`. |
| `anchor_signed` | `BOOLEAN` | NO | `false` | True when the anchor has co-signed. |
| `anchor_signed_at` | `TIMESTAMPTZ` | YES | NULL | When anchor signed. |
| `anchor_user_id` | `UUID` | YES | NULL | FK to `users.id`. Which anchor signed. |
| `cosigner_signed` | `BOOLEAN` | NO | `false` | True when the second member has co-signed. |
| `cosigner_signed_at` | `TIMESTAMPTZ` | YES | NULL | When second member signed. |
| `cosigner_user_id` | `UUID` | YES | NULL | FK to `users.id`. Which member co-signed. |
| `status` | `TEXT` | NO | `'pending'` | Enum: `pending`, `approved`, `rejected`, `expired`. |
| `approved_at` | `TIMESTAMPTZ` | YES | NULL | When both signatures completed and tier upgraded. |
| `expires_at` | `TIMESTAMPTZ` | NO | — | 30 days from creation. Request expires if not completed. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | Maintained by trigger. |

**Constraints:**
- `CHECK (status IN ('pending', 'approved', 'rejected', 'expired'))`
- `CHECK (expires_at > created_at)`
- `CHECK (anchor_user_id != cosigner_user_id OR cosigner_user_id IS NULL)`
  — anchor and co-signer cannot be the same person.
- `CHECK (anchor_user_id != candidate_user_id OR anchor_user_id IS NULL)`
  — anchor cannot vouch for themselves.
- One active pending request per user per neighborhood — enforced at
  application layer.

**Indexes:**
- `idx_t3vr_neighborhood_pending` on `(neighborhood_id, status)`
  where `status = 'pending'`
- `idx_t3vr_candidate` on `(candidate_user_id)`

**RLS Policies:**
- `SELECT`: The candidate can see their own request. The anchor of the
  neighborhood can see all pending requests. Verified members can see
  requests where they are the cosigner.
- `INSERT`: Service role only. Request initiated via backend endpoint.
- `UPDATE`: Service role only.
- `DELETE`: Not permitted.

---

### 2.11 `worker_listings`

**Purpose:** Service worker profiles visible in the neighborhood directory.
Listings-only — no transactions or payment data.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary key. |
| `neighborhood_id` | `UUID` | NO | — | FK to `neighborhoods.id`. |
| `submitted_by` | `UUID` | NO | — | FK to `users.id`. Member who added this listing. |
| `worker_name` | `TEXT` | NO | — | Name of the worker. Max 80 chars. |
| `category` | `TEXT` | NO | — | Enum: `electrician`, `plumber`, `maid`, `cook`, `driver`, `other`. |
| `description` | `TEXT` | YES | NULL | Brief description. Max 300 chars. |
| `contact_phone` | `TEXT` | YES | NULL | Worker's contact number. Visible to Tier 2+ only (RLS). |
| `is_verified_badge` | `BOOLEAN` | NO | `false` | True when badge criteria met (5+ confirmed jobs, 4.0+ avg). |
| `confirmed_job_count` | `INTEGER` | NO | `0` | Count of confirmed completed jobs. Updated by trigger. |
| `average_rating` | `DECIMAL(3,2)` | YES | NULL | Average review score (1.00–5.00). Updated by trigger. |
| `is_promoted` | `BOOLEAN` | NO | `false` | True for paid promoted listing. Appears labeled in directory. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | Maintained by trigger. |
| `deleted_at` | `TIMESTAMPTZ` | YES | NULL | Soft delete. |

**Constraints:**
- `CHECK (category IN ('electrician', 'plumber', 'maid', 'cook', 'driver', 'other'))`
- `CHECK (char_length(worker_name) >= 2 AND char_length(worker_name) <= 80)`
- `CHECK (confirmed_job_count >= 0)`
- `CHECK (average_rating IS NULL OR (average_rating >= 1.00 AND average_rating <= 5.00))`
- Badge criteria enforced by trigger: `is_verified_badge` = true only when
  `confirmed_job_count >= 5 AND average_rating >= 4.00`.

**Indexes:**
- `idx_wl_neighborhood_category` on `(neighborhood_id, category)` where `deleted_at IS NULL`
- `idx_wl_verified_badge` on `(neighborhood_id, is_verified_badge)` where `deleted_at IS NULL`

**RLS Policies:**
- `SELECT`: All members can see listings excluding `contact_phone`.
  Tier 2+ members can see `contact_phone`. Implemented via a view
  `worker_listings_public` that omits `contact_phone` for Tier 1 members.
- `INSERT`: Tier 2+ members can add listings.
- `UPDATE`: Submitted-by user can update their own listing fields except
  `is_verified_badge`, `confirmed_job_count`, `average_rating` (computed).
  Service role updates computed fields.
- `DELETE`: Not permitted. Soft delete via `deleted_at`.

---

### 2.12 `worker_reviews`

**Purpose:** Reviews of service workers. Gated by job confirmation — both
member and worker (confirmed by member on worker's behalf at prototype stage)
must confirm the job before a review is unlocked.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary key. |
| `listing_id` | `UUID` | NO | — | FK to `worker_listings.id`. |
| `reviewer_id` | `UUID` | NO | — | FK to `users.id`. |
| `reviewer_membership_id` | `UUID` | NO | — | FK to `neighborhood_members.id`. |
| `rating` | `INTEGER` | NO | — | 1 to 5. |
| `review_text` | `TEXT` | YES | NULL | Optional written review. Max 500 chars. |
| `job_confirmed` | `BOOLEAN` | NO | `false` | True when job confirmed — review only submittable when true. |
| `job_confirmed_at` | `TIMESTAMPTZ` | YES | NULL | When job was confirmed. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `deleted_at` | `TIMESTAMPTZ` | YES | NULL | Soft delete. |

**Constraints:**
- `UNIQUE (listing_id, reviewer_id) WHERE deleted_at IS NULL`
  — one review per member per worker listing.
- `CHECK (rating >= 1 AND rating <= 5)`
- `CHECK (NOT (job_confirmed = false AND review_text IS NOT NULL))`
  — review content only settable after job confirmation. Enforced at
  application layer; this constraint catches direct DB inserts.

**Indexes:**
- `idx_wr_listing_id` on `(listing_id)` where `deleted_at IS NULL`
- `idx_wr_reviewer_id` on `(reviewer_id)`

**RLS Policies:**
- `SELECT`: All neighborhood members can read reviews for listings in
  their neighborhood.
- `INSERT`: Tier 2+ members can insert a review only if `job_confirmed = true`.
  Enforced via RLS policy checking the `job_confirmed` field on insert.
- `UPDATE`: Reviewer can update their own review text and rating while
  `job_confirmed = true`. Cannot update `job_confirmed` or `listing_id`.
- `DELETE`: Not permitted. Soft delete via `deleted_at`.

**Trigger:** On INSERT or UPDATE, recalculate `worker_listings.average_rating`
and `worker_listings.confirmed_job_count` and update `worker_listings.is_verified_badge`.

---

### 2.13 `civic_dashboard_snapshots`

**Purpose:** Pre-computed aggregates for the civic dashboard. Snapshots are
generated nightly (and on-demand via the export endpoint) by the FastAPI
background task. The dashboard reads from snapshots, not from live post data,
for performance.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | Primary key. |
| `neighborhood_id` | `UUID` | NO | — | FK to `neighborhoods.id`. |
| `period_days` | `INTEGER` | NO | — | Period this snapshot covers: 7, 30, or 90. |
| `snapshot_date` | `DATE` | NO | — | The date this snapshot was computed (UTC date). |
| `total_posts` | `INTEGER` | NO | `0` | Total non-deleted posts in period. |
| `emergency_posts` | `INTEGER` | NO | `0` | Posts with `is_emergency = true`. |
| `resolved_posts` | `INTEGER` | NO | `0` | Posts with `is_resolved = true`. |
| `power_count` | `INTEGER` | NO | `0` | Posts with `category = 'power'`. |
| `security_count` | `INTEGER` | NO | `0` | Posts with `category = 'security'`. |
| `infrastructure_count` | `INTEGER` | NO | `0` | Posts with `category = 'infrastructure'`. |
| `water_count` | `INTEGER` | NO | `0` | Posts with `category = 'water'`. |
| `general_count` | `INTEGER` | NO | `0` | Posts with `category = 'general'`. |
| `power_resolved` | `INTEGER` | NO | `0` | Power posts that are resolved. |
| `security_resolved` | `INTEGER` | NO | `0` | Security posts that are resolved. |
| `infrastructure_resolved` | `INTEGER` | NO | `0` | Infrastructure posts that are resolved. |
| `water_resolved` | `INTEGER` | NO | `0` | Water posts that are resolved. |
| `active_members` | `INTEGER` | NO | `0` | Tier 2+ members who posted at least once in the period. |
| `export_text` | `TEXT` | YES | NULL | Pre-formatted plain text summary for the export button. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | When this snapshot was computed. |

**Constraints:**
- `UNIQUE (neighborhood_id, period_days, snapshot_date)`
  — one snapshot per neighborhood per period per day.
- `CHECK (period_days IN (7, 30, 90))`
- `CHECK (total_posts >= 0)` and all count columns >= 0.

**Indexes:**
- `idx_cds_neighborhood_period` on `(neighborhood_id, period_days, snapshot_date DESC)`
  — primary dashboard query: latest snapshot for a neighborhood and period.

**RLS Policies:**
- `SELECT`: Tier 2+ members of the neighborhood can read snapshots.
  Tier 1 members cannot access the civic dashboard.
- `INSERT`: Service role only (background task).
- `UPDATE`: Service role only.
- `DELETE`: Not permitted.

---

## 3. Supabase Storage Buckets

### 3.1 `verification-docs` (Private)

- **Access:** Service role only. No public URL. Signed URLs generated
  server-side, expire after 1 hour.
- **Path convention:** `{user_id}/{verification_record_id}/{document_id}.{ext}`
- **Accepted MIME types:** `image/jpeg`, `image/png`, `application/pdf`
- **Max file size:** 10MB per file
- **Lifecycle:** Files deleted after verification decision is recorded.
  Deletion tracked in `verification_documents.deleted_from_storage_at`.

---

## 4. Supabase Realtime Configuration

### 4.1 Enabled Tables

Only the `posts` table has Realtime enabled. All other tables use standard
REST queries.

```sql
-- Enable Realtime on posts table
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
```

### 4.2 Channel Convention

Frontend subscribes to a neighborhood-scoped channel:

```
channel name: neighborhood:{neighborhood_id}
filter:       neighborhood_id=eq.{neighborhood_id}
events:       INSERT, UPDATE
```

The frontend receives only INSERT (new post) and UPDATE (post resolved,
classification applied) events. DELETE events are not broadcast —
soft-deleted posts are filtered by a follow-up query if needed.

---

## 5. Row Level Security — Implementation Notes

### 5.1 Helper Functions

```sql
-- Returns the authenticated user's ID from the JWT
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT auth.uid();  -- Supabase built-in
$$ LANGUAGE SQL STABLE;

-- Returns the tier of a user's membership in a neighborhood
CREATE OR REPLACE FUNCTION get_member_tier(p_user_id UUID, p_neighborhood_id UUID)
RETURNS INTEGER AS $$
  SELECT tier FROM neighborhood_members
  WHERE user_id = p_user_id
    AND neighborhood_id = p_neighborhood_id
    AND deleted_at IS NULL
    AND is_active = true
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Returns true if a user is the active anchor of a neighborhood
CREATE OR REPLACE FUNCTION is_anchor(p_user_id UUID, p_neighborhood_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM anchor_roles
    WHERE user_id = p_user_id
      AND neighborhood_id = p_neighborhood_id
      AND is_active = true
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

### 5.2 Key Policy Patterns

```sql
-- Pattern: Member of neighborhood can select
CREATE POLICY "neighborhood_member_select" ON posts
FOR SELECT USING (
  get_member_tier(auth.uid(), neighborhood_id) IS NOT NULL
  AND deleted_at IS NULL
);

-- Pattern: Tier 2+ can insert
CREATE POLICY "tier2_member_insert" ON posts
FOR INSERT WITH CHECK (
  get_member_tier(auth.uid(), neighborhood_id) >= 2
  AND author_id = auth.uid()
);

-- Pattern: Own row update
CREATE POLICY "author_resolve_post" ON posts
FOR UPDATE USING (author_id = auth.uid())
WITH CHECK (
  author_id = auth.uid()
  -- Only allow updating resolution fields, not content
);
```

---

## 6. Migration Strategy

### 6.1 File Naming

```
supabase/migrations/
  20260610_001_initial_schema.sql
  20260610_002_rls_policies.sql
  20260610_003_triggers.sql
  20260610_004_realtime.sql
  20260611_001_<description>.sql
```

Format: `YYYYMMDD_NNN_description.sql` where NNN is a zero-padded sequence
number within the day. Always use Supabase CLI (`supabase db push`) to apply.
Never apply migrations manually through the Supabase dashboard SQL editor.

### 6.2 Migration Rules

- Every migration is idempotent where possible (`CREATE TABLE IF NOT EXISTS`,
  `CREATE INDEX IF NOT EXISTS`, `CREATE POLICY IF NOT EXISTS`).
- Schema changes (adding a column) and data migrations are in separate files.
- Never drop a column in a migration without a deprecation period. For the
  prototype this rule is relaxed — drops are permitted if no data exists yet.
- Every migration file starts with a comment block:
  ```sql
  -- Migration: 20260610_001_initial_schema
  -- Description: Creates all core tables
  -- Author: Halqa team
  -- Date: 2026-06-10
  ```

---

## 7. Data Lifecycle

### 7.1 Soft Delete Behavior

All soft-deleted rows are excluded by default in all queries using the
`WHERE deleted_at IS NULL` pattern. The application layer never returns
soft-deleted data to users. Soft-deleted rows are retained for audit purposes.

### 7.2 Verification Document Deletion

This is a mandatory, time-sensitive operation tied to the platform's
privacy commitment. Implementation:

1. When a `verification_records` status is updated to `approved` or
   `rejected`, a background task is triggered.
2. The task retrieves all `verification_documents` for that record where
   `deleted_from_storage_at IS NULL`.
3. For each document, it deletes the file from Supabase Storage.
4. On successful deletion, sets `deleted_from_storage_at = now()`.
5. If deletion fails, retries up to 3 times with exponential backoff.
6. A daily monitoring query checks for documents where
   `deleted_from_storage_at IS NULL` and the associated verification record
   has `status IN ('approved', 'rejected')` and `decided_at < now() - interval '1 hour'`.
   Any such documents represent a compliance failure and must be alerted.

### 7.3 Anchor Action Log Retention

`anchor_actions_log` is never deleted. It is the permanent audit trail.
For the prototype, no archival strategy is needed — the table will not
grow to a size requiring it.

### 7.4 Civic Dashboard Snapshot Retention

Keep the latest 3 snapshots per neighborhood per period (7/30/90 days).
Older snapshots can be deleted by the background task after computing a
new one. For the prototype, no automated cleanup is required — the table
will not grow significantly with demo data.

---

## 8. Seed Data

For the hackathon demo, seed data must include:

- **1 demo neighborhood:** "Block 5, DHA Phase 5, Lahore"
- **5 demo users:** mix of Tier 1, Tier 2, and Tier 3 members including
  one anchor (Ayesha persona)
- **15 demo posts** over the past 30 days: mix of categories, some
  resolved, 3 classified as emergency (1 power, 1 security, 1 infrastructure)
- **1 pre-computed civic dashboard snapshot** for 7-day and 30-day periods
- **3 worker listings:** one electrician (verified badge), one plumber,
  one maid (no badge)
- **4 worker reviews** to demonstrate the rating system

Seed data is embedded inline in the initial migration file (`20260611_001_initial_schema.sql`), ensuring records are created when the migration is pushed. Applied via `supabase db push`. Never applied to production separately.

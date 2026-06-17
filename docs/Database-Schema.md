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
                                    |     └─< post_reports
                                    └─< anchor_roles
                                    |     └─< anchor_actions_log
                                    |     └─< post_reports (anchor resolution)
                                    └─< civic_dashboard_snapshots
                                    └─< worker_listings
                                          └─< worker_reviews

users
  └─< verification_records
        └─ verification_documents (storage reference)

neighborhood_members (Tier 3 vouching)
  └─< vouching_requests
        └─ [anchor initiates + signs]
        └─ [second member co-signs]
```

---

## 2. Table Definitions (Active & Working Schema)

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
| `avatar_url` | `TEXT` | YES | NULL | URL to user's uploaded avatar. |
| `preferred_language` | `TEXT` | NO | `'en'` | Display language preference: `'en'` or `'ur'`. |
| `push_token` | `TEXT` | YES | NULL | FCM/APNS push token for devices. |
| `onboarding_complete` | `BOOLEAN` | NO | `false` | True once user has joined a neighborhood. Added via migration. |
| `is_active` | `BOOLEAN` | NO | `true` | False if the user profile is deactivated (soft delete). |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | Profile creation time. |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | Last profile update. Maintained by trigger. |

**Constraints:**
- `CHECK (char_length(display_name) >= 2 AND char_length(display_name) <= 60)`
- `UNIQUE (phone) WHERE phone IS NOT NULL AND is_active = true`

**Indexes:**
- `idx_users_phone` on `(phone)` where `phone IS NOT NULL`
- `idx_users_active` on `(is_active)` where `is_active = true`

**RLS Policies:**
- `SELECT`: Users can read their own row. Anchor of a shared neighborhood can read display_name and id of members.
- `UPDATE`: Users can update their own display_name and preferred_language.
- `INSERT`: Handled by auth trigger — not directly insertable by users.
- `DELETE`: Not permitted. Soft delete via `is_active = false`.

> [!NOTE]
> - **email**: Originally planned as a column on the `users` table. In the working prototype, email validation is handled by Supabase Auth, and the email address is retrieved from `auth.users` instead of duplicated in `public.users`.
> - **deleted_at**: Soft deletes were originally planned using a `deleted_at` timestamp. The active implementation uses the simpler `is_active = false` flag.

---

### 2.2 `neighborhoods`

**Purpose:** Represents a single verified neighborhood unit — a street, a
housing society block, or a defined community area.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `uuid_generate_v4()` | Primary key. |
| `name` | `TEXT` | NO | — | Display name. e.g. "Street 7, DHA Phase 5". Max 120 chars. |
| `name_urdu` | `TEXT` | YES | NULL | Urdu script name display. |
| `city` | `TEXT` | NO | — | City name. Max 60 chars. |
| `sector` | `TEXT` | YES | NULL | Sub-area within city (e.g., "Phase 5", "G-11"). Max 80 chars. |
| `province` | `TEXT` | NO | — | Province name (e.g. "Punjab", "Sindh"). |
| `lat` | `NUMERIC(9,6)` | YES | NULL | Center latitude coordinate. |
| `lng` | `NUMERIC(9,6)` | YES | NULL | Center longitude coordinate. |
| `boundary_geojson` | `JSONB` | YES | NULL | GeoJSON boundary polygon. |
| `member_count` | `INTEGER` | NO | `0` | Cached count of active members (updated by trigger). |
| `is_active` | `BOOLEAN` | NO | `true` | False if neighborhood is suspended or merged. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | Maintained by trigger. |

**Constraints:**
- `CHECK (char_length(name) >= 3 AND char_length(name) <= 120)`
- `CHECK (member_count >= 0)`

**Indexes:**
- `idx_neighborhoods_name_trgm` on `name` using GIN with `gin_trgm_ops`
- `idx_neighborhoods_city` on `(city)`
- `idx_neighborhoods_active` on `(is_active)` where `is_active = true`

**RLS Policies:**
- `SELECT`: Any authenticated user can read active neighborhoods.
- `INSERT`: Only service role.
- `UPDATE`: Only service role.
- `DELETE`: Not permitted. Soft delete via `is_active = false`.

> [!NOTE]
> - **sector**: Originally named `sector_or_area`. It is simplified to `sector` in the database.
> - **total_member_count**: Originally planned to distinguish between verified and unverified member counts. The prototype uses a single trigger-managed `member_count` to represent active neighborhood members.
> - **deleted_at**: Soft deletes are handled via `is_active = false`.

---

### 2.3 `neighborhood_members`

**Purpose:** Join table between users and neighborhoods. Stores tier, join
date, and active membership state.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `uuid_generate_v4()` | Primary key. |
| `user_id` | `UUID` | NO | — | FK to `users.id`. |
| `neighborhood_id` | `UUID` | NO | — | FK to `neighborhoods.id`. |
| `tier` | `verification_tier` | NO | `'tier_1'` | ENUM: `'tier_1'`, `'tier_2'`, `'tier_3'`. |
| `declared_address` | `TEXT` | NO | — | Free-text address as entered by user. |
| `joined_at` | `TIMESTAMPTZ` | NO | `now()` | When the user joined this neighborhood. |
| `tier_upgraded_at` | `TIMESTAMPTZ` | YES | NULL | When the user last moved to a higher tier. |
| `is_active` | `BOOLEAN` | NO | `true` | False if membership is suspended. |

**Constraints:**
- `UNIQUE (user_id, neighborhood_id)`

**Indexes:**
- `idx_nm_user` on `(user_id)`
- `idx_nm_neighborhood` on `(neighborhood_id)`
- `idx_nm_tier` on `(neighborhood_id, tier)`
- `idx_nm_active` on `(is_active)` where `is_active = true`

**RLS Policies:**
- `SELECT`: A user can read their own membership row. Peers can read basic memberships for verified users (`tier_2+`).
- `INSERT`: Users join via the `/members/join` API endpoint.
- `UPDATE`: Tier upgrades managed by verification services.
- `DELETE`: Not permitted. Soft delete via `is_active = false`.

> [!NOTE]
> - **tier**: Originally planned as integer values `1 | 2 | 3`. The active database uses a custom PostgreSQL enum `verification_tier` (`'tier_1'`, `'tier_2'`, `'tier_3'`).
> - **deleted_at**: Soft deletes are handled via `is_active = false`.

---

### 2.4 `verification_records`

**Purpose:** Tracks the verification lifecycle for a user's neighborhood membership.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `uuid_generate_v4()` | Primary key. |
| `member_id` | `UUID` | NO | — | FK to `neighborhood_members.id`. |
| `status` | `verification_status`| NO | `'pending'` | ENUM: `'pending'`, `'approved'`, `'rejected'`, `'expired'`. |
| `tier_target` | `INTEGER` | NO | `2` | Mapped target tier (2 or 3). Added via migration. |
| `declared_address` | `TEXT` | NO | — | Declared address snapshot. |
| `extracted_address` | `TEXT` | YES | NULL | Address string extracted by AI OCR. |
| `ocr_confidence` | `DECIMAL(4,3)` | YES | NULL | AI confidence score (0.000 to 1.000). |
| `rejection_reason` | `TEXT` | YES | NULL | ENUM check values: `'address_mismatch'`, `'document_unreadable'`, `'name_not_found'`, `'document_type_invalid'`. |
| `reviewer_notes` | `TEXT` | YES | NULL | Manual review notes. |
| `reviewed_by` | `UUID` | YES | NULL | FK to `users.id` (null if auto-processed). |
| `submitted_at` | `TIMESTAMPTZ` | NO | `now()` | Document submission timestamp. |
| `reviewed_at` | `TIMESTAMPTZ` | YES | NULL | Timestamp of decision (approval or rejection). |
| `decided_at` | `TIMESTAMPTZ` | YES | NULL | Migration-added decision timestamp (unused by backend in favor of `reviewed_at`). |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | Record creation timestamp. |

**Constraints:**
- `CHECK (tier_target IN (2, 3))`
- `CHECK (ocr_confidence IS NULL OR (ocr_confidence >= 0 AND ocr_confidence <= 1))`

**Indexes:**
- `idx_vr_member` on `(member_id)`
- `idx_vr_status` on `(status)`
- `idx_vr_pending` on `(status, submitted_at)` where `status = 'pending'`

**RLS Policies:**
- `SELECT`: Users can read their own verification records.
- `INSERT`: Allowed for authenticated users submitting their own documents.
- `UPDATE`/`DELETE`: Service role only.

> [!NOTE]
> - **member_id**: The original plan detailed three FK columns (`user_id`, `neighborhood_id`, and `membership_id`). In the working database, this is simplified into `member_id` which points directly to `neighborhood_members.id` (avoiding redundant schemas).
> - **address_submitted** and **address_extracted**: Renamed to `declared_address` and `extracted_address`.
> - **decided_at**: Added in a migration, but the backend services write to `reviewed_at` to mark decisions.

---

### 2.5 `verification_documents`

**Purpose:** References to document files uploaded to private Supabase Storage (`verification-docs` bucket) for verification.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `uuid_generate_v4()` | Primary key. |
| `verification_record_id`| `UUID` | NO | — | FK to `verification_records.id`. |
| `storage_path` | `TEXT` | NO | — | Path in `verification-documents` private bucket. |
| `document_type` | `TEXT` | NO | — | Type: `'utility_bill'`, `'rental_agreement'`, `'society_card'`, etc. |
| `file_size_bytes` | `INTEGER` | YES | NULL | File size in bytes. |
| `uploaded_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `deleted_from_storage_at`| `TIMESTAMPTZ`| YES | NULL | When deleted (enforces privacy cleanup). |

**Indexes:**
- `idx_vd_record` on `(verification_record_id)`
- `idx_vd_undeleted` on `(deleted_from_storage_at)` where `deleted_from_storage_at IS NULL`

**RLS Policies:**
- All operations are service role only. regular users cannot query or access document records directly.

> [!NOTE]
> - **file_name** and **mime_type**: Originally planned as columns. In the active backend, these metadata values are handled directly in the storage headers rather than stored as redundant database columns.

---

### 2.6 `anchor_roles`

**Purpose:** Tracks current and historical anchor assignments per neighborhood.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `uuid_generate_v4()` | Primary key. |
| `neighborhood_id` | `UUID` | NO | — | FK to `neighborhoods.id`. |
| `user_id` | `UUID` | NO | — | FK to `users.id`. |
| `member_id` | `UUID` | NO | — | FK to `neighborhood_members.id`. |
| `term_started_at` | `TIMESTAMPTZ` | NO | `now()` | Anchor term start. |
| `term_ends_at` | `TIMESTAMPTZ` | NO | `now() + 6 months`| Anchor term end. |
| `is_active` | `BOOLEAN` | NO | `true` | True if this is the active anchor. |
| `renewed_count` | `INTEGER` | NO | `0` | Count of times term renewed. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |

**Constraints:**
- `UNIQUE (neighborhood_id) WHERE is_active = true` (enforces single active anchor).

**Indexes:**
- `idx_anchor_neighborhood` on `(neighborhood_id)`
- `idx_anchor_user` on `(user_id)`

**RLS Policies:**
- `SELECT`: Any member of the neighborhood can read the active anchor record. Historical records are service role only.
- `INSERT`/`UPDATE`: Service role only.

> [!NOTE]
> - **membership_id**: Renamed to `member_id`.
> - **term_start** and **term_end**: Renamed to `term_started_at` and `term_ends_at`.
> - **deactivated_at**: Inactive anchor records are managed via `is_active = false` instead of a separate timestamp column.

---

### 2.7 `anchor_actions_log`

**Purpose:** Immutable audit log of all anchor actions. Append-only.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `uuid_generate_v4()` | Primary key. |
| `anchor_role_id` | `UUID` | NO | — | FK to `anchor_roles.id`. |
| `neighborhood_id` | `UUID` | NO | — | FK to `neighborhoods.id`. |
| `actor_user_id` | `UUID` | NO | — | FK to `users.id` (anchor user performing action). |
| `action_type` | `anchor_action_type` | NO | — | ENUM: `post_removed`, `post_pinned`, `post_unpinned`, `member_flagged`, `escalation_created`, `vouching_initiated`, `vouching_completed`, `vouching_rejected`, `dismiss_report`. |
| `target_post_id` | `UUID` | YES | NULL | FK to `posts.id`. |
| `target_member_id` | `UUID` | YES | NULL | FK to `neighborhood_members.id`. |
| `metadata` | `JSONB` | YES | NULL | Action details. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | Log creation. |

**Indexes:**
- `idx_aal_anchor` on `(anchor_role_id)`
- `idx_aal_neighborhood` on `(neighborhood_id)`
- `idx_aal_actor` on `(actor_user_id)`
- `idx_aal_created` on `(created_at DESC)`

**RLS Policies:**
- Service role only. Regular users cannot query this table.

---

### 2.8 `posts`

**Purpose:** Stores all posts and alerts on the dynamic neighborhood feed.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `uuid_generate_v4()` | Primary key. |
| `neighborhood_id` | `UUID` | NO | — | FK to `neighborhoods.id`. |
| `author_member_id` | `UUID` | NO | — | FK to `neighborhood_members.id` (author). |
| `body` | `TEXT` | NO | — | Post body text. Max 500 chars. |
| `body_language` | `TEXT` | NO | `'en'` | Detected language: `'en'`, `'ur'`, or `'mixed'`. |
| `category` | `post_category` | NO | `'general'`| ENUM: `power`, `security`, `infrastructure`, `water`, `general`. |
| `is_emergency` | `BOOLEAN` | NO | `false` | True if classified as an emergency. |
| `ai_confidence` | `NUMERIC(4,3)`| YES | NULL | Score from Gemini classifier. |
| `is_resolved` | `BOOLEAN` | NO | `false` | True if marked resolved by author/anchor. |
| `resolved_at` | `TIMESTAMPTZ` | YES | NULL | Resolution time. |
| `resolved_by_member_id`| `UUID`| YES | NULL | FK to `neighborhood_members.id`. |
| `is_pinned` | `BOOLEAN` | NO | `false` | True if emergency and pinned at top. |
| `is_removed` | `BOOLEAN` | NO | `false` | Soft-deleted flag. |
| `removed_at` | `TIMESTAMPTZ` | YES | NULL | Soft-deletion timestamp. |
| `removed_by_anchor_id`| `UUID` | YES | NULL | FK to `anchor_roles.id`. |
| `removal_reason` | `TEXT` | YES | NULL | Anchor's removal reason notes. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | trigger-maintained. |
| `ai_civic_signal` | `TEXT` | YES | NULL | Summarized civic signal (AI generated). Added via migration. |

**Constraints:**
- `CHECK (char_length(body) >= 2 AND char_length(body) <= 1000)`
- `CHECK (category IN ('power', 'security', 'infrastructure', 'water', 'general'))`

**Indexes:**
- `idx_posts_neighborhood` on `(neighborhood_id, created_at DESC)`
- `idx_posts_emergency` on `(neighborhood_id, is_emergency, created_at DESC)` where `is_emergency = true AND is_removed = false`
- `idx_posts_active` on `(neighborhood_id, is_removed, created_at DESC)` where `is_removed = false`

**RLS Policies:**
- `SELECT`: Members of the neighborhood can read active (non-removed) posts (includes Tier 1).
- `INSERT`: Requires Tier 2+ membership check on the posting user.
- `UPDATE`: Original author can update resolution fields. Anchor role can update moderation fields.
- `DELETE`: Not permitted. Soft delete via `is_removed = true`.

> [!NOTE]
> - **content**: Renamed to `body`.
> - **author_id** and **membership_id**: Replaced by `author_member_id` to refer to the neighborhood member record directly.
> - **ai_classification**: User categories are overridden directly in the `category` column when AI confidence is high, rather than storing them in a separate column.
> - **deleted_at**: Soft deletes are handled via the combination of `is_removed = true`, `removed_at`, and `removed_by_anchor_id` rather than a single `deleted_at` timestamp.

---

### 2.9 `post_reports`

**Purpose:** Tracks member reports against feed posts for anchor moderation.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `uuid_generate_v4()` | Primary key. |
| `post_id` | `UUID` | NO | — | FK to `posts.id`. |
| `reporter_member_id` | `UUID` | NO | — | FK to `neighborhood_members.id`. |
| `reason` | `TEXT` | NO | — | Text reason. Max 300 chars. |
| `status` | `TEXT` | NO | `'open'` | Status ENUM: `'open'`, `'resolved'`, `'dismissed'`. |
| `resolved_at` | `TIMESTAMPTZ` | YES | NULL | Decision timestamp. |
| `resolved_by_action` | `TEXT` | YES | NULL | Action taken: `'removed'` or `'dismissed'`. |
| `resolved_by_anchor_role_id`| `UUID`| YES | NULL | FK to `anchor_roles.id`. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | Report timestamp. |

**Constraints:**
- `UNIQUE (post_id, reporter_member_id) WHERE status = 'open'` (prevent spam)
- `CHECK (char_length(reason) >= 1 AND char_length(reason) <= 300)`

**Indexes:**
- `idx_pr_neighborhood_post` on `(post_id)`
- `idx_pr_reporter` on `(reporter_member_id)`
- `idx_pr_status` on `(status)` where `status = 'open'`

**RLS Policies:**
- `SELECT`: Reporter can read own; Anchor can read open reports in their neighborhood.
- `INSERT`: Tier 2+ members can create.
- `UPDATE`: Anchor only.

---

### 2.10 `vouching_requests`

**Purpose:** Tracks Tier 3 vouching requests (anchor + member co-signatures).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `uuid_generate_v4()` | Primary key. |
| `neighborhood_id` | `UUID` | NO | — | FK to `neighborhoods.id`. |
| `candidate_member_id` | `UUID` | NO | — | FK to `neighborhood_members.id` (vouch target). |
| `initiated_by_anchor_id`| `UUID` | NO | — | FK to `anchor_roles.id` (initiating anchor). |
| `cosigner_member_id` | `UUID` | YES | NULL | FK to `neighborhood_members.id` (second cosigner). |
| `anchor_signed_at` | `TIMESTAMPTZ` | NO | `now()` | Timestamp anchor signed/initiated. |
| `cosigner_signed_at` | `TIMESTAMPTZ` | YES | NULL | Timestamp second member co-signed. |
| `is_completed` | `BOOLEAN` | NO | `false` | True when fully vouch-approved (2 signatures). |
| `is_rejected` | `BOOLEAN` | NO | `false` | True if explicitly rejected. |
| `rejection_reason` | `TEXT` | YES | NULL | Rejection details. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `expires_at` | `TIMESTAMPTZ` | NO | `now() + 7 days`| Expiry timeline. |

**Constraints:**
- `CHECK (expires_at > created_at)`
- `CHECK (initiated_by_anchor_id != cosigner_member_id)`

**Indexes:**
- `idx_vr_candidate` on `(candidate_member_id)`
- `idx_vr_neighborhood` on `(neighborhood_id)`
- `idx_vouch_pending` on `(is_completed, is_rejected, expires_at)` where `is_completed = false and is_rejected = false`

**RLS Policies:**
- `SELECT`: Candidate user, active anchor, and assigned co-signer can read.
- `INSERT`/`UPDATE`: Service role only.

> [!NOTE]
> - **Table Name**: The original design spec referenced this table as `tier3_vouching_requests`. The database implementation uses the name `vouching_requests`.
> - **status**: Originally designed as a status string ENUM. Mapped in the database using the boolean combinations of `is_completed` and `is_rejected`.
> - **user columns**: Point to membership ids (`candidate_member_id`, `cosigner_member_id`) instead of user ids (`candidate_user_id`, `cosigner_user_id`).

---

### 2.11 `worker_listings`

**Purpose:** Directory entries for community service workers.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `uuid_generate_v4()` | Primary key. |
| `neighborhood_id` | `UUID` | NO | — | FK to `neighborhoods.id`. |
| `created_by_member_id`| `UUID` | NO | — | FK to `neighborhood_members.id` (recommender). |
| `worker_name` | `TEXT` | NO | — | Name of worker. |
| `worker_phone` | `TEXT` | YES | NULL | Phone number (shown only to Tier 2+). |
| `service_type` | `TEXT` | NO | — | Category: `'electrician'`, `'plumber'`, `'maid'`, `'driver'`, `'cook'`, etc. |
| `description` | `TEXT` | YES | NULL | Description notes. Max 300 chars. |
| `is_promoted` | `BOOLEAN` | NO | `false` | Directory promoting toggle. |
| `earned_badge` | `worker_badge_status`| NO|`'none'`| Badge ENUM: `'none'`, `'earning'`, `'earned'`. |
| `min_completed_jobs` | `INTEGER` | NO | `0` | Count of jobs completed. |
| `avg_rating` | `NUMERIC(3,2)`| YES | NULL | Average review score. |
| `status` | `listing_status`| NO | `'active'` | Status: `'active'`, `'suspended'`, etc. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | trigger-maintained. |

**Constraints:**
- `CHECK (char_length(worker_name) >= 2 AND char_length(worker_name) <= 80)`

**Indexes:**
- `idx_wl_neighborhood` on `(neighborhood_id, status)`
- `idx_wl_service_type` on `(neighborhood_id, service_type)`

**RLS Policies:**
- `SELECT`: All members can see listings (excluding `worker_phone`). Tier 2+ members can see `worker_phone` (implemented via public view overlay).
- `INSERT`: Tier 2+ members can add.
- `UPDATE`: Owner who recommended the worker can update basic details.

> [!NOTE]
> - **submitted_by**: Renamed to `created_by_member_id`.
> - **contact_phone** and **category**: Renamed to `worker_phone` and `service_type`.
> - **is_verified_badge**: Replaced by `earned_badge` (ENUM) to track granular badge progression ('none', 'earning', 'earned').
> - **confirmed_job_count** and **average_rating**: Renamed to `min_completed_jobs` and `avg_rating`.
> - **deleted_at**: Managed using `status = 'suspended'`.

---

### 2.12 `worker_reviews`

**Purpose:** Reviews of recommended workers.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `uuid_generate_v4()` | Primary key. |
| `listing_id` | `UUID` | NO | — | FK to `worker_listings.id`. |
| `reviewer_member_id` | `UUID` | NO | — | FK to `neighborhood_members.id`. |
| `job_confirmed_by_worker`| `BOOLEAN`| NO | `false` | Confirmation status from worker. |
| `job_confirmed_by_member`| `BOOLEAN`| NO | `false` | Confirmation status from member. |
| `rating` | `SMALLINT` | YES | NULL | Review rating (1 to 5). |
| `review_body` | `TEXT` | YES | NULL | Optional written review. Max 500 chars. |
| `is_published` | `BOOLEAN` | NO | `false` | True when both parties have confirmed. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `published_at` | `TIMESTAMPTZ` | YES | NULL | Publishing timestamp. |

**Constraints:**
- `UNIQUE (listing_id, reviewer_member_id)` (one review per member per worker)
- `CHECK (rating BETWEEN 1 AND 5)`

**Indexes:**
- `idx_wr_listing` on `(listing_id, is_published)`
- `idx_wr_reviewer` on `(reviewer_member_id)`

**RLS Policies:**
- `SELECT`: All members of neighborhood can read published reviews.
- `INSERT`/`UPDATE`: Reviewer can write if `job_confirmed` conditions met.

> [!NOTE]
> - **reviewer_id** and **reviewer_membership_id**: Unified into a single FK `reviewer_member_id` to refer to the member profile directly.
> - **review_text**: Renamed to `review_body`.
> - **job_confirmed**: Replaced by `job_confirmed_by_worker` and `job_confirmed_by_member` to implement the required two-party confirmation rules.

---

### 2.13 `civic_dashboard_snapshots`

**Purpose:** Pre-computed aggregates for the neighborhood dashboard.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `uuid_generate_v4()` | Primary key. |
| `neighborhood_id` | `UUID` | NO | — | FK to `neighborhoods.id`. |
| `period_start` | `DATE` | NO | — | Start date of covered period. |
| `period_end` | `DATE` | NO | — | End date of covered period. |
| `period_type` | `TEXT` | NO | — | Period type: `'7d'`, `'30d'`, or `'90d'`. |
| `total_posts` | `INTEGER` | NO | `0` | Total posts in period. |
| `emergency_posts` | `INTEGER` | NO | `0` | Emergency posts in period. |
| `resolved_posts` | `INTEGER` | NO | `0` | Resolved posts in period. |
| `category_breakdown` | `JSONB` | NO | `'{}'::jsonb`| Count mapping per category (JSONB format). |
| `active_members` | `INTEGER` | NO | `0` | Active members in period. |
| `computed_at` | `TIMESTAMPTZ` | NO | `now()` | Snapshot computation timestamp. |

**Constraints:**
- `UNIQUE (neighborhood_id, period_type, period_start)`
- `CHECK (period_type IN ('7d', '30d', '90d'))`

**Indexes:**
- `idx_cds_neighborhood` on `(neighborhood_id, period_type, period_start DESC)`

**RLS Policies:**
- `SELECT`: Tier 2+ neighborhood members can read. Tier 1 users blocked.
- `INSERT`/`UPDATE`: Service role only.

> [!NOTE]
> - **period_days** and **snapshot_date**: Mapped in the database to `period_type` and explicit range boundary fields `period_start`/`period_end`.
> - **count columns**: Individual columns (`power_count`, `security_count`, etc.) are replaced by the flexible `category_breakdown` JSONB object, making schema upgrades for new post categories unnecessary.
> - **export_text**: Removed from database. Export texts are constructed dynamically on-the-fly by backend service layers (`dashboard_service.py`) during user request.

---

### 2.14 `notifications`

**Purpose:** Persisted notification records.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `uuid_generate_v4()` | Primary key. |
| `user_id` | `UUID` | NO | — | FK to `users.id`. |
| `neighborhood_id` | `UUID` | YES | NULL | FK to `neighborhoods.id`. |
| `type` | `notification_type` | NO | — | ENUM: `verification_approved`, `verification_rejected`, `emergency_alert`, etc. |
| `title` | `TEXT` | NO | — | Display title. |
| `body` | `TEXT` | NO | — | Notification body message. |
| `deep_link` | `TEXT` | YES | NULL | Deep link schemes (e.g. `halqa://verification/result?status=approved`). |
| `is_read` | `BOOLEAN` | NO | `false` | Read toggle. |
| `push_sent_at` | `TIMESTAMPTZ` | YES | NULL | When push was dispatched. |
| `push_failed` | `BOOLEAN` | NO | `false` | Dispatch failure indicator. |
| `read_at` | `TIMESTAMPTZ` | YES | NULL | Read timestamp. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `data` | `JSONB` | NO | `'{}'::jsonb`| Metadata payload (deep-link details). Added via migration. |

**Indexes:**
- `idx_notifications_user` on `(user_id, created_at DESC)`
- `idx_notifications_unread` on `(user_id, is_read)` where `is_read = false`

**RLS Policies:**
- `SELECT`/`UPDATE`: User can read and update (mark read) their own notifications.

---

### 2.15 `moderation_escalations`

**Purpose:** Triggered when 20%+ of verified neighborhood members flag/dispute an anchor moderation action.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | NO | `uuid_generate_v4()` | Primary key. |
| `neighborhood_id` | `UUID` | NO | — | FK to `neighborhoods.id`. |
| `anchor_action_id` | `UUID` | NO | — | FK to `anchor_actions_log.id`. |
| `status` | `escalation_status`| NO| `'open'` | Status: `'open'`, `'under_review'`, `'resolved'`. |
| `flagged_by_count` | `INTEGER` | NO | `1` | Count of members flags. |
| `threshold_member_count`| `INTEGER`| NO | — | Member threshold target (snapshot of 20% count). |
| `resolved_by` | `UUID` | YES | NULL | FK to `users.id` (central moderator). |
| `resolution_notes` | `TEXT` | YES | NULL | Review notes. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | Creation time. |
| `resolved_at` | `TIMESTAMPTZ` | YES | NULL | Resolution timestamp. |

**Indexes:**
- `idx_me_neighborhood` on `(neighborhood_id)`
- `idx_me_status` on `(status)` where `status in ('open', 'under_review')`

**RLS Policies:**
- `SELECT`: Active anchor of the neighborhood can read (for escalations display).
- `INSERT`/`UPDATE`: Service role only.

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

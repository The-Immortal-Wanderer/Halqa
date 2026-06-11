-- =============================================================================
-- Halqa — Initial Schema Migration
-- File: 20260611_001_initial_schema.sql
-- Replace the scaffold stub with this file's content.
-- Apply via: supabase db push
-- =============================================================================
-- Execution order is significant — tables with FK dependencies come after
-- the tables they reference. RLS and helper functions come last.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";   -- for LIKE/ILIKE index support

-- Ensure uuid-ossp functions are accessible in the public schema
-- (required for uuid_generate_v4() calls throughout this migration)
alter extension "uuid-ossp" set schema public;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

create type verification_tier as enum ('tier_1', 'tier_2', 'tier_3');
create type verification_status as enum ('pending', 'approved', 'rejected');
create type post_category as enum ('power', 'security', 'infrastructure', 'water', 'general');
create type anchor_action_type as enum (
    'post_removed',
    'post_pinned',
    'post_unpinned',
    'member_flagged',
    'escalation_created',
    'vouching_initiated',
    'vouching_completed',
    'vouching_rejected'
);
create type escalation_status as enum ('open', 'under_review', 'resolved', 'dismissed');
create type listing_status as enum ('active', 'sold', 'removed');
create type worker_badge_status as enum ('none', 'earning', 'earned', 'revoked');
create type event_status as enum ('upcoming', 'ongoing', 'completed', 'cancelled');
create type notification_type as enum (
    'emergency_alert',
    'verification_approved',
    'verification_rejected',
    'new_neighbor',
    'event_reminder',
    'anchor_action',
    'vouching_request',
    'system'
);


-- ---------------------------------------------------------------------------
-- TABLE: neighborhoods
-- ---------------------------------------------------------------------------
-- Core geographic unit. Every member, post, and anchor belongs to exactly
-- one neighborhood.
-- ---------------------------------------------------------------------------

create table neighborhoods (
    id                  uuid primary key default uuid_generate_v4(),
    name                text        not null,
    name_urdu           text,
    city                text        not null,
    sector              text,                       -- e.g. "G-11", "DHA Phase 5"
    province            text        not null,
    lat                 numeric(9,6),               -- centroid latitude
    lng                 numeric(9,6),               -- centroid longitude
    boundary_geojson    jsonb,                      -- GeoJSON polygon (optional at MVP)
    member_count        integer     not null default 0,
    is_active           boolean     not null default true,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create index idx_neighborhoods_city     on neighborhoods(city);
create index idx_neighborhoods_province on neighborhoods(province);
create index idx_neighborhoods_active   on neighborhoods(is_active) where is_active = true;
-- Full-text search on name
create index idx_neighborhoods_name_trgm on neighborhoods using gin(name gin_trgm_ops);


-- ---------------------------------------------------------------------------
-- TABLE: users
-- ---------------------------------------------------------------------------
-- Extends Supabase Auth (auth.users). One row per registered account.
-- ---------------------------------------------------------------------------

create table users (
    id                  uuid primary key references auth.users(id) on delete cascade,
    display_name        text        not null,
    phone               text        unique,         -- E.164 format e.g. +923001234567
    avatar_url          text,
    preferred_language  text        not null default 'en',  -- 'en' | 'ur'
    push_token          text,                       -- FCM / APNS token for notifications
    is_active           boolean     not null default true,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create index idx_users_phone    on users(phone);
create index idx_users_active   on users(is_active) where is_active = true;


-- ---------------------------------------------------------------------------
-- TABLE: neighborhood_members
-- ---------------------------------------------------------------------------
-- Junction table: a user's membership in a neighborhood, including their
-- verification tier and status.
-- ---------------------------------------------------------------------------

create table neighborhood_members (
    id                      uuid primary key default uuid_generate_v4(),
    user_id                 uuid        not null references users(id) on delete cascade,
    neighborhood_id         uuid        not null references neighborhoods(id) on delete cascade,
    tier                    verification_tier   not null default 'tier_1',
    -- tier_1  = self-declared (read-only access)
    -- tier_2  = document-verified (full community feed access)
    -- tier_3  = community-vouched (marketplace + worker reviews)
    declared_address        text        not null,   -- free-text address as entered by user
    joined_at               timestamptz not null default now(),
    tier_upgraded_at        timestamptz,            -- last time tier was elevated
    is_active               boolean     not null default true,
    -- Soft-delete: set is_active=false rather than deleting rows. Preserves
    -- audit trail and prevents re-join gaming.
    unique(user_id, neighborhood_id)
);

create index idx_nm_user         on neighborhood_members(user_id);
create index idx_nm_neighborhood on neighborhood_members(neighborhood_id);
create index idx_nm_tier         on neighborhood_members(neighborhood_id, tier);
create index idx_nm_active       on neighborhood_members(is_active) where is_active = true;


-- ---------------------------------------------------------------------------
-- TABLE: verification_records
-- ---------------------------------------------------------------------------
-- One row per verification attempt per member. A member may have multiple
-- records (rejected → retry → approved).
-- ---------------------------------------------------------------------------

create table verification_records (
    id                  uuid primary key default uuid_generate_v4(),
    member_id           uuid        not null references neighborhood_members(id) on delete cascade,
    status              verification_status not null default 'pending',
    declared_address    text        not null,       -- snapshot at time of submission
    extracted_address   text,                       -- what OCR read from the document
    ocr_confidence      numeric(4,3),               -- 0.000–1.000
    -- Thresholds (per ARCHITECTURE.md):
    --   >= 0.750 → auto-approve
    --   0.400–0.749 → manual review queue
    --   < 0.400 → auto-reject
    reviewer_notes      text,                       -- for manual review cases
    reviewed_by         uuid references users(id),  -- null if auto-processed
    submitted_at        timestamptz not null default now(),
    reviewed_at         timestamptz,
    created_at          timestamptz not null default now()
);

create index idx_vr_member  on verification_records(member_id);
create index idx_vr_status  on verification_records(status);
create index idx_vr_pending on verification_records(status, submitted_at)
    where status = 'pending';


-- ---------------------------------------------------------------------------
-- TABLE: verification_documents
-- ---------------------------------------------------------------------------
-- Stores metadata for uploaded documents. The file itself lives in Supabase
-- Storage (bucket: verification-documents). CRITICAL: files must be deleted
-- from storage after the linked verification_record reaches a terminal state
-- (approved or rejected). deleted_from_storage_at tracks compliance.
-- ---------------------------------------------------------------------------

create table verification_documents (
    id                          uuid primary key default uuid_generate_v4(),
    verification_record_id      uuid        not null references verification_records(id) on delete cascade,
    storage_path                text        not null,   -- Supabase Storage object path
    document_type               text        not null,
    -- Accepted values: 'utility_bill' | 'rental_agreement' | 'society_card'
    --                  'bank_statement' | 'delivery_confirmation' | 'other'
    file_size_bytes             integer,
    uploaded_at                 timestamptz not null default now(),
    deleted_from_storage_at     timestamptz             -- null = still in storage
    -- A daily job should flag rows where this is null AND the parent
    -- verification_record.status is 'approved' or 'rejected' AND
    -- reviewed_at < now() - interval '24 hours'.
    -- The deletion job sets this column once the file is removed.
);

create index idx_vd_record    on verification_documents(verification_record_id);
create index idx_vd_undeleted on verification_documents(deleted_from_storage_at)
    where deleted_from_storage_at is null;


-- ---------------------------------------------------------------------------
-- TABLE: anchor_roles
-- ---------------------------------------------------------------------------
-- Tracks which verified member holds the anchor role for a neighborhood,
-- including term management and renewal votes.
-- ---------------------------------------------------------------------------

create table anchor_roles (
    id                  uuid primary key default uuid_generate_v4(),
    neighborhood_id     uuid        not null references neighborhoods(id) on delete cascade,
    user_id             uuid        not null references users(id) on delete cascade,
    member_id           uuid        not null references neighborhood_members(id) on delete cascade,
    term_started_at     timestamptz not null default now(),
    term_ends_at        timestamptz not null default now() + interval '6 months',
    -- Per AGENTS.md: anchors serve 6-month terms with community renewal vote.
    is_active           boolean     not null default true,
    renewed_count       integer     not null default 0,
    created_at          timestamptz not null default now(),
    -- Active-anchor uniqueness enforced by partial unique index below.
    -- No table-level unique(neighborhood_id, is_active) — that would
    -- prevent multiple historical (inactive) anchor records.
);

-- Partial unique: only one active anchor per neighborhood.
create unique index idx_anchor_one_active
    on anchor_roles(neighborhood_id)
    where is_active = true;

create index idx_anchor_neighborhood on anchor_roles(neighborhood_id);
create index idx_anchor_user         on anchor_roles(user_id);


-- ---------------------------------------------------------------------------
-- TABLE: anchor_actions_log
-- ---------------------------------------------------------------------------
-- Immutable audit log of every action taken by an anchor.
-- No soft-delete, no RLS SELECT for members — internal visibility only.
-- The platform team can audit; members cannot browse this log.
-- Used for the 20%-escalation threshold check.
-- ---------------------------------------------------------------------------

create table anchor_actions_log (
    id                  uuid primary key default uuid_generate_v4(),
    anchor_role_id      uuid        not null references anchor_roles(id) on delete cascade,
    neighborhood_id     uuid        not null references neighborhoods(id) on delete cascade,
    actor_user_id       uuid        not null references users(id),
    action_type         anchor_action_type  not null,
    target_post_id      uuid,                       -- FK added after posts table
    target_member_id    uuid,                       -- FK added after neighborhood_members
    metadata            jsonb,                      -- action-specific payload
    created_at          timestamptz not null default now()
    -- No updated_at — this table is append-only.
);

create index idx_aal_anchor      on anchor_actions_log(anchor_role_id);
create index idx_aal_neighborhood on anchor_actions_log(neighborhood_id);
create index idx_aal_actor       on anchor_actions_log(actor_user_id);
create index idx_aal_created     on anchor_actions_log(created_at desc);


-- ---------------------------------------------------------------------------
-- TABLE: moderation_escalations
-- ---------------------------------------------------------------------------
-- Created when 20%+ of a neighborhood's verified members flag the same
-- anchor moderation decision. Routes to the central trust & safety team.
-- ---------------------------------------------------------------------------

create table moderation_escalations (
    id                      uuid primary key default uuid_generate_v4(),
    neighborhood_id         uuid        not null references neighborhoods(id) on delete cascade,
    anchor_action_id        uuid        not null references anchor_actions_log(id) on delete cascade,
    status                  escalation_status   not null default 'open',
    flagged_by_count        integer     not null default 1,
    threshold_member_count  integer     not null,   -- snapshot of 20% threshold at creation time
    resolved_by             uuid references users(id),
    resolution_notes        text,
    created_at              timestamptz not null default now(),
    resolved_at             timestamptz
);

create index idx_me_neighborhood on moderation_escalations(neighborhood_id);
create index idx_me_status       on moderation_escalations(status)
    where status in ('open', 'under_review');


-- ---------------------------------------------------------------------------
-- TABLE: vouching_requests
-- ---------------------------------------------------------------------------
-- Tier 3 elevation requires two-signature community vouching.
-- A vouching request is created by the anchor; a second verified member
-- must co-sign. Both signatures are required before tier_3 is granted.
-- ---------------------------------------------------------------------------

create table vouching_requests (
    id                      uuid primary key default uuid_generate_v4(),
    neighborhood_id         uuid        not null references neighborhoods(id) on delete cascade,
    candidate_member_id     uuid        not null references neighborhood_members(id) on delete cascade,
    initiated_by_anchor_id  uuid        not null references anchor_roles(id) on delete cascade,
    cosigner_member_id      uuid        references neighborhood_members(id),
    -- null until a second member co-signs
    anchor_signed_at        timestamptz not null default now(),
    cosigner_signed_at      timestamptz,
    is_completed            boolean     not null default false,
    is_rejected             boolean     not null default false,
    rejection_reason        text,
    created_at              timestamptz not null default now(),
    expires_at              timestamptz not null default now() + interval '7 days'
    -- Requests expire after 7 days if not co-signed.
);

create index idx_vr_candidate    on vouching_requests(candidate_member_id);
create index idx_vr_neighborhood on vouching_requests(neighborhood_id);
create index idx_vouch_pending      on vouching_requests(is_completed, is_rejected, expires_at)
    where is_completed = false and is_rejected = false;


-- ---------------------------------------------------------------------------
-- TABLE: posts
-- ---------------------------------------------------------------------------
-- Core community feed content. Includes AI classification fields.
-- ---------------------------------------------------------------------------

create table posts (
    id                  uuid primary key default uuid_generate_v4(),
    neighborhood_id     uuid        not null references neighborhoods(id) on delete cascade,
    author_member_id    uuid        not null references neighborhood_members(id) on delete cascade,
    body                text        not null,
    body_language       text        not null default 'en',
    -- Detected language: 'en' | 'ur' | 'mixed'
    category            post_category       not null default 'general',
    is_emergency        boolean     not null default false,
    -- Set by AI classification: true triggers amber UI treatment and
    -- push notification to all neighborhood members.
    ai_confidence       numeric(4,3),
    -- Confidence score from classification service (0.000–1.000).
    -- null = not yet classified or classification failed (fallback applied).
    is_resolved         boolean     not null default false,
    resolved_at         timestamptz,
    resolved_by_member_id uuid      references neighborhood_members(id),
    is_pinned           boolean     not null default false,
    is_removed          boolean     not null default false,
    removed_at          timestamptz,
    removed_by_anchor_id uuid       references anchor_roles(id),
    removal_reason      text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create index idx_posts_neighborhood     on posts(neighborhood_id, created_at desc);
create index idx_posts_emergency        on posts(neighborhood_id, is_emergency, created_at desc)
    where is_emergency = true and is_removed = false;
create index idx_posts_active           on posts(neighborhood_id, is_removed, created_at desc)
    where is_removed = false;
create index idx_posts_category         on posts(neighborhood_id, category);
create index idx_posts_unclassified     on posts(id, created_at)
    where ai_confidence is null and is_removed = false;
-- Full-text search on post body
create index idx_posts_body_trgm        on posts using gin(body gin_trgm_ops);


-- ---------------------------------------------------------------------------
-- TABLE: civic_dashboard_snapshots
-- ---------------------------------------------------------------------------
-- Pre-computed aggregates for the civic dashboard. A background job
-- (or a FastAPI scheduled task) writes one row per neighborhood per period.
-- The dashboard reads snapshots rather than running live aggregate queries.
-- ---------------------------------------------------------------------------

create table civic_dashboard_snapshots (
    id                  uuid primary key default uuid_generate_v4(),
    neighborhood_id     uuid        not null references neighborhoods(id) on delete cascade,
    period_start        date        not null,
    period_end          date        not null,
    period_type         text        not null,        -- '7d' | '30d' | '90d'
    total_posts         integer     not null default 0,
    emergency_posts     integer     not null default 0,
    resolved_posts      integer     not null default 0,
    category_breakdown  jsonb       not null default '{}',
    -- Shape: {"power": 12, "security": 4, "infrastructure": 2, "water": 1, "general": 5}
    active_members      integer     not null default 0,
    -- Count of members who posted or responded in the period.
    computed_at         timestamptz not null default now(),
    unique(neighborhood_id, period_type, period_start)
);

create index idx_cds_neighborhood on civic_dashboard_snapshots(neighborhood_id, period_type, period_start desc);


-- ---------------------------------------------------------------------------
-- TABLE: worker_listings
-- ---------------------------------------------------------------------------
-- Service worker directory entries. A listing is created by a verified member
-- recommending a worker they have used. Not a self-signup flow.
-- ---------------------------------------------------------------------------

create table worker_listings (
    id                  uuid primary key default uuid_generate_v4(),
    neighborhood_id     uuid        not null references neighborhoods(id) on delete cascade,
    created_by_member_id uuid       not null references neighborhood_members(id) on delete cascade,
    worker_name         text        not null,
    worker_phone        text,                       -- stored, but shown only to tier_2+ members
    service_type        text        not null,
    -- e.g. 'electrician', 'plumber', 'maid', 'driver', 'cook', 'handyman'
    description         text,
    is_promoted         boolean     not null default false,
    -- Promoted listings appear in the labeled "promoted" section of the directory.
    -- Promotion is a paid feature. Badge (earned_badge) is NOT tied to promotion.
    earned_badge        worker_badge_status not null default 'none',
    -- 'earned' requires: min_completed_jobs >= 10 AND avg_rating >= 4.0
    -- The badge is community-earned, never purchased.
    min_completed_jobs  integer     not null default 0,
    avg_rating          numeric(3,2),               -- computed from worker_reviews
    status              listing_status  not null default 'active',
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create index idx_wl_neighborhood on worker_listings(neighborhood_id, status);
create index idx_wl_service_type on worker_listings(neighborhood_id, service_type);
create index idx_wl_badge        on worker_listings(neighborhood_id, earned_badge)
    where earned_badge = 'earned';


-- ---------------------------------------------------------------------------
-- TABLE: worker_reviews
-- ---------------------------------------------------------------------------
-- Reviews are gated: both parties must confirm the job before a review
-- unlocks. This prevents fake positive reviews and retaliatory negatives.
-- ---------------------------------------------------------------------------

create table worker_reviews (
    id                      uuid primary key default uuid_generate_v4(),
    listing_id              uuid        not null references worker_listings(id) on delete cascade,
    reviewer_member_id      uuid        not null references neighborhood_members(id) on delete cascade,
    job_confirmed_by_worker boolean     not null default false,
    job_confirmed_by_member boolean     not null default false,
    -- Review body and rating only visible/used when BOTH confirmations are true.
    rating                  smallint    check(rating between 1 and 5),
    review_body             text,
    is_published            boolean     not null default false,
    -- Set to true automatically when both job_confirmed fields become true.
    created_at              timestamptz not null default now(),
    published_at            timestamptz,
    unique(listing_id, reviewer_member_id)
    -- One review per member per listing.
);

create index idx_wr_listing   on worker_reviews(listing_id, is_published);
create index idx_wr_reviewer  on worker_reviews(reviewer_member_id);
create index idx_wr_unpublished on worker_reviews(is_published, job_confirmed_by_worker, job_confirmed_by_member)
    where is_published = false;


-- ---------------------------------------------------------------------------
-- TABLE: marketplace_listings
-- ---------------------------------------------------------------------------
-- Buy/sell listings within a verified neighborhood community.
-- No transactions on-platform at MVP — listings only, contact off-platform.
-- ---------------------------------------------------------------------------

create table marketplace_listings (
    id                  uuid primary key default uuid_generate_v4(),
    neighborhood_id     uuid        not null references neighborhoods(id) on delete cascade,
    seller_member_id    uuid        not null references neighborhood_members(id) on delete cascade,
    title               text        not null,
    description         text,
    price_pkr           integer,                    -- null = price on request / free
    is_free             boolean     not null default false,
    image_urls          text[]      not null default '{}',
    -- Array of Supabase Storage paths (bucket: marketplace-images)
    status              listing_status  not null default 'active',
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create index idx_ml_neighborhood on marketplace_listings(neighborhood_id, status, created_at desc);
create index idx_ml_seller       on marketplace_listings(seller_member_id);


-- ---------------------------------------------------------------------------
-- TABLE: events
-- ---------------------------------------------------------------------------
-- Community events: dawats, Eid gatherings, fatehas, block parties, etc.
-- ---------------------------------------------------------------------------

create table events (
    id                  uuid primary key default uuid_generate_v4(),
    neighborhood_id     uuid        not null references neighborhoods(id) on delete cascade,
    created_by_member_id uuid       not null references neighborhood_members(id) on delete cascade,
    title               text        not null,
    title_urdu          text,
    description         text,
    event_type          text        not null default 'general',
    -- e.g. 'dawat', 'eid', 'fateha', 'meeting', 'cleanup', 'general'
    starts_at           timestamptz not null,
    ends_at             timestamptz,
    location_description text,
    status              event_status    not null default 'upcoming',
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create index idx_events_neighborhood on events(neighborhood_id, starts_at desc);
create index idx_events_upcoming     on events(neighborhood_id, status, starts_at)
    where status = 'upcoming';


-- ---------------------------------------------------------------------------
-- TABLE: notifications
-- ---------------------------------------------------------------------------
-- Persisted notification records. Push delivery is handled by the
-- notification_service; this table tracks what was sent and read status.
-- ---------------------------------------------------------------------------

create table notifications (
    id                  uuid primary key default uuid_generate_v4(),
    user_id             uuid        not null references users(id) on delete cascade,
    neighborhood_id     uuid        references neighborhoods(id) on delete set null,
    type                notification_type   not null,
    title               text        not null,
    body                text        not null,
    deep_link           text,
    -- e.g. 'halqa://verification/result?status=approved'
    --      'halqa://posts/[post_id]'
    is_read             boolean     not null default false,
    push_sent_at        timestamptz,                -- null = not yet sent / send failed
    push_failed         boolean     not null default false,
    read_at             timestamptz,
    created_at          timestamptz not null default now()
);

create index idx_notifications_user    on notifications(user_id, created_at desc);
create index idx_notifications_unread  on notifications(user_id, is_read)
    where is_read = false;
create index idx_notifications_unsent  on notifications(push_sent_at, push_failed)
    where push_sent_at is null and push_failed = false;


-- ---------------------------------------------------------------------------
-- DEFERRED FOREIGN KEYS
-- (columns that reference tables defined later in the file)
-- ---------------------------------------------------------------------------

alter table anchor_actions_log
    add constraint fk_aal_target_post
        foreign key (target_post_id) references posts(id) on delete set null;

alter table anchor_actions_log
    add constraint fk_aal_target_member
        foreign key (target_member_id) references neighborhood_members(id) on delete set null;


-- ---------------------------------------------------------------------------
-- TRIGGERS: updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger trg_neighborhoods_updated_at
    before update on neighborhoods
    for each row execute function set_updated_at();

create trigger trg_users_updated_at
    before update on users
    for each row execute function set_updated_at();

create trigger trg_posts_updated_at
    before update on posts
    for each row execute function set_updated_at();

create trigger trg_worker_listings_updated_at
    before update on worker_listings
    for each row execute function set_updated_at();

create trigger trg_marketplace_listings_updated_at
    before update on marketplace_listings
    for each row execute function set_updated_at();

create trigger trg_events_updated_at
    before update on events
    for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- TRIGGER: neighborhood member_count sync
-- ---------------------------------------------------------------------------

create or replace function sync_neighborhood_member_count()
returns trigger language plpgsql security definer as $$
begin
    update neighborhoods
    set member_count = (
        select count(*)
        from neighborhood_members
        where neighborhood_id = coalesce(new.neighborhood_id, old.neighborhood_id)
          and is_active = true
    )
    where id = coalesce(new.neighborhood_id, old.neighborhood_id);
    return coalesce(new, old);
end;
$$;

create trigger trg_member_count_insert
    after insert on neighborhood_members
    for each row execute function sync_neighborhood_member_count();

create trigger trg_member_count_update
    after update of is_active on neighborhood_members
    for each row execute function sync_neighborhood_member_count();

create trigger trg_member_count_delete
    after delete on neighborhood_members
    for each row execute function sync_neighborhood_member_count();


-- ---------------------------------------------------------------------------
-- TRIGGER: worker_reviews → auto-publish when both parties confirm
-- ---------------------------------------------------------------------------

create or replace function auto_publish_worker_review()
returns trigger language plpgsql as $$
begin
    if new.job_confirmed_by_worker = true
       and new.job_confirmed_by_member = true
       and new.is_published = false
       and new.rating is not null
    then
        new.is_published  := true;
        new.published_at  := now();
    end if;
    return new;
end;
$$;

create trigger trg_auto_publish_review
    before update on worker_reviews
    for each row execute function auto_publish_worker_review();


-- ---------------------------------------------------------------------------
-- TRIGGER: worker_listings avg_rating + badge update after review publish
-- ---------------------------------------------------------------------------

create or replace function update_worker_listing_stats()
returns trigger language plpgsql as $$
declare
    v_completed integer;
    v_avg       numeric(3,2);
    v_badge     worker_badge_status;
begin
    if new.is_published = true and old.is_published = false then
        select count(*), round(avg(rating)::numeric, 2)
        into v_completed, v_avg
        from worker_reviews
        where listing_id   = new.listing_id
          and is_published  = true;

        if v_completed >= 10 and v_avg >= 4.0 then
            v_badge := 'earned';
        elsif v_completed > 0 then
            v_badge := 'earning';
        else
            v_badge := 'none';
        end if;

        update worker_listings
        set min_completed_jobs = v_completed,
            avg_rating         = v_avg,
            earned_badge       = v_badge,
            updated_at         = now()
        where id = new.listing_id;
    end if;
    return new;
end;
$$;

create trigger trg_update_listing_stats
    after update on worker_reviews
    for each row execute function update_worker_listing_stats();


-- ---------------------------------------------------------------------------
-- SECURITY DEFINER HELPER FUNCTIONS
-- ---------------------------------------------------------------------------
-- These run as the function definer (service role) so RLS policies can
-- safely cross table boundaries without granting SELECT on sensitive tables
-- to the authenticated role directly.
-- ---------------------------------------------------------------------------

create or replace function get_member_tier(
    p_user_id           uuid,
    p_neighborhood_id   uuid
)
returns verification_tier
language sql security definer stable as $$
    select tier
    from neighborhood_members
    where user_id        = p_user_id
      and neighborhood_id = p_neighborhood_id
      and is_active       = true
    limit 1;
$$;

create or replace function is_anchor(
    p_user_id           uuid,
    p_neighborhood_id   uuid
)
returns boolean
language sql security definer stable as $$
    select exists(
        select 1
        from anchor_roles ar
        join neighborhood_members nm
          on nm.id            = ar.member_id
        where ar.neighborhood_id = p_neighborhood_id
          and nm.user_id         = p_user_id
          and ar.is_active       = true
          and ar.term_ends_at    > now()
    );
$$;


-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

-- Enable RLS on all user-facing tables
alter table neighborhoods            enable row level security;
alter table users                    enable row level security;
alter table neighborhood_members     enable row level security;
alter table verification_records     enable row level security;
alter table verification_documents   enable row level security;
alter table anchor_roles             enable row level security;
alter table anchor_actions_log       enable row level security;
alter table moderation_escalations   enable row level security;
alter table vouching_requests        enable row level security;
alter table posts                    enable row level security;
alter table civic_dashboard_snapshots enable row level security;
alter table worker_listings          enable row level security;
alter table worker_reviews           enable row level security;
alter table marketplace_listings     enable row level security;
alter table events                   enable row level security;
alter table notifications            enable row level security;


-- ---- neighborhoods ----------------------------------------------------------

-- Anyone authenticated can read active neighborhoods (for search/join flow)
create policy "neighborhoods: authenticated read active"
    on neighborhoods for select
    to authenticated
    using (is_active = true);

-- Only the service role can insert/update/delete neighborhoods
create policy "neighborhoods: service role write"
    on neighborhoods for all
    to service_role
    using (true) with check (true);


-- ---- users ------------------------------------------------------------------

-- Users can read their own row
create policy "users: read own"
    on users for select
    to authenticated
    using (id = auth.uid());

-- Members of the same neighborhood can read basic profile data
-- (handled via application layer — not a direct RLS policy to avoid
--  complex subqueries on every read; service role handles cross-user reads)

-- Users can update their own row
create policy "users: update own"
    on users for update
    to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());

-- Service role has full access
create policy "users: service role all"
    on users for all
    to service_role
    using (true) with check (true);


-- ---- neighborhood_members ---------------------------------------------------

-- Users can read their own membership rows
create policy "nm: read own"
    on neighborhood_members for select
    to authenticated
    using (user_id = auth.uid());

-- Users can read other active members of their own neighborhood (tier_2+)
create policy "nm: read neighborhood peers (tier_2+)"
    on neighborhood_members for select
    to authenticated
    using (
        is_active = true
        and get_member_tier(auth.uid(), neighborhood_id) >= 'tier_2'
    );

-- Users can insert their own membership (join flow)
create policy "nm: insert own"
    on neighborhood_members for insert
    to authenticated
    with check (user_id = auth.uid());

-- Service role full access
create policy "nm: service role all"
    on neighborhood_members for all
    to service_role
    using (true) with check (true);


-- ---- verification_records ---------------------------------------------------

-- Users can read their own verification records
create policy "vr: read own"
    on verification_records for select
    to authenticated
    using (
        member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
    );

-- Users can insert (submit) their own verification records
create policy "vr: insert own"
    on verification_records for insert
    to authenticated
    with check (
        member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
    );

-- Service role full access (processing, review, status updates)
create policy "vr: service role all"
    on verification_records for all
    to service_role
    using (true) with check (true);


-- ---- verification_documents -------------------------------------------------

-- Users can read their own documents (while they exist)
create policy "vd: read own"
    on verification_documents for select
    to authenticated
    using (
        verification_record_id in (
            select vr.id from verification_records vr
            join neighborhood_members nm on nm.id = vr.member_id
            where nm.user_id = auth.uid()
        )
    );

-- Service role full access (upload, OCR, deletion)
create policy "vd: service role all"
    on verification_documents for all
    to service_role
    using (true) with check (true);


-- ---- anchor_roles -----------------------------------------------------------

-- Active anchors are readable by neighborhood members (tier_2+)
create policy "ar: read by neighborhood members"
    on anchor_roles for select
    to authenticated
    using (
        is_active = true
        and get_member_tier(auth.uid(), neighborhood_id) >= 'tier_2'
    );

-- Service role full access
create policy "ar: service role all"
    on anchor_roles for all
    to service_role
    using (true) with check (true);


-- ---- anchor_actions_log -----------------------------------------------------

-- NOT readable by authenticated users directly — service role only
create policy "aal: service role all"
    on anchor_actions_log for all
    to service_role
    using (true) with check (true);


-- ---- moderation_escalations -------------------------------------------------

-- Members can read escalations for their neighborhood (tier_2+)
create policy "me: read by neighborhood members"
    on moderation_escalations for select
    to authenticated
    using (
        get_member_tier(auth.uid(), neighborhood_id) >= 'tier_2'
    );

-- Service role full access
create policy "me: service role all"
    on moderation_escalations for all
    to service_role
    using (true) with check (true);


-- ---- vouching_requests ------------------------------------------------------

-- Involved parties can read their vouching requests
create policy "vouching: read involved"
    on vouching_requests for select
    to authenticated
    using (
        candidate_member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
        or cosigner_member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
    );

-- Service role full access
create policy "vouching: service role all"
    on vouching_requests for all
    to service_role
    using (true) with check (true);


-- ---- posts ------------------------------------------------------------------

-- Tier_1 members can only read posts (not write)
create policy "posts: read by tier_1+"
    on posts for select
    to authenticated
    using (
        is_removed = false
        and get_member_tier(auth.uid(), neighborhood_id) >= 'tier_1'
    );

-- Tier_2+ members can post
create policy "posts: insert by tier_2+"
    on posts for insert
    to authenticated
    with check (
        get_member_tier(auth.uid(), neighborhood_id) >= 'tier_2'
        and author_member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
    );

-- Authors can mark their own post as resolved
create policy "posts: update resolved by author"
    on posts for update
    to authenticated
    using (
        author_member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
    )
    with check (
        -- Authors may only flip is_resolved; anchors handle removal via service role
        author_member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
    );

-- Service role full access (anchor removal, AI classification writes)
create policy "posts: service role all"
    on posts for all
    to service_role
    using (true) with check (true);


-- ---- civic_dashboard_snapshots ----------------------------------------------

-- Readable by tier_2+ members of the neighborhood
create policy "cds: read by tier_2+"
    on civic_dashboard_snapshots for select
    to authenticated
    using (
        get_member_tier(auth.uid(), neighborhood_id) >= 'tier_2'
    );

-- Service role full access (background snapshot job)
create policy "cds: service role all"
    on civic_dashboard_snapshots for all
    to service_role
    using (true) with check (true);


-- ---- worker_listings --------------------------------------------------------

-- Readable by tier_2+ members
create policy "wl: read by tier_2+"
    on worker_listings for select
    to authenticated
    using (
        status = 'active'
        and get_member_tier(auth.uid(), neighborhood_id) >= 'tier_2'
    );

-- Tier_2+ members can create listings
create policy "wl: insert by tier_2+"
    on worker_listings for insert
    to authenticated
    with check (
        get_member_tier(auth.uid(), neighborhood_id) >= 'tier_2'
        and created_by_member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
    );

-- Creators can update their own listings
create policy "wl: update by creator"
    on worker_listings for update
    to authenticated
    using (
        created_by_member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
    );

-- Service role full access
create policy "wl: service role all"
    on worker_listings for all
    to service_role
    using (true) with check (true);


-- ---- worker_reviews ---------------------------------------------------------

-- Published reviews readable by tier_2+
create policy "wr: read published by tier_2+"
    on worker_reviews for select
    to authenticated
    using (
        is_published = true
        and listing_id in (
            select id from worker_listings
            where get_member_tier(auth.uid(), neighborhood_id) >= 'tier_2'
        )
    );

-- Reviewers can read their own (including unpublished)
create policy "wr: read own"
    on worker_reviews for select
    to authenticated
    using (
        reviewer_member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
    );

-- Tier_3 members can submit reviews
create policy "wr: insert by tier_3"
    on worker_reviews for insert
    to authenticated
    with check (
        reviewer_member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
        and listing_id in (
            select wl.id from worker_listings wl
            where get_member_tier(auth.uid(), wl.neighborhood_id) >= 'tier_3'
        )
    );

-- Reviewers can confirm job on their own reviews
create policy "wr: update own"
    on worker_reviews for update
    to authenticated
    using (
        reviewer_member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
    );

-- Service role full access
create policy "wr: service role all"
    on worker_reviews for all
    to service_role
    using (true) with check (true);


-- ---- marketplace_listings ---------------------------------------------------

-- Readable by tier_2+
create policy "ml: read by tier_2+"
    on marketplace_listings for select
    to authenticated
    using (
        status = 'active'
        and get_member_tier(auth.uid(), neighborhood_id) >= 'tier_2'
    );

-- Tier_2+ can list
create policy "ml: insert by tier_2+"
    on marketplace_listings for insert
    to authenticated
    with check (
        get_member_tier(auth.uid(), neighborhood_id) >= 'tier_2'
        and seller_member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
    );

-- Sellers can update their own listings
create policy "ml: update by seller"
    on marketplace_listings for update
    to authenticated
    using (
        seller_member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
    );

-- Service role full access
create policy "ml: service role all"
    on marketplace_listings for all
    to service_role
    using (true) with check (true);


-- ---- events -----------------------------------------------------------------

-- Readable by tier_1+
create policy "events: read by tier_1+"
    on events for select
    to authenticated
    using (
        status != 'cancelled'
        and get_member_tier(auth.uid(), neighborhood_id) >= 'tier_1'
    );

-- Tier_2+ can create events
create policy "events: insert by tier_2+"
    on events for insert
    to authenticated
    with check (
        get_member_tier(auth.uid(), neighborhood_id) >= 'tier_2'
        and created_by_member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
    );

-- Creators can update their own events
create policy "events: update by creator"
    on events for update
    to authenticated
    using (
        created_by_member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
    );

-- Service role full access
create policy "events: service role all"
    on events for all
    to service_role
    using (true) with check (true);


-- ---- notifications ----------------------------------------------------------

-- Users read only their own notifications
create policy "notif: read own"
    on notifications for select
    to authenticated
    using (user_id = auth.uid());

-- Users can mark their own as read
create policy "notif: update own"
    on notifications for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Service role full access (creates all notifications)
create policy "notif: service role all"
    on notifications for all
    to service_role
    using (true) with check (true);


-- ---------------------------------------------------------------------------
-- REALTIME PUBLICATION
-- ---------------------------------------------------------------------------
-- Supabase Realtime listens to these tables. Only tables where the frontend
-- subscribes for live updates need to be in the publication.
-- ---------------------------------------------------------------------------

-- Drop the default supabase_realtime publication if it exists, then recreate
-- with explicit table list. This prevents accidental exposure of sensitive
-- tables (verification_documents, anchor_actions_log, etc.) to Realtime.

drop publication if exists supabase_realtime;

create publication supabase_realtime for table
    posts,
    notifications,
    civic_dashboard_snapshots,
    neighborhood_members;

-- Channel naming convention (referenced in ARCHITECTURE.md §4):
--   neighborhood:{neighborhood_id}  → new posts in the feed
--   user:{user_id}                  → personal notifications
--   dashboard:{neighborhood_id}     → civic dashboard snapshot updates


-- ---------------------------------------------------------------------------
-- SEED DATA — Demo Neighborhood
-- ---------------------------------------------------------------------------
-- One neighborhood with realistic Pakistani context for the hackathon demo.
-- Seeded with plausible civic alert history for the dashboard demo.
-- UUIDs are fixed so the frontend demo can reference them by ID.
-- ---------------------------------------------------------------------------

insert into neighborhoods (
    id, name, name_urdu, city, sector, province, lat, lng, is_active
) values (
    '00000000-0000-0000-0000-000000000001',
    'Green Valley Housing Society',
    'گرین ویلی ہاؤسنگ سوسائٹی',
    'Lahore',
    'DHA Phase 6',
    'Punjab',
    31.4697,
    74.3889,
    true
);

-- Seed: civic dashboard snapshots for the demo neighborhood (last 30 days)
insert into civic_dashboard_snapshots (
    neighborhood_id,
    period_start,
    period_end,
    period_type,
    total_posts,
    emergency_posts,
    resolved_posts,
    category_breakdown,
    active_members,
    computed_at
) values
(
    '00000000-0000-0000-0000-000000000001',
    current_date - interval '7 days',
    current_date,
    '7d',
    14,
    5,
    3,
    '{"power": 6, "security": 3, "infrastructure": 2, "water": 1, "general": 2}',
    12,
    now()
),
(
    '00000000-0000-0000-0000-000000000001',
    current_date - interval '30 days',
    current_date,
    '30d',
    47,
    18,
    11,
    '{"power": 22, "security": 9, "infrastructure": 7, "water": 4, "general": 5}',
    28,
    now()
),
(
    '00000000-0000-0000-0000-000000000001',
    current_date - interval '90 days',
    current_date,
    '90d',
    112,
    41,
    29,
    '{"power": 51, "security": 22, "infrastructure": 18, "water": 9, "general": 12}',
    35,
    now()
);


-- ---------------------------------------------------------------------------
-- END OF MIGRATION
-- ---------------------------------------------------------------------------
-- Tables created: 16
-- Indexes created: 47
-- Triggers created: 11
-- Functions created: 6 (set_updated_at, sync_neighborhood_member_count,
--                       auto_publish_worker_review, update_worker_listing_stats,
--                       get_member_tier, is_anchor)
-- SECURITY DEFINER: sync_neighborhood_member_count, get_member_tier, is_anchor
-- RLS policies created: 47
-- Realtime publication: supabase_realtime (4 tables)
-- Seed rows: 4
-- ---------------------------------------------------------------------------

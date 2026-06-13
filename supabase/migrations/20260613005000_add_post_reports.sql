-- =============================================================================
-- Migration: 20260613_005_add_post_reports
-- Description: Creates post_reports table for member-driven content reporting
--              and adds dismiss_report to anchor_action_type ENUM
-- Author: Halqa team
-- Date: 2026-06-13
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUM: Add dismiss_report to anchor_action_type
-- ---------------------------------------------------------------------------
-- This value is used when the anchor dismisses a member report against a post
-- (i.e., reviews it and decides no action is needed).
-- ---------------------------------------------------------------------------

alter type anchor_action_type add value 'dismiss_report';

-- ---------------------------------------------------------------------------
-- TABLE: post_reports
-- ---------------------------------------------------------------------------
-- Tracks member-initiated reports against posts in the neighborhood feed.
-- A Tier 2+ member can report a post they find concerning. The community
-- anchor reviews the report and either removes the post or dismisses the
-- report.
--
-- Unlike moderation_escalations (which tracks disputes against anchor
-- actions for the 20% threshold), post_reports is the "inbox" of content
-- the anchor needs to review. Escalations are a downstream concern that
-- only applies AFTER the anchor takes an action on a post.
-- ---------------------------------------------------------------------------

create table if not exists post_reports (
    id                      uuid primary key default uuid_generate_v4(),
    post_id                 uuid        not null references posts(id) on delete cascade,
    reporter_member_id      uuid        not null references neighborhood_members(id) on delete cascade,
    reason                  text        not null,
    -- Max 300 chars (enforced at application layer; this CHECK is an extra guard)
    constraint pr_reason_length check (char_length(reason) >= 1 and char_length(reason) <= 300),
    status                  text        not null default 'open',
    -- 'open' = awaiting anchor review
    -- 'resolved' = anchor removed the post
    -- 'dismissed' = anchor reviewed and decided no action needed
    constraint pr_status_check check (status in ('open', 'resolved', 'dismissed')),
    resolved_at             timestamptz,
    resolved_by_action      text,
    -- 'removed' | 'dismissed' — mirror of the status above, stored explicitly
    constraint pr_resolution_check check (
        (resolved_by_action is null) or
        (resolved_by_action in ('removed', 'dismissed'))
    ),
    resolved_by_anchor_role_id uuid references anchor_roles(id) on delete set null,
    created_at              timestamptz not null default now()
);

-- Enforce: one open report per member per post (prevents spam-flooding)
create unique index idx_pr_unique_open
    on post_reports(post_id, reporter_member_id)
    where status = 'open';

-- Indexes for anchor queries
create index idx_pr_neighborhood_post on post_reports(post_id);
create index idx_pr_reporter          on post_reports(reporter_member_id);
create index idx_pr_status            on post_reports(status)
    where status = 'open';


-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

alter table post_reports enable row level security;

-- Tier 2+ members can create a report
-- Verifies: reporter belongs to authenticated user AND user has tier_2+ in the
-- neighborhood where the reported post was created
create policy "pr: insert by tier_2+"
    on post_reports for insert
    to authenticated
    with check (
        reporter_member_id in (
            select nm.id from neighborhood_members nm
            where nm.user_id = auth.uid()
              and nm.is_active = true
              and nm.tier >= 'tier_2'
        )
        and exists (
            select 1 from posts p
            join neighborhood_members nm on nm.id = post_reports.reporter_member_id
            where p.id = post_reports.post_id
              and nm.neighborhood_id = p.neighborhood_id
        )
    );

-- The reporting member can read their own reports
create policy "pr: read own"
    on post_reports for select
    to authenticated
    using (
        reporter_member_id in (
            select id from neighborhood_members where user_id = auth.uid()
        )
    );

-- The neighborhood anchor can read all open reports for their posts
create policy "pr: read by anchor"
    on post_reports for select
    to authenticated
    using (
        exists (
            select 1 from anchor_roles ar
            join posts p on p.id = post_reports.post_id
            join neighborhood_members nm on nm.user_id = auth.uid()
            where ar.neighborhood_id = p.neighborhood_id
              and ar.is_active = true
              and ar.user_id = auth.uid()
        )
    );

-- The anchor can update reports (resolve/dismiss them)
create policy "pr: update by anchor"
    on post_reports for update
    to authenticated
    using (
        exists (
            select 1 from anchor_roles ar
            join posts p on p.id = post_reports.post_id
            where ar.neighborhood_id = p.neighborhood_id
              and ar.is_active = true
              and ar.user_id = auth.uid()
        )
    );

-- Service role full access
create policy "pr: service role all"
    on post_reports for all
    to service_role
    using (true) with check (true);


-- ---------------------------------------------------------------------------
-- END OF MIGRATION
-- ---------------------------------------------------------------------------

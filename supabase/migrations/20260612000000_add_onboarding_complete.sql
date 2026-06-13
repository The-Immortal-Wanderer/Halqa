-- =============================================================================
-- Halqa — Migration 002: Add onboarding_complete column
-- =============================================================================
-- Adds the onboarding_complete flag to the users table, documented in
-- Database-Schema.md §2.1 but missing from the initial migration.
--
-- Backfill: existing users who already have a neighborhood_members row
-- are considered to have completed onboarding.
-- =============================================================================

alter table users
    add column if not exists onboarding_complete boolean not null default false;

comment on column users.onboarding_complete is
    'True once the user has joined a neighborhood (any tier).';

-- Backfill for any existing members
update users
set onboarding_complete = true
where id in (
    select distinct user_id
    from neighborhood_members
    where is_active = true
);

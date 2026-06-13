-- Migration: Add tier_target column to verification_records
-- This column was documented in Database-Schema.md but missing from the
-- initial migration SQL and the deployed schema.

alter table verification_records
    add column if not exists tier_target int not null default 2;

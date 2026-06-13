-- =============================================================================
-- Halqa — Add ai_civic_signal column to posts table
-- File: 20260613_004_add_posts_civic_signal.sql
-- =============================================================================

-- Add column for structured civic summary from AI classification
alter table posts add column if not exists ai_civic_signal text;

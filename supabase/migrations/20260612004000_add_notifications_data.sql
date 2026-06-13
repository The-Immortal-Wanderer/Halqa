-- Add the missing `data` column to the `notifications` table.
-- Per Database-Schema.md, notifications carry a JSONB `data` payload for
-- structured metadata (deep-link params, rejection reasons, etc.).
alter table notifications
    add column data jsonb not null default '{}'::jsonb;

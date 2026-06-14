-- =============================================================================
-- Halqa Demo Seed Script
-- =============================================================================
-- This script seeds the demo anchor for the Green Valley Housing Society.
--
-- Prerequisites:
--   1. A user must be registered via POST /api/v1/auth/register
--   2. That user must join the neighborhood via POST /api/v1/members/join
--   3. Replace the placeholder UUIDs below with the user's actual IDs
--
-- Quick setup:
--   # Register
--   curl -X POST http://localhost:8000/api/v1/auth/register \
--     -H "Content-Type: application/json" \
--     -d '{"email": "anchor@halqa.demo", "password": "REPLACE_WITH_REAL_PASSWORD", "display_name": "Anchor Admin"}'
--
--   # Login (save user_id + access_token)
--   curl -X POST http://localhost:8000/api/v1/auth/login \
--     -H "Content-Type: application/json" \
--     -d '{"email": "anchor@halqa.demo", "password": "REPLACE_WITH_REAL_PASSWORD"}'
--
--   # Join Green Valley
--   curl -X POST http://localhost:8000/api/v1/members/join \
--     -H "Authorization: Bearer <access_token>" \
--     -H "Content-Type: application/json" \
--     -d '{"neighborhood_id": "00000000-0000-0000-0000-000000000001", "declared_address": "House 42, Street 5, DHA Phase 6, Lahore"}'
--
--   # UPDATE THE PLACEHOLDERS BELOW with the real user_id and member_id,
--   # then run this SQL.
-- =============================================================================

-- Upgrade the user to tier_2 (anchors must be verified)
UPDATE neighborhood_members
SET tier = 'tier_2', tier_upgraded_at = now()
WHERE id = '<anchor_member_id>';

-- Insert the anchor role (idempotent: does nothing if already assigned)
INSERT INTO anchor_roles (neighborhood_id, user_id, member_id, is_active, term_started_at, term_ends_at)
SELECT
    ng.id, u.id, nm.id, true, now(), now() + interval '6 months'
FROM neighborhoods ng
CROSS JOIN users u
CROSS JOIN neighborhood_members nm
WHERE ng.id = '00000000-0000-0000-0000-000000000001'
  AND u.id = '<anchor_user_id>'
  AND nm.id = '<anchor_member_id>'
ON CONFLICT (neighborhood_id) WHERE is_active = true DO NOTHING;

-- Verify
SELECT ar.id, ng.name AS neighborhood, u.display_name, ar.term_started_at, ar.term_ends_at
FROM anchor_roles ar
JOIN neighborhoods ng ON ng.id = ar.neighborhood_id
JOIN users u ON u.id = ar.user_id
WHERE ar.is_active = true;

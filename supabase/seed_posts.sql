-- =============================================================================
-- Halqa — Seed Posts for Demo Neighborhood (Green Valley Housing Society)
-- File: seed_posts.sql
-- Run AFTER the posts table migration and after backend endpoint verification.
-- =============================================================================

-- Author: existing Verify Flow user
-- Their membership in Green Valley Housing Society:
--   member_id: e708777e-799b-4360-9a5c-90233fa90cc8
--   user_id:   06e174f1-d2ac-47ef-bb30-87e285af3d57
--   neighborhood_id: 00000000-0000-0000-0000-000000000001

do $$
declare
    v_member_id uuid := 'e708777e-799b-4360-9a5c-90233fa90cc8';
    v_neighborhood_id uuid := '00000000-0000-0000-0000-000000000001';
begin

-- Post 1: Emergency — Power outage (3 hours ago)
insert into posts (
    neighborhood_id, author_member_id, body, body_language,
    category, is_emergency, ai_confidence, ai_civic_signal,
    is_resolved, is_removed, created_at
) values (
    v_neighborhood_id, v_member_id,
    'Transformer blast near G-11/4 — no power since 6 PM. Anyone have an update from LESCO?',
    'en', 'power', true, 0.95,
    'Power outage in G-11/4 sector due to transformer blast, affecting residents since 6 PM',
    false, false, now() - interval '3 hours'
);

-- Post 2: Security — suspicious activity (1 day ago)
insert into posts (
    neighborhood_id, author_member_id, body, body_language,
    category, is_emergency, ai_confidence, ai_civic_signal,
    is_resolved, is_removed, created_at
) values (
    v_neighborhood_id, v_member_id,
    'Suspicious motorbike circling Sector 4 since Fajr — two riders, no plates. Stay alert.',
    'en', 'security', true, 0.88,
    'Suspicious activity reported: two unidentified riders circling Sector 4',
    false, false, now() - interval '1 day'
);

-- Post 3: Power — resolved (2 days ago, resolved shortly after)
insert into posts (
    neighborhood_id, author_member_id, body, body_language,
    category, is_emergency, ai_confidence, ai_civic_signal,
    is_resolved, resolved_at, resolved_by_member_id, is_removed, created_at
) values (
    v_neighborhood_id, v_member_id,
    'Power restored in Sector 2 after 4-hour outage. LESCO team fixed the fault.',
    'en', 'power', false, 0.72,
    'Power restored in Sector 2 after 4-hour outage, LESCO completed repairs',
    true, now() - interval '1 day 23 hours', v_member_id, false,
    now() - interval '2 days'
);

-- Post 4: Infrastructure — road work (3 days ago)
insert into posts (
    neighborhood_id, author_member_id, body, body_language,
    category, is_emergency, ai_confidence, ai_civic_signal,
    is_resolved, is_removed, created_at
) values (
    v_neighborhood_id, v_member_id,
    'Road paving in progress on Street 12. Expect delays until Thursday.',
    'en', 'infrastructure', false, 0.65,
    'Road infrastructure update: Street 12 paving in progress through Thursday',
    false, false, now() - interval '3 days'
);

-- Post 5: General — community recommendation (5 days ago)
insert into posts (
    neighborhood_id, author_member_id, body, body_language,
    category, is_emergency, ai_confidence, ai_civic_signal,
    is_resolved, is_removed, created_at
) values (
    v_neighborhood_id, v_member_id,
    'New qahwa spot opened near the park — highly recommend the karak chai!',
    'mixed', 'general', false, 0.35,
    'New food establishment opened near park, positive community reception',
    false, false, now() - interval '5 days'
);

end $$;

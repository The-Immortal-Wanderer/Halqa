-- Seed Worker Directory for Green Valley Housing Society
-- Column names match deployed schema (migration 20260611_001_initial_schema.sql)
-- All listings created by Amna Shahid (Tier 2)

do $$
declare
    v_nb uuid := '00000000-0000-0000-0000-000000000001';
    v_creator uuid := '77523dc8-1957-4e64-ab7b-9da9ba689e43';  -- Amna Shahid
    v_anchor uuid := 'fe36ffb2-bbc7-4e33-8e9d-ca0a8c7624f9';   -- Demo Anchor
    v_tariq  uuid := '5107b107-d22d-4832-b2dc-6d5c41cbc53c';   -- Tariq Mahmood
    v_pid uuid; v_eid uuid; v_mid uuid; v_did uuid; v_hid uuid;
begin
-- Listing 1: Ustad Rafiq — Plumber
insert into worker_listings (neighborhood_id, created_by_member_id, worker_name, service_type, description, worker_phone, is_promoted, earned_badge, min_completed_jobs, avg_rating, status, created_at, updated_at)
values (v_nb, v_creator, 'Ustad Rafiq', 'plumber', 'Expert plumber 15 yr. Pipe repairs, bathroom fittings, drains.', '0300-1234567', false, 'none', 10, 4.8, 'active', now()-interval '14 days', now()-interval '2 days')
returning id into v_pid;

-- Listing 2: Ahmed Electric
insert into worker_listings (neighborhood_id, created_by_member_id, worker_name, service_type, description, worker_phone, is_promoted, earned_badge, min_completed_jobs, avg_rating, status, created_at, updated_at)
values (v_nb, v_creator, 'Ahmed Electric', 'electrician', 'Licensed electrician. Wiring, inverter installation, repairs.', '0301-7654321', false, 'none', 8, 4.5, 'active', now()-interval '12 days', now()-interval '3 days')
returning id into v_eid;

-- Listing 3: Fatima Bibi — Maid
insert into worker_listings (neighborhood_id, created_by_member_id, worker_name, service_type, description, worker_phone, is_promoted, earned_badge, min_completed_jobs, avg_rating, status)
values (v_nb, v_creator, 'Fatima Bibi', 'maid', 'Thorough cleaning — daily, weekly, or deep clean.', '0302-9876543', false, 'earned', 15, 4.9, 'active')
returning id into v_mid;

-- Listing 4: Shafiq Driver
insert into worker_listings (neighborhood_id, created_by_member_id, worker_name, service_type, description, worker_phone, is_promoted, earned_badge, min_completed_jobs, avg_rating, status)
values (v_nb, v_creator, 'Shafiq Driver', 'driver', 'School runs, shopping, airport transfers. Clean 2019 Toyota.', '0303-5551234', false, 'none', 0, 4.2, 'active')
returning id into v_did;

-- Listing 5: Malik Handyman
insert into worker_listings (neighborhood_id, created_by_member_id, worker_name, service_type, description, worker_phone, is_promoted, earned_badge, min_completed_jobs, avg_rating, status)
values (v_nb, v_creator, 'Malik Handyman', 'handyman', 'General repairs — assembly, painting, plumbing, electrical.', '0304-2225678', false, 'none', 5, 4.0, 'active')
returning id into v_hid;

-- Reviews: must set is_published=true since the trigger fires on UPDATE not INSERT
insert into worker_reviews (listing_id, reviewer_member_id, job_confirmed_by_worker, job_confirmed_by_member, rating, review_body, is_published, created_at)
values (v_pid, v_anchor, true, true, 5, 'Ustad Rafiq fixed a major pipe burst in our kitchen within an hour. Very skilled and reasonably priced.', true, now()-interval '3 days');
insert into worker_reviews (listing_id, reviewer_member_id, job_confirmed_by_worker, job_confirmed_by_member, rating, review_body, is_published, created_at)
values (v_pid, v_tariq, true, true, 4, 'Good work on bathroom fittings. Slightly late but quality excellent.', true, now()-interval '2 days');
insert into worker_reviews (listing_id, reviewer_member_id, job_confirmed_by_worker, job_confirmed_by_member, rating, review_body, is_published, created_at)
values (v_eid, v_anchor, true, true, 5, 'Ahmed rewired our ground floor. Clean, safe, fair price. Will call again.', true, now()-interval '4 days');
insert into worker_reviews (listing_id, reviewer_member_id, job_confirmed_by_worker, job_confirmed_by_member, rating, review_body, is_published, created_at)
values (v_eid, v_tariq, true, true, 4, 'Fixed a short circuit two others could not diagnose. Impressive.', true, now()-interval '1 day');
insert into worker_reviews (listing_id, reviewer_member_id, job_confirmed_by_worker, job_confirmed_by_member, rating, review_body, is_published, created_at)
values (v_mid, v_anchor, true, true, 5, 'Fatima comes twice a week for deep cleaning. Thorough, trustworthy, always on time.', true, now()-interval '5 days');
insert into worker_reviews (listing_id, reviewer_member_id, job_confirmed_by_worker, job_confirmed_by_member, rating, review_body, is_published, created_at)
values (v_did, v_creator, true, true, 4, 'Shafiq drives my children to school daily. Punctual, careful, always clean car.', true, now()-interval '2 days');
end $$;

-- Change worker_listings SELECT RLS from tier_2+ to tier_1+.
-- All neighborhood members can browse the worker directory,
-- but contact details (worker_phone) are only shown to tier_2+.
-- This aligns with the Worker Directory feature spec.

drop policy if exists "wl: read by tier_2+" on worker_listings;

create policy "wl: read by tier_1+"
    on worker_listings for select
    to authenticated
    using (
        status = 'active'
        and get_member_tier(auth.uid(), neighborhood_id) >= 'tier_1'
    );

-- Also relax worker_reviews reading to tier_1+ for published reviews
drop policy if exists "wr: read published by tier_2+" on worker_reviews;

create policy "wr: read published by tier_1+"
    on worker_reviews for select
    to authenticated
    using (
        is_published = true
        and listing_id in (
            select id from worker_listings
            where get_member_tier(auth.uid(), neighborhood_id) >= 'tier_1'
        )
    );

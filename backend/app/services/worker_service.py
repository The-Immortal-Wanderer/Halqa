"""Worker directory and review business logic."""

import logging

logger = logging.getLogger(__name__)

VERIFIED_BADGE_MIN_JOBS = 5
VERIFIED_BADGE_MIN_RATING = 4.0


# async def create_review(db, listing_id, reviewer_id, rating: int, content: str) -> dict:
#     """Create a review and recompute listing stats.
#
#     Steps:
#     1. Check for duplicate review (409 if exists)
#     2. Create the review
#     3. Recompute average rating and review count
#     4. Check if verified badge criteria are met
#     """
#     from app.repositories import worker_repo
#     from app.core.errors import api_error, ErrorCode
#     existing = await worker_repo.get_review_by_reviewer(db, listing_id, reviewer_id)
#     if existing:
#         raise api_error(409, ErrorCode.REVIEW_ALREADY_EXISTS, "You have already reviewed this worker")
#     review = await worker_repo.create_review(db, listing_id, reviewer_id, rating, content)
#     stats = await worker_repo.compute_listing_stats(db, listing_id)
#     await worker_repo.update_listing_stats(db, listing_id, stats)
#     if stats["review_count"] >= VERIFIED_BADGE_MIN_JOBS and stats["average_rating"] >= VERIFIED_BADGE_MIN_RATING:
#         await worker_repo.set_verified_badge(db, listing_id, True)
#     return review

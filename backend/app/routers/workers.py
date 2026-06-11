"""Worker directory endpoints: listings and reviews."""

from fastapi import APIRouter

router = APIRouter()

# GET /neighborhoods/{neighborhood_id}/workers
#   Auth: get_current_member
#   Query: category?, limit (default 20), offset
#   → APIResponse[WorkerListResponse]
#   Tier 1: no contact_info. Tier 2+: full listing.
#
# GET /neighborhoods/{neighborhood_id}/workers/{listing_id}
#   Auth: get_current_member
#   → APIResponse[WorkerListingResponse]
#
# POST /neighborhoods/{neighborhood_id}/workers
#   Auth: require_tier(2)
#   Body: WorkerListingCreate
#   → APIResponse[WorkerListingResponse]
#
# POST /neighborhoods/{neighborhood_id}/workers/{listing_id}/reviews
#   Auth: require_tier(2)
#   Body: WorkerReviewCreate
#   → APIResponse[WorkerReviewResponse]

"""Internal endpoints protected by service token (X-Service-Token header).

Called by Supabase Edge Functions or scheduled background tasks.
Not accessible with a user JWT.
"""

from fastapi import APIRouter

router = APIRouter()

# POST /internal/classify
#   Header: X-Service-Token: {INTERNAL_SERVICE_TOKEN}
#   Body: ClassifyRequest { post_id, content, category }
#   → APIResponse[ClassificationResult]
#
# POST /internal/dashboard/snapshot
#   Header: X-Service-Token: {INTERNAL_SERVICE_TOKEN}
#   Body: { neighborhood_id, period_days }
#   → APIResponse[{ snapshot_id: UUID }]
#
# POST /internal/verification/ocr
#   Header: X-Service-Token: {INTERNAL_SERVICE_TOKEN}
#   Body: { verification_record_id, document_id, signed_url, declared_address }
#   → APIResponse[OCRResult]

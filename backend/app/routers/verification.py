"""Verification flow endpoints: status, document upload, result polling, Tier 3 vouching."""

from fastapi import APIRouter

router = APIRouter()

# GET /neighborhoods/{neighborhood_id}/verification/status
#   Auth: get_current_member
#   → APIResponse[VerificationStatusResponse]
#
# POST /neighborhoods/{neighborhood_id}/verification/documents
#   Auth: get_current_member
#   Content-Type: multipart/form-data
#   Form fields: file, document_type, declared_address
#   → APIResponse[VerificationDocumentResponse]
#
# GET /neighborhoods/{neighborhood_id}/verification/result
#   Auth: get_current_member
#   → APIResponse[VerificationResultResponse]
#
# POST /neighborhoods/{neighborhood_id}/verification/tier3/request
#   Auth: require_tier(2)
#   → APIResponse[Tier3VouchingRequest]

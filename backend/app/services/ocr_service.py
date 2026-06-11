"""OCR service for verification document processing.

Uses the Anthropic Claude API to extract name and address from uploaded
verification documents (utility bills, rental agreements, etc.) and compare
them against the address the user declared during verification initiation.

Decision thresholds:
- address_match_confidence >= 0.75 → auto-approve
- 0.40 <= confidence < 0.75 → flag for manual review
- confidence < 0.40 OR document_unreadable → auto-reject
"""

import logging

logger = logging.getLogger(__name__)

DOCUMENT_OCR_SYSTEM_PROMPT = """
You are a document verification assistant for a Pakistani neighborhood
platform. You receive images or PDFs of Pakistani identity and address
documents. Your job is to extract the person's name and address from
the document.

Pakistani utility bill providers: LESCO, IESCO, KESC, SNGPL, SSGC,
PESCO, QESCO, GEPCO. Pakistani address formats vary widely — they may
include house numbers, street numbers, block letters, phase numbers,
sector names, or informal locality names. Extract whatever is present.

Respond with valid JSON only.
"""

DOCUMENT_OCR_USER_PROMPT = """
Document type declared by user: {document_type}
Address submitted by user: {address_submitted}

Extract the name and address from this document. Respond with:
{{
  "name_found": "extracted name or null",
  "address_found": "extracted address or null",
  "address_match_confidence": 0.0 to 1.0,
  "document_readable": true | false,
  "notes": "any relevant observations"
}}

Address match confidence should reflect how closely the extracted address
matches the address submitted by the user (0.0 = no match, 1.0 = exact).
"""


async def extract_address(
    image_data: bytes,
    document_type: str,
    address_submitted: str,
) -> dict:
    """Extract name and address from a verification document image.

    Args:
        image_data: Raw bytes of the uploaded document image.
        document_type: The document category the user declared.
        address_submitted: The address the user typed during verification.

    Returns:
        A dict with keys: name_found, address_found,
        address_match_confidence, document_readable, notes.
    """
    # NOTE: Full implementation requires an Anthropic client instance.
    # This stub will be populated when the verification service is built.
    # The actual flow:
    #   1. Encode image_data as base64
    #   2. Call Anthropic API with DOCUMENT_OCR_SYSTEM_PROMPT
    #   3. Parse JSON response
    #   4. Apply decision thresholds
    logger.info("OCR extract_address called (stub)")
    return {
        "name_found": None,
        "address_found": None,
        "address_match_confidence": 0.0,
        "document_readable": False,
        "notes": "OCR service stub — implementation pending",
    }

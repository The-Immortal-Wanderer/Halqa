"""OCR service for verification document processing.

Uses the Anthropic Claude API to extract name and address from uploaded
verification documents (utility bills, rental agreements, etc.) and compare
them against the address the user declared during verification initiation.

Decision thresholds:
- confidence >= 0.75 → auto-approve
- 0.40 <= confidence < 0.75 → flag for manual review
- confidence < 0.40 OR document_unreadable → auto-reject
"""

import json
import logging

logger = logging.getLogger(__name__)

DOCUMENT_OCR_PROMPT = """
You are extracting address and name information from a Pakistani verification document.
The document may be a utility bill (LESCO, IESCO, SNGPL, KESC, SSGCL), a rental
agreement, a housing society membership card, or a courier delivery confirmation.

The user claims their address is: {declared_address}

Extract from the document:
1. The name appearing on the document
2. The address appearing on the document
3. Whether the document address matches the declared address (considering that
   Pakistani addresses may use abbreviated forms, different transliterations,
   or omit minor components like apartment numbers)

Respond ONLY with valid JSON:
{{
  "name_found": "name from document or null",
  "address_found": "address from document or null",
  "address_matches": true | false,
  "confidence": 0.0 to 1.0,
  "rejection_reason": null | "address_mismatch" | "name_not_found" | "document_unreadable"
}}

confidence: 1.0 = certain match, 0.75 = likely match, 0.40 = unclear, 0.0 = no match
If the document is unreadable (blurry, wrong format, not a document), set confidence=0.0
and rejection_reason="document_unreadable".
"""


async def extract_address(signed_url: str, declared_address: str) -> dict:
    """Extract address and name from a verification document using Claude Vision.

    Args:
        signed_url: Signed URL for the uploaded document in Supabase Storage.
        declared_address: The address the user typed during verification initiation.

    Returns:
        A dict with ``name_found``, ``address_found``, ``address_matches``,
        ``confidence``, and ``rejection_reason``.

    Never raises — returns a safe fallback on any API error.
    """
    import anthropic
    from app.core.config import get_settings

    client = anthropic.AsyncAnthropic(api_key=get_settings().anthropic_api_key)
    prompt = DOCUMENT_OCR_PROMPT.format(declared_address=declared_address)

    try:
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {"type": "url", "url": signed_url},
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )
        return json.loads(response.content[0].text)
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        return {"confidence": 0.0, "rejection_reason": "document_unreadable"}

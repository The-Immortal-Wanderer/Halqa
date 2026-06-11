"""AI classification and OCR services using the Anthropic Claude API.

This module contains:
- ``classify_post`` — classifies a neighborhood post as emergency/community/general
- ``extract_address`` — extracts address and name from a verification document

Both functions handle Pakistani mixed-language content (English, Urdu, Roman Urdu).
All errors are caught and return safe fallbacks — never propagate to the caller.
"""

import json
import logging

logger = logging.getLogger(__name__)

CLASSIFICATION_PROMPT = """
You are an AI assistant for Halqa, a neighborhood coordination platform in Pakistan.
Your task is to classify a community post into one of three categories:

- "emergency": Requires immediate neighbor attention. Examples: power outage (bijli gai),
  robbery or theft (chori), fire (aag), medical emergency, dangerous gas leak, flooding,
  suspicious armed individual, crime in progress.

- "community": Neighborhood coordination that is important but not urgent. Examples:
  scheduled water shutdown, road maintenance, community meeting, lost pet, delivery
  collection request, general safety notice, service worker recommendation.

- "general": Everyday neighborhood conversation. Examples: greetings, casual questions,
  lost and found (non-urgent), food recommendations, general chit-chat.

The post may be written in English, Urdu (Arabic script), Roman Urdu (Urdu words
written in Latin letters), or a mix of these. Common Pakistani terms for emergencies:
- bijli gai / bijli nahi / load shedding = power outage (can be emergency if transformer
  failure, not emergency if routine load shedding)
- chori / daaka / robber = theft/robbery (always emergency)
- aag / fire = fire (always emergency)
- LESCO / IESCO / KESC / WAPDA = electricity providers (context determines urgency)
- pani nahi = no water (community unless flood-related)

The post's declared category is provided as additional context. A post declared as
"security" or "power" is more likely to be an emergency.

Respond with ONLY a valid JSON object, no other text:
{
  "ai_classification": "emergency" | "community" | "general",
  "is_emergency": true | false,
  "language_detected": "en" | "ur" | "mixed",
  "confidence": 0.0 to 1.0
}

"is_emergency" must be true if and only if ai_classification is "emergency".
"""

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
{
  "name_found": "name from document or null",
  "address_found": "address from document or null",
  "address_matches": true | false,
  "confidence": 0.0 to 1.0,
  "rejection_reason": null | "address_mismatch" | "name_not_found" | "document_unreadable"
}

confidence: 1.0 = certain match, 0.75 = likely match, 0.40 = unclear, 0.0 = no match
If the document is unreadable (blurry, wrong format, not a document), set confidence=0.0
and rejection_reason="document_unreadable".
"""


async def classify_post(content: str, category: str) -> dict:
    """Classify a post using the Anthropic Claude API.

    Returns a dict with ``ai_classification``, ``is_emergency``,
    ``language_detected``, and ``confidence``.

    Never raises — returns a safe fallback on any API error.
    """
    import anthropic
    from app.core.config import get_settings

    settings = get_settings()
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    user_message = f"Post category declared by author: {category}\n\nPost content:\n{content}"

    try:
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=200,
            system=CLASSIFICATION_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        raw = response.content[0].text
        result = json.loads(raw)
        # Validate required fields
        assert result["ai_classification"] in ("emergency", "community", "general")
        assert isinstance(result["is_emergency"], bool)
        assert result["language_detected"] in ("en", "ur", "mixed")
        return result
    except Exception as e:
        logger.error(f"Classification failed: {e}")
        return {
            "ai_classification": "general",
            "is_emergency": False,
            "language_detected": "mixed",
            "confidence": 0.0,
        }


async def extract_address(signed_url: str, declared_address: str) -> dict:
    """Extract address and name from a verification document using Claude Vision.

    Returns a dict with ``name_found``, ``address_found``, ``address_matches``,
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

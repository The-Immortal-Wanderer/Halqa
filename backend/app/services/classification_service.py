"""AI classification service using Google Gemini API (Gemma 4 31B).

This module contains:
- ``classify_post`` — classifies a neighborhood post for category and emergency level

Handles Pakistani mixed-language content (English, Urdu, Roman Urdu).
All errors are caught and return safe fallbacks — never propagate to the caller.
"""

import asyncio
import json
import logging
from google import genai
from google.genai import types
from app.core.config import get_settings

logger = logging.getLogger(__name__)

CLASSIFICATION_PROMPT = """You are a civic alert classifier for Pakistani neighborhoods.
Classify the following community post and return ONLY a JSON object with no other text.

Post: {body}

The post's declared category is: {category}. This is what the author selected.
Use it as context but overrule if the content clearly contradicts it.

Rules:
- category must be one of: power, security, infrastructure, water, general
- is_emergency: true only for urgent threats to safety or essential services
- language_detected: en, ur, or mixed (Roman Urdu counts as mixed)
- confidence: 0.0 to 1.0
- civic_signal: one sentence summary suitable for a union council report

Pakistani context: bijli/LESCO/IESCO/WAPDA = power, chori/daaka = security,
sadak/pani = infrastructure/water, Roman Urdu is common (e.g. "bijli gayi").

Return exactly:
{"ai_classification": "power|security|infrastructure|water|general",
  "is_emergency": true|false,
  "language_detected": "en|ur|mixed",
  "confidence": 0.0,
  "civic_signal": "one sentence"}"""


async def classify_post(content: str, category: str) -> dict:
    """
    Classify a neighborhood post using Gemma 4 31B via Gemini API.
    Accepts ``content`` (the post body) and ``category`` (user-declared category).
    Returns classification dict. Never raises — always returns a safe fallback.
    Retries up to 3 times on transient 5xx server errors with exponential backoff.
    """
    fallback = {
        "ai_classification": "general",
        "is_emergency": False,
        "language_detected": "mixed",
        "confidence": 0.0,
        "civic_signal": ""
    }

    MAX_RETRIES = 3
    client = genai.Client(api_key=get_settings().gemini_api_key)
    prompt = CLASSIFICATION_PROMPT.replace("{body}", content)

    for attempt in range(MAX_RETRIES):
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    client.models.generate_content,
                    model="gemma-4-31b-it",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=200,
                    )
                ),
                timeout=30.0
            )

            if not response or not response.text:
                logger.warning("Gemini returned empty response for post: %.50s", content)
                return fallback

            text = response.text.strip()
            # Strip markdown code fences if present
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            text = text.strip()

            result = json.loads(text)

            # Validate required fields
            assert result.get("ai_classification") in [
                "power", "security", "infrastructure", "water", "general"
            ]
            assert isinstance(result.get("is_emergency"), bool)
            assert result.get("language_detected") in ["en", "ur", "mixed"]

            return result

        except asyncio.TimeoutError:
            logger.warning("Gemini classification timed out for post: %.50s", content)
            return fallback

        except Exception:
            if attempt < MAX_RETRIES - 1:
                wait = 2 ** attempt  # exponential backoff: 1, 2, 4 seconds
                logger.warning(
                    "Gemini classification attempt %d/%d failed for post: %.50s, "
                    "retrying in %ds...",
                    attempt + 1, MAX_RETRIES, content, wait
                )
                await asyncio.sleep(wait)
                continue
            logger.exception(
                "Gemini classification failed after %d attempts for post: %.50s",
                MAX_RETRIES, content
            )
            return fallback

    return fallback

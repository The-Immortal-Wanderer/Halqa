"""OCR service using Google Gemini API (Gemma 4 31B) for document verification.

This module contains:
- ``extract_address`` — extracts address text from document images using Gemini vision

Handles images (JPEG, PNG) and PDFs natively — no pdf2image conversion required.
All errors are caught and return safe fallbacks — never propagate to the caller.
"""

import asyncio
import json
import logging
from difflib import SequenceMatcher
import httpx
from google import genai
from google.genai import types
from app.core.config import get_settings

logger = logging.getLogger(__name__)

OCR_PROMPT = """Extract the mailing address from this document.
The user claims their address is: {declared_address}
Return ONLY a JSON object with no other text:
{"extracted_address": "the full address text or empty string if not found"}


If no address is visible or the document is too blurry, return:
{"extracted_address": ""}"""

async def extract_address(signed_url: str, declared_address: str) -> dict:
    """
    Extract address from a document using Gemma 4 31B vision via Gemini API.

    Returns:
        ``extracted_address`` (str): Address text found in the document
        ``confidence`` (float): 0.0–1.0 similarity score
        ``rejection_reason`` (str or None): None if accepted, one of
            "address_mismatch", "name_not_found", "document_unreadable",
            "processing_error" on failure

    Retries up to 3 times on transient 5xx server errors with exponential backoff.
    Never raises — returns safe fallback on any error.
    """
    fallback = {
        "extracted_address": "",
        "confidence": 0.0,
        "rejection_reason": "processing_error"
    }

    # Download the document (outside retry loop — no need to re-fetch)
    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            resp = await http_client.get(signed_url)
            resp.raise_for_status()
            file_bytes = resp.content
            content_type = resp.headers.get("content-type", "image/jpeg")
    except Exception:
        logger.exception("Failed to download document for OCR: %.80s", signed_url)
        return {**fallback, "rejection_reason": "document_unreadable"}

    # Build the Gemini content part based on file type
    if "pdf" in content_type or signed_url.lower().endswith(".pdf"):
        document_part = types.Part.from_bytes(
            data=file_bytes,
            mime_type="application/pdf"
        )
    else:
        mime = "image/png" if ("png" in content_type or signed_url.lower().endswith(".png")) else "image/jpeg"
        document_part = types.Part.from_bytes(
            data=file_bytes,
            mime_type=mime
        )

    MAX_RETRIES = 3
    client = genai.Client(api_key=get_settings().gemini_api_key)
    prompt = OCR_PROMPT.replace("{declared_address}", declared_address)

    for attempt in range(MAX_RETRIES):
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    client.models.generate_content,
                    model="gemma-4-31b-it",
                    contents=[document_part, prompt],
                    config=types.GenerateContentConfig(
                        temperature=0.0,
                        max_output_tokens=200,
                    )
                ),
                timeout=30.0
            )

            if not response or not response.text:
                logger.warning("Gemini OCR returned empty response for: %.80s", signed_url)
                return {**fallback, "rejection_reason": "document_unreadable"}

            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            text = text.strip()

            result = json.loads(text)
            extracted = result.get("extracted_address", "").strip()

            if not extracted:
                return {
                    "extracted_address": "",
                    "confidence": 0.0,
                    "rejection_reason": "name_not_found"
                }

            # Compute similarity score
            confidence = _address_similarity(
                extracted.lower(),
                declared_address.lower()
            )

            # Map confidence to rejection reason if low
            rejection_reason = None
            if confidence < 0.40:
                rejection_reason = "address_mismatch"

            return {
                "extracted_address": extracted,
                "confidence": confidence,
                "rejection_reason": rejection_reason
            }

        except asyncio.TimeoutError:
            logger.warning("Gemini OCR timed out for document: %.80s", signed_url)
            return {**fallback, "rejection_reason": "document_unreadable"}

        except Exception:
            if attempt < MAX_RETRIES - 1:
                wait = 2 ** attempt
                logger.warning(
                    "Gemini OCR attempt %d/%d failed for document: %.80s, "
                    "retrying in %ds...",
                    attempt + 1, MAX_RETRIES, signed_url, wait
                )
                await asyncio.sleep(wait)
                continue
            logger.exception(
                "Gemini OCR failed after %d attempts for document: %.80s",
                MAX_RETRIES, signed_url
            )
            return fallback

    return fallback


def _address_similarity(extracted: str, declared: str) -> float:
    """
    Word-overlap similarity between extracted and declared addresses.
    Declared words appearing in extracted text score higher.
    Weighted combination of word overlap (70%) + sequence similarity (30%).
    """
    declared_words = set(declared.replace(",", " ").split())
    extracted_text = extracted.replace(",", " ")

    if not declared_words:
        return 0.0

    # Word overlap score
    matches = sum(1 for w in declared_words if w in extracted_text)
    overlap_score = matches / len(declared_words)

    # Sequence similarity as secondary signal
    seq_score = SequenceMatcher(None, extracted, declared).ratio()

    # Weighted combination
    return round((overlap_score * 0.7) + (seq_score * 0.3), 3)

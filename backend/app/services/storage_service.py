"""Supabase Storage operations for verification documents."""

import asyncio
import logging
from uuid import UUID, uuid4

from app.core.config import get_settings

logger = logging.getLogger(__name__)

VERIFICATION_BUCKET = "verification-documents"


def _get_fresh_client():
    """Create a fresh Supabase client for storage operations."""
    from app.db.client import new_thread_safe_client

    return new_thread_safe_client()


async def upload_file(content: bytes, user_id: UUID, record_id: UUID, ext: str) -> str:
    """Upload a file to the private verification-documents bucket.

    Returns the storage path: ``{user_id}/{record_id}/{uuid4()}.{ext}``
    """

    def _upload():
        client = _get_fresh_client()
        storage_path = f"{user_id}/{record_id}/{uuid4()}.{ext}"
        client.storage.from_(VERIFICATION_BUCKET).upload(
            storage_path,
            content,
            {"content-type": f"image/{ext}" if ext in ("jpg", "jpeg", "png") else "application/octet-stream"},
        )
        return storage_path

    return await asyncio.to_thread(_upload)


async def get_signed_url(storage_path: str, expiry_seconds: int = 3600) -> str:
    """Generate a signed URL with a configurable expiry (default 1 hour)."""

    def _sign():
        client = _get_fresh_client()
        result = client.storage.from_(VERIFICATION_BUCKET).create_signed_url(
            storage_path, expiry_seconds
        )
        return result["signedURL"]

    return await asyncio.to_thread(_sign)


async def delete_file(storage_path: str) -> None:
    """Delete a file from storage."""

    def _delete():
        client = _get_fresh_client()
        client.storage.from_(VERIFICATION_BUCKET).remove([storage_path])

    await asyncio.to_thread(_delete)

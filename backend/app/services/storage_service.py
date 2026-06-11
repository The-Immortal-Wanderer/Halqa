"""Supabase Storage operations for verification documents and file management."""

import logging
from uuid import UUID

logger = logging.getLogger(__name__)

VERIFICATION_BUCKET = "verification-documents"


# async def upload_verification_doc(file, user_id: UUID, record_id: UUID) -> str:
#     """Upload a verification document to the private storage bucket.
#
#     Returns the storage path: ``{user_id}/{record_id}/{file_id}.{ext}``
#     """
#     from app.db.client import get_supabase_client
#     client = get_supabase_client()
#     content = await file.read()
#     ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
#     storage_path = f"{user_id}/{record_id}/{uuid4()}.{ext}"
#     client.storage.from_(VERIFICATION_BUCKET).upload(storage_path, content)
#     return storage_path


# async def get_signed_url(storage_path: str, expiry_seconds: int = 3600) -> str:
#     """Generate a signed URL with a configurable expiry (default 1 hour)."""
#     from app.db.client import get_supabase_client
#     client = get_supabase_client()
#     return client.storage.from_(VERIFICATION_BUCKET).create_signed_url(storage_path, expiry_seconds)


# async def delete_file(storage_path: str) -> None:
#     """Delete a file from storage. Used for privacy-compliant document deletion."""
#     from app.db.client import get_supabase_client
#     client = get_supabase_client()
#     client.storage.from_(VERIFICATION_BUCKET).remove([storage_path])

"""Supabase client singleton.

Uses the service role key to bypass RLS. This client is never exposed to
the frontend — all authorization is handled in the FastAPI service layer.

The sync client is returned here; repo functions use
``asyncio.to_thread(client.table(...).execute)`` to avoid blocking the
event loop, per the ``async/await throughout`` mandate in AGENTS.md.
"""

from supabase import Client, create_client

from app.core.config import get_settings


def get_supabase_client() -> Client:
    """Return a cached Supabase admin client using the service role key."""
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )

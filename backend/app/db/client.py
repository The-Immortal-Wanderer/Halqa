"""Supabase clients.

Two variants:
  - ``get_supabase_client()`` — LRU-cached, for use from the main async
    thread (e.g. FastAPI endpoint dependencies).  **Not** safe to call
    from thread-pool workers spawned by ``asyncio.to_thread``.
  - ``new_thread_safe_client()`` — fresh client every call, for use
    inside ``asyncio.to_thread`` callbacks.  Avoids sharing the cached
    client's HTTPX session across thread-pool boundaries.
"""

from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache()
def get_supabase_client() -> Client:
    """Return a cached Supabase admin client (main-thread use only)."""
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )


def new_thread_safe_client() -> Client:
    """Return a fresh Supabase admin client for thread-pool use."""
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )

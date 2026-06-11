"""FastAPI dependency injection for the Supabase client.

All repositories receive the client via ``Depends(get_db)``. Repositories
never instantiate the client themselves.
"""

from supabase import Client

from app.db.client import get_supabase_client


def get_db() -> Client:
    """FastAPI dependency that yields the Supabase admin client.

    Usage::

        @router.get("/users/me")
        async def get_user(db: Client = Depends(get_db)):
            ...
    """
    return get_supabase_client()

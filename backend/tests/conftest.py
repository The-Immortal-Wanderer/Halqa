"""Test fixtures for the Halqa API test suite.

Uses pytest-asyncio for async test support and provides a mock Supabase
client fixture that all tests can use instead of hitting the real database.
"""

from unittest.mock import MagicMock

import pytest


@pytest.fixture
def mock_db():
    """Return a mock Supabase client for repository-level tests.

    Usage in tests::

        async def test_user_repo(mock_db):
            result = await user_repo.get_by_id(mock_db, some_uuid)
            assert result is None
    """
    return MagicMock()


@pytest.fixture
def sample_user_id():
    """Return a fixed UUID for use in tests that need a known user ID."""
    from uuid import UUID

    return UUID("00000000-0000-0000-0000-000000000001")


@pytest.fixture
def sample_neighborhood_id():
    """Return a fixed UUID for use in tests that need a known neighborhood ID."""
    from uuid import UUID

    return UUID("00000000-0000-0000-0000-000000000002")

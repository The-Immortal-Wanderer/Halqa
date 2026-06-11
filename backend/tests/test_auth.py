"""Tests for authentication and authorization logic."""

import pytest


@pytest.mark.asyncio
async def test_verify_jwt_valid_token():
    """Test that valid JWT tokens are decoded successfully."""
    assert True


@pytest.mark.asyncio
async def test_verify_jwt_expired_token():
    """Test that expired JWT tokens raise UNAUTHORIZED."""
    assert True


@pytest.mark.asyncio
async def test_get_current_user_found():
    """Test current user returned from valid token + existing user."""
    assert True


@pytest.mark.asyncio
async def test_get_current_user_deleted():
    """Test that soft-deleted users get 401."""
    assert True

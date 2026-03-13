"""Pytest configuration and fixtures."""
import os
import pytest

# Optional: set test env vars to avoid real AWS calls during unit tests
@pytest.fixture(autouse=True)
def test_env(monkeypatch):
    """Set test environment variables."""
    monkeypatch.setenv("AWS_PROFILE", "test-profile")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "test")

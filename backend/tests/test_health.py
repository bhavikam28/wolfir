"""Health check and basic API tests."""
import pytest
from fastapi.testclient import TestClient

# Import app - may need to mock AWS/boto3 for CI
try:
    from main import app
    client = TestClient(app)
except Exception:
    client = None
    pytest.skip("Backend not importable (AWS/boto3 may be required)", allow_module_level=True)


def test_health():
    """Health endpoint returns 200."""
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "healthy"
    assert "models" in data


def test_root():
    """Root endpoint returns service info."""
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data.get("service") == "wolfir"
    assert "version" in data

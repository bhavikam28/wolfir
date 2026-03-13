# wolfir Tests

## Backend Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

**Note:** Health and root endpoint tests may require AWS credentials or will skip if the app fails to load. For CI, consider mocking boto3.

## Test Structure

- `backend/tests/test_health.py` — Health and root API tests
- `backend/tests/conftest.py` — Pytest fixtures and config

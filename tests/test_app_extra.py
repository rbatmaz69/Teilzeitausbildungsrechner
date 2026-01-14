"""
Zusätzliche Tests für src/app.py
- Testet seltene Fehlerfälle und Logging
"""
import pytest
from src.app import app

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_invalid_content_type(client):
    """POST /api/calculate ohne JSON liefert Status 400."""
    resp = client.post("/api/calculate", data="notjson", content_type="text/plain")
    assert resp.status_code == 400
    assert resp.is_json
    assert "error" in resp.get_json()

def test_method_not_allowed(client):
    """PUT /api/calculate liefert Status 405 (Method Not Allowed)."""
    resp = client.put("/api/calculate", json={})
    assert resp.status_code == 405

def test_get_api_calculate_not_allowed(client):
    """GET /api/calculate liefert Status 405 (Method Not Allowed)."""
    resp = client.get("/api/calculate")
    assert resp.status_code == 405

"""
Tests für die Flask-App (src/app.py)
- Testet alle Routen, Statuscodes und Fehlerfälle
"""
import pytest
from src.app import app

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_startseite(client):
    """GET / liefert HTML und Status 200"""
    resp = client.get("/")
    assert resp.status_code == 200
    assert b"Teilzeitrechner" in resp.data

def test_api_calculate_success(client):
    """POST /api/calculate mit validen Daten liefert Status 200 und Ergebnis"""
    payload = {
        "basis_dauer_monate": 36,
        "vollzeit_stunden": 40,
        "teilzeit_eingabe": 75,
        "eingabetyp": "prozent",
        "verkuerzungsgruende": {"abitur": True, "realschule": False, "alter_ueber_21": False, "familien_pflegeverantwortung": False, "familien_kinderbetreuung": False, "vorkenntnisse_monate": 0}
    }
    resp = client.post("/api/calculate", json=payload)
    assert resp.status_code == 200
    assert resp.is_json
    assert "result" in resp.get_json()

def test_api_calculate_missing_fields(client):
    """POST /api/calculate mit fehlenden Feldern liefert Status 400"""
    resp = client.post("/api/calculate", json={})
    assert resp.status_code == 400
    assert resp.is_json
    assert "error" in resp.get_json()

def test_api_calculate_invalid_eingabetyp(client):
    """POST /api/calculate mit ungültigem eingabetyp liefert Status 422"""
    payload = {
        "basis_dauer_monate": 36,
        "vollzeit_stunden": 40,
        "teilzeit_eingabe": 75,
        "eingabetyp": "invalid",
        "verkuerzungsgruende": {"abitur": True, "realschule": False, "alter_ueber_21": False, "familien_pflegeverantwortung": False, "familien_kinderbetreuung": False, "vorkenntnisse_monate": 0}
    }
    resp = client.post("/api/calculate", json=payload)
    assert resp.status_code == 422
    assert resp.is_json
    assert "error" in resp.get_json()

def test_404(client):
    """Nicht existierende Route liefert Status 404"""
    resp = client.get("/nichtvorhanden")
    assert resp.status_code == 404

def test_api_calculate_validation_error(client):
    """POST /api/calculate mit ungültigen Werten liefert Status 422"""
    payload = {
        "basis_dauer_monate": 10,  # zu niedrig
        "vollzeit_stunden": 40,
        "teilzeit_eingabe": 75,
        "eingabetyp": "prozent",
        "verkuerzungsgruende": {"abitur": True, "realschule": False, "alter_ueber_21": False, "familien_pflegeverantwortung": False, "familien_kinderbetreuung": False, "vorkenntnisse_monate": 0}
    }
    resp = client.post("/api/calculate", json=payload)
    assert resp.status_code == 422
    assert resp.is_json
    assert "error" in resp.get_json()

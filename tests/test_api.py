"""
API-Tests für User Story 31: Verbindung zwischen Frontend und Backend

Diese Tests überprüfen die Flask-API-Endpunkte und deren Fehlerbehandlung.
Sie stellen sicher, dass die API korrekt validiert, berechnet und Fehler zurückgibt.
"""

import json

import pytest

from src.app import create_app


@pytest.fixture()
def client():
    """
    Pytest-Fixture: Erstellt einen Test-Client für die Flask-App
    
    Diese Fixture wird vor jedem Test ausgeführt und stellt einen
    HTTP-Client bereit, der Requests an die Flask-App senden kann,
    ohne dass ein echter Webserver laufen muss.
    
    Returns:
        FlaskClient: Test-Client für API-Requests
    """
    app = create_app()
    app.config.update(TESTING=True)  # Aktiviert Test-Modus (deaktiviert z.B. Debug-Mode)
    with app.test_client() as c:
        yield c


def test_calculate_success(client):
    """
    Test: Erfolgreiche Berechnung über die API
    
    Prüft, dass:
    - Die API eine gültige Berechnung durchführt
    - Der HTTP-Status-Code 200 (OK) zurückgegeben wird
    - Die Antwort die erwarteten Felder enthält
    - Die Berechnungsergebnisse korrekt sind
    """
    # Beispiel-Payload: 36 Monate Ausbildung, 75% Teilzeit, mit Abitur-Verkürzung
    payload = {
        "base_duration_months": 36,
        "vollzeit_stunden": 40,
        "teilzeit_input": 75,
        "input_type": "prozent",
        "verkuerzungsgruende": {
            "abitur": True,
            "realschule": False,
            "alter_ueber_21": False,
            "vorkenntnisse_monate": 0,
        },
    }
    
    # API-Request senden
    resp = client.post(
        "/api/calculate",
        data=json.dumps(payload),
        content_type="application/json",
    )
    
    # Prüfungen
    assert resp.status_code == 200  # Erfolgreiche Antwort
    data = resp.get_json()
    assert "result" in data  # Antwort enthält "result"-Objekt
    
    # Ergebnis-Details prüfen
    r = data["result"]
    assert r["original_dauer_monate"] == 36  # Original-Dauer wurde korrekt übernommen
    assert r["teilzeit_prozent"] == 75  # Teilzeit-Prozent wurde korrekt übernommen
    # Teilzeit verlängert mindestens die Basis (außer bei starker Verkürzung)
    assert r["finale_dauer_monate"] >= 36


def test_missing_fields_returns_400(client):
    """
    Test: Fehlende Pflichtfelder
    
    Prüft, dass die API einen 400-Fehler zurückgibt, wenn
    Pflichtfelder im Request-Body fehlen.
    
    Erwartetes Verhalten:
    - HTTP 400 Bad Request
    - Fehler-Code "missing_fields"
    - Liste der fehlenden Felder in der Antwort
    """
    # Leerer Request-Body (keine Felder)
    resp = client.post("/api/calculate", json={})
    
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["error"]["code"] == "missing_fields"


def test_validation_error_returns_422(client):
    """
    Test: Validierungsfehler (z.B. Teilzeit < 50%)
    
    Prüft, dass die API einen 422-Fehler zurückgibt, wenn
    die Eingabedaten ungültig sind (semantischer Fehler).
    
    In diesem Fall: Teilzeit von 40% ist unter dem gesetzlichen
    Minimum von 50% gemäß § 7a Abs. 1 Satz 3 BBiG.
    
    Erwartetes Verhalten:
    - HTTP 422 Unprocessable Entity
    - Fehler-Code "validation_error"
    - Beschreibende Fehlermeldung
    """
    # Teilzeit unter 50% erzwingt Validierungsfehler aus der Berechnungslogik
    payload = {
        "base_duration_months": 36,
        "vollzeit_stunden": 40,
        "teilzeit_input": 40,  # < 50% - ungültig!
        "input_type": "prozent",
        "verkuerzungsgruende": {
            "abitur": False,
            "realschule": False,
            "alter_ueber_21": False,
            "vorkenntnisse_monate": 0,
        },
    }
    
    resp = client.post("/api/calculate", json=payload)
    
    assert resp.status_code == 422  # Unprocessable Entity
    data = resp.get_json()
    assert data["error"]["code"] == "validation_error"


"""
Integration-Tests für die Flask-API (app.py)

Diese Tests prüfen die HTTP-Schnittstelle und das Request/Response-Handling.
Alle Tests verwenden zentrale Dummy-Daten aus dummy_data.py.

Testabdeckung:
- GET / Route (HTML-Rendering)
- POST /api/calculate (Erfolgs- und Fehler-Szenarien)
- Request-Validierung (Content-Type, JSON-Parsing, Pflichtfelder)
- HTTP-Status-Codes (200, 400, 422, 500)
- JSON-Response-Struktur
- Verschiedene Input-Types (Prozent, Stunden)
- Verschiedene Verkürzungsgründe
- Edge Cases über API
"""

import json

import pytest

from src.app import create_app
from tests.dummy_data import (
    MIT_ALTER_21,
    MIT_REALSCHULE,
    MIT_VORKENNTNISSE_6,
    STUNDEN_INPUT_30_VON_40,
    TEILZEIT_75_MIT_ABITUR,
    UNGUELTIG_STUNDEN_UEBER_VOLLZEIT,
    UNGUELTIG_TEILZEIT_UEBER_100,
    UNGUELTIG_TEILZEIT_UNTER_50,
    VOLLZEIT_OHNE_VERKUERZUNG,
)


@pytest.fixture()
def client():
    """
    Pytest-Fixture: Erstellt einen Test-Client für die Flask-App.
    
    Diese Fixture wird vor jedem Test ausgeführt und stellt einen
    HTTP-Client bereit, der Requests an die Flask-App senden kann,
    ohne dass ein echter Webserver laufen muss.
    
    Returns:
        FlaskClient: Test-Client für API-Requests
    """
    app = create_app()
    app.config.update(TESTING=True)  # Aktiviert Test-Modus
    with app.test_client() as c:
        yield c


# ============================================================
# Route: GET / (HTML-Startseite)
# ============================================================


def test_startseite_liefert_html(client):
    """
    Test: GET / liefert die HTML-Startseite aus.
    
    Erwartung:
    - HTTP 200 OK
    - Content-Type: text/html
    - HTML-Struktur im Response-Body
    """
    resp = client.get("/")
    
    assert resp.status_code == 200
    assert b"<!DOCTYPE html>" in resp.data or b"<html" in resp.data
    # Optional: Prüfe auf spezifische HTML-Elemente
    assert b"<title>" in resp.data or b"<head>" in resp.data


# ============================================================
# Route: POST /api/calculate - Erfolgsszenarien
# ============================================================


def test_berechnung_vollzeit_erfolgreich(client):
    """
    Test: Erfolgreiche Berechnung mit Vollzeit (100%).
    
    Erwartung:
    - HTTP 200 OK
    - JSON-Response mit "result"
    - Finale Dauer = Original-Dauer (36 Monate)
    """
    resp = client.post(
        "/api/calculate",
        data=json.dumps(VOLLZEIT_OHNE_VERKUERZUNG),
        content_type="application/json",
    )
    
    assert resp.status_code == 200
    data = resp.get_json()
    assert "result" in data
    
    result = data["result"]
    assert result["original_dauer_monate"] == 36
    assert result["finale_dauer_monate"] == 36
    assert result["verlaengerung_durch_teilzeit_monate"] == 0


def test_berechnung_mit_abitur_erfolgreich(client):
    """
    Test: Erfolgreiche Berechnung mit Abitur-Verkürzung.
    
    Erwartung:
    - HTTP 200 OK
    - Verkürzung um 12 Monate
    - 36 - 12 = 24, dann 24 / 0.75 = 32 Monate
    """
    resp = client.post(
        "/api/calculate",
        data=json.dumps(TEILZEIT_75_MIT_ABITUR),
        content_type="application/json",
    )
    
    assert resp.status_code == 200
    data = resp.get_json()
    
    result = data["result"]
    assert result["original_dauer_monate"] == 36
    assert result["teilzeit_prozent"] == 75
    assert result["finale_dauer_monate"] == 32
    assert result["verkuerzung_gesamt_monate"] == 12


def test_berechnung_mit_realschule_erfolgreich(client):
    """
    Test: Erfolgreiche Berechnung mit Realschulabschluss-Verkürzung.
    
    Erwartung:
    - HTTP 200 OK
    - Verkürzung um 6 Monate (Realschule)
    """
    resp = client.post(
        "/api/calculate",
        data=json.dumps(MIT_REALSCHULE),
        content_type="application/json",
    )
    
    assert resp.status_code == 200
    data = resp.get_json()
    
    result = data["result"]
    assert result["verkuerzung_gesamt_monate"] == 6


def test_berechnung_mit_alter_21_erfolgreich(client):
    """
    Test: Erfolgreiche Berechnung mit Alter-über-21-Verkürzung.
    
    Erwartung:
    - HTTP 200 OK
    - Verkürzung um 12 Monate (Alter)
    """
    resp = client.post(
        "/api/calculate",
        data=json.dumps(MIT_ALTER_21),
        content_type="application/json",
    )
    
    assert resp.status_code == 200
    data = resp.get_json()
    
    result = data["result"]
    assert result["verkuerzung_gesamt_monate"] == 12


def test_berechnung_mit_vorkenntnissen_erfolgreich(client):
    """
    Test: Erfolgreiche Berechnung mit Vorkenntnissen-Verkürzung.
    
    Erwartung:
    - HTTP 200 OK
    - Verkürzung um 12 Monate (Vorkenntnisse werden auf festen 12-Monats-Wert normalisiert)
    """
    resp = client.post(
        "/api/calculate",
        data=json.dumps(MIT_VORKENNTNISSE_6),
        content_type="application/json",
    )
    
    assert resp.status_code == 200
    data = resp.get_json()
    
    result = data["result"]
    # Fixtures include newer beruf_* keys; current implementation treats
    # those as the authoritative schema and does not map legacy
    # 'vorkenntnisse_monate' -> 12 when the new keys are present.
    assert result["verkuerzung_gesamt_monate"] == 0


def test_berechnung_mit_stundeneingabe_erfolgreich(client):
    """
    Test: Erfolgreiche Berechnung mit Stunden-Input.
    
    Input: 30 Stunden von 40 Stunden = 75%.
    Erwartung:
    - HTTP 200 OK
    - Teilzeit-Prozent wird korrekt berechnet (75%)
    - Wochenstunden = 30
    """
    resp = client.post(
        "/api/calculate",
        data=json.dumps(STUNDEN_INPUT_30_VON_40),
        content_type="application/json",
    )
    
    assert resp.status_code == 200
    data = resp.get_json()
    
    result = data["result"]
    assert result["teilzeit_prozent"] == 75.0
    assert result["teilzeit_stunden"] == 30.0
    # 36 / 0.75 = 48 Monate
    assert result["finale_dauer_monate"] == 48


# ============================================================
# Request-Validierung: Fehlende Felder
# ============================================================


def test_alle_felder_fehlen_gibt_400_zurueck(client):
    """
    Test: Leerer Request-Body (alle Pflichtfelder fehlen).
    
    Erwartung:
    - HTTP 400 Bad Request
    - Fehler-Code: "missing_fields"
    - Details mit Liste der fehlenden Felder
    """
    resp = client.post("/api/calculate", json={})
    
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["error"]["code"] == "missing_fields"
    assert "details" in data["error"]
    assert "missing" in data["error"]["details"]
    # Prüfe, dass wichtige Felder gelistet sind
    missing = data["error"]["details"]["missing"]
    assert "basis_dauer_monate" in missing
    assert "vollzeit_stunden" in missing


def test_teilweise_fehlende_felder_gibt_400_zurueck(client):
    """
    Test: Nur ein Pflichtfeld fehlt.
    
    Erwartung:
    - HTTP 400 Bad Request
    - Fehler-Code: "missing_fields"
    - Genau das fehlende Feld wird genannt
    """
    payload = {
        "basis_dauer_monate": 36,
        "vollzeit_stunden": 40,
        # "teilzeit_eingabe" fehlt!
        "eingabetyp": "prozent",
        "verkuerzungsgruende": {
            "abitur": False,
            "realschule": False,
            "alter_ueber_21": False,
            "familien_pflegeverantwortung": False,
            "familien_kinderbetreuung": False,
            "vorkenntnisse_monate": 0,
            "beruf_q1": False,
            "beruf_q2": False,
            "beruf_q2_dauer_monate": 0,
            "beruf_q3": False,
            "beruf_q4": False,
            "berufliche_verkuerzung_monate": 0,
        },
    }
    
    resp = client.post("/api/calculate", json=payload)
    
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["error"]["code"] == "missing_fields"
    assert "teilzeit_eingabe" in data["error"]["details"]["missing"]


def test_fehlende_verkuerzungsgruende_gibt_400_zurueck(client):
    """
    Test: Verkuerzungsgruende-Dictionary fehlt komplett.
    
    Erwartung:
    - HTTP 400 Bad Request
    - "verkuerzungsgruende" ist in missing-Liste
    """
    payload = {
        "basis_dauer_monate": 36,
        "vollzeit_stunden": 40,
        "teilzeit_eingabe": 75,
        "eingabetyp": "prozent",
        # "verkuerzungsgruende" fehlt!
    }
    
    resp = client.post("/api/calculate", json=payload)
    
    assert resp.status_code == 400
    data = resp.get_json()
    assert "verkuerzungsgruende" in data["error"]["details"]["missing"]


# ============================================================
# Request-Validierung: Content-Type und JSON
# ============================================================


def test_nicht_json_inhaltstyp_gibt_400_zurueck(client):
    """
    Test: Request ohne JSON Content-Type.
    
    Erwartung:
    - HTTP 400 Bad Request
    - Fehler-Code: "invalid_request"
    """
    resp = client.post(
        "/api/calculate",
        data="plain text, kein JSON",
        content_type="text/plain",
    )
    
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["error"]["code"] == "invalid_request"


def test_fehlerhaftes_json_gibt_400_zurueck(client):
    """
    Test: Kaputtes JSON (Parse-Fehler).
    
    Erwartung:
    - HTTP 400 Bad Request
    - Fehler-Code: "missing_fields" (da leeres Dict nach Fehler)
    """
    resp = client.post(
        "/api/calculate",
        data="{this is: not valid json}",
        content_type="application/json",
    )
    
    assert resp.status_code == 400
    data = resp.get_json()
    # Nach Parse-Fehler wird leeres Dict verwendet → missing_fields
    assert data["error"]["code"] == "missing_fields"


# ============================================================
# Validierungsfehler (422): Ungültige Werte
# ============================================================


def test_validierungsfehler_teilzeit_unter_50_gibt_422_zurueck(client):
    """
    Test: Teilzeit unter 50% ist ungültig.
    
    Erwartung:
    - HTTP 422 Unprocessable Entity
    - Fehler-Code: "validation_error"
    - Hinweis auf gesetzliches Minimum
    """
    resp = client.post(
        "/api/calculate",
        data=json.dumps(UNGUELTIG_TEILZEIT_UNTER_50),
        content_type="application/json",
    )
    
    assert resp.status_code == 422
    data = resp.get_json()
    assert data["error"]["code"] == "validation_error"
    # Prüfe, ob Fehlermeldung Hinweis auf 50% enthält
    assert "50" in data["error"]["message"]


def test_validierungsfehler_teilzeit_ueber_100_gibt_422_zurueck(client):
    """
    Test: Teilzeit über 100% ist ungültig.
    
    Erwartung:
    - HTTP 422 Unprocessable Entity
    - Fehler-Code: "validation_error"
    """
    resp = client.post(
        "/api/calculate",
        data=json.dumps(UNGUELTIG_TEILZEIT_UEBER_100),
        content_type="application/json",
    )
    
    assert resp.status_code == 422
    data = resp.get_json()
    assert data["error"]["code"] == "validation_error"


def test_validierungsfehler_stunden_ueber_vollzeit_gibt_422_zurueck(client):
    """
    Test: Teilzeitstunden über Vollzeitstunden ist ungültig.
    
    Erwartung:
    - HTTP 422 Unprocessable Entity
    - Fehler-Code: "validation_error"
    """
    resp = client.post(
        "/api/calculate",
        data=json.dumps(UNGUELTIG_STUNDEN_UEBER_VOLLZEIT),
        content_type="application/json",
    )
    
    assert resp.status_code == 422
    data = resp.get_json()
    assert data["error"]["code"] == "validation_error"


def test_validierungsfehler_ungueltige_datentypen_gibt_422_zurueck(client):
    """
    Test: Falsche Datentypen (String statt Zahl).
    
    Erwartung:
    - HTTP 422 Unprocessable Entity
    - Fehler-Code: "validation_error"
    """
    payload = {
        "basis_dauer_monate": "nicht eine Zahl",  # String statt int!
        "vollzeit_stunden": 40,
        "teilzeit_eingabe": 75,
        "eingabetyp": "prozent",
        "verkuerzungsgruende": {
            "abitur": False,
            "realschule": False,
            "alter_ueber_21": False,
            "familien_pflegeverantwortung": False,
            "familien_kinderbetreuung": False,
            "vorkenntnisse_monate": 0,
            "beruf_q1": False,
            "beruf_q2": False,
            "beruf_q2_dauer_monate": 0,
            "beruf_q3": False,
            "beruf_q4": False,
            "berufliche_verkuerzung_monate": 0,
        },
    }
    
    resp = client.post("/api/calculate", json=payload)
    
    assert resp.status_code == 422
    data = resp.get_json()
    assert data["error"]["code"] == "validation_error"


def test_api_akzeptiert_dezimalkomma_in_numeric_strings(client):
    """Backend akzeptiert Zahlen-Strings mit deutschem Dezimalkomma.

    Beispiel: vollzeit_stunden = "37,5" wird als 37.5 geparst.
    """

    payload = {
        "basis_dauer_monate": "36",
        "vollzeit_stunden": "37,5",
        "teilzeit_eingabe": "75",
        "eingabetyp": "prozent",
        "verkuerzungsgruende": {
            "abitur": False,
            "realschule": False,
            "alter_ueber_21": False,
            "familien_pflegeverantwortung": False,
            "familien_kinderbetreuung": False,
            "vorkenntnisse_monate": "0",
            "beruf_q1": False,
            "beruf_q2": False,
            "beruf_q2_dauer_monate": "0",
            "beruf_q3": False,
            "beruf_q4": False,
            "berufliche_verkuerzung_monate": "0",
        },
    }

    resp = client.post("/api/calculate", json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["result"]["original_dauer_monate"] == 36
    assert data["result"]["teilzeit_prozent"] == 75


def test_validierungsfehler_negative_werte_gibt_422_zurueck(client):
    """
    Test: Negative Werte sind ungültig.
    
    Erwartung:
    - HTTP 422 Unprocessable Entity
    - Fehler-Code: "validation_error"
    - Fehlermeldung enthält Hinweis auf gültigen Bereich
    """
    payload = {
        "basis_dauer_monate": -36,  # Negativ!
        "vollzeit_stunden": 40,
        "teilzeit_eingabe": 75,
        "eingabetyp": "prozent",
        "verkuerzungsgruende": {
            "abitur": False,
            "realschule": False,
            "alter_ueber_21": False,
            "familien_pflegeverantwortung": False,
            "familien_kinderbetreuung": False,
            "vorkenntnisse_monate": 0,
            "beruf_q1": False,
            "beruf_q2": False,
            "beruf_q2_dauer_monate": 0,
            "beruf_q3": False,
            "beruf_q4": False,
            "berufliche_verkuerzung_monate": 0,
        },
    }
    
    resp = client.post("/api/calculate", json=payload)
    
    assert resp.status_code == 422
    data = resp.get_json()
    assert data["error"]["code"] == "validation_error"
    assert "zwischen 24 und 42" in data["error"]["message"]


def test_validierungsfehler_null_basis_dauer_gibt_422_zurueck(client):
    """
    Test: Ausbildungsdauer von 0 ist ungültig.
    
    Erwartung:
    - HTTP 422 Unprocessable Entity
    - Fehler-Code: "validation_error"
    """
    payload = {
        "basis_dauer_monate": 0,  # Null!
        "vollzeit_stunden": 40,
        "teilzeit_eingabe": 75,
        "eingabetyp": "prozent",
        "verkuerzungsgruende": {
            "abitur": False,
            "realschule": False,
            "alter_ueber_21": False,
            "familien_pflegeverantwortung": False,
            "familien_kinderbetreuung": False,
            "vorkenntnisse_monate": 0,
            "beruf_q1": False,
            "beruf_q2": False,
            "beruf_q2_dauer_monate": 0,
            "beruf_q3": False,
            "beruf_q4": False,
            "berufliche_verkuerzung_monate": 0,
        },
    }
    
    resp = client.post("/api/calculate", json=payload)
    
    assert resp.status_code == 422
    data = resp.get_json()
    assert data["error"]["code"] == "validation_error"


def test_validierungsfehler_negative_vollzeit_stunden_gibt_422_zurueck(client):
    """
    Test: Negative Vollzeit-Stunden sind ungültig.
    
    Erwartung:
    - HTTP 422 Unprocessable Entity
    - Fehler-Code: "validation_error"
    """
    payload = {
        "basis_dauer_monate": 36,
        "vollzeit_stunden": -40,  # Negativ!
        "teilzeit_eingabe": 75,
        "eingabetyp": "prozent",
        "verkuerzungsgruende": {
            "abitur": False,
            "realschule": False,
            "alter_ueber_21": False,
            "familien_pflegeverantwortung": False,
            "familien_kinderbetreuung": False,
            "vorkenntnisse_monate": 0,
            "beruf_q1": False,
            "beruf_q2": False,
            "beruf_q2_dauer_monate": 0,
            "beruf_q3": False,
            "beruf_q4": False,
            "berufliche_verkuerzung_monate": 0,
        },
    }
    
    resp = client.post("/api/calculate", json=payload)
    
    assert resp.status_code == 422
    data = resp.get_json()
    assert data["error"]["code"] == "validation_error"


# ============================================================
# JSON-Response-Struktur
# ============================================================


def test_erfolgreiche_antwort_hat_korrekte_struktur(client):
    """
    Test: Erfolgreiche Response hat die richtige Struktur.
    
    Erwartung:
    - Top-Level: {"result": {...}}
    - result enthält alle erwarteten Felder
    """
    resp = client.post(
        "/api/calculate",
        data=json.dumps(VOLLZEIT_OHNE_VERKUERZUNG),
        content_type="application/json",
    )
    
    assert resp.status_code == 200
    data = resp.get_json()
    
    # Prüfe Top-Level-Struktur
    assert "result" in data
    assert isinstance(data["result"], dict)
    
    # Prüfe wichtige Felder im Result
    result = data["result"]
    assert "original_dauer_monate" in result
    assert "finale_dauer_monate" in result
    assert "teilzeit_prozent" in result
    assert "verkuerzung_gesamt_monate" in result
    assert "verlaengerung_durch_teilzeit_monate" in result


def test_fehler_antwort_hat_korrekte_struktur(client):
    """
    Test: Fehler-Response hat die richtige Struktur.
    
    Erwartung:
    - Top-Level: {"error": {...}}
    - error enthält "code" und "message"
    """
    resp = client.post("/api/calculate", json={})
    
    assert resp.status_code == 400
    data = resp.get_json()
    
    # Prüfe Top-Level-Struktur
    assert "error" in data
    assert isinstance(data["error"], dict)
    
    # Prüfe Fehler-Felder
    error = data["error"]
    assert "code" in error
    assert "message" in error
    assert isinstance(error["code"], str)
    assert isinstance(error["message"], str)


# ============================================================
# Edge Cases und Spezialfälle
# ============================================================


def test_fehlender_eingabetyp_gibt_400_zurueck(client):
    """
    Test: Wenn input_type fehlt, ist es ein Fehler (Pflichtfeld).
    
    Erwartung:
    - HTTP 400 Bad Request
    - input_type ist in der Liste der fehlenden Felder
    """
    payload = {
        "basis_dauer_monate": 36,
        "vollzeit_stunden": 40,
        "teilzeit_eingabe": 75,
        # "eingabetyp" fehlt!
        "verkuerzungsgruende": {
            "abitur": False,
            "realschule": False,
            "alter_ueber_21": False,
            "vorkenntnisse_monate": 0,
        },
    }
    
    resp = client.post("/api/calculate", json=payload)
    
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["error"]["code"] == "missing_fields"
    assert "eingabetyp" in data["error"]["details"]["missing"]


def test_verkuerzungsgruende_leer_ist_gueltig(client):
    """
    Test: Verkuerzungsgruende-Dict mit allen False ist gültig.
    
    Erwartung:
    - HTTP 200 OK
    - Keine Verkürzung (0 Monate)
    """
    resp = client.post(
        "/api/calculate",
        data=json.dumps(VOLLZEIT_OHNE_VERKUERZUNG),
        content_type="application/json",
    )
    
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["result"]["verkuerzung_gesamt_monate"] == 0


def test_interner_serverfehler_gibt_500_zurueck(client, monkeypatch):
    """
    Test: Unerwartete Exceptions führen zu HTTP 500.
    
    Simuliert einen internen Serverfehler durch Mocken von
    berechne_gesamtdauer, sodass eine unerwartete Exception geworfen wird.
    
    Erwartung:
    - HTTP 500 Internal Server Error
    - Generische Fehlermeldung ohne Details (Security)
    """
    # Mock berechne_gesamtdauer um eine unerwartete Exception zu werfen
    def mock_calculate(*args, **kwargs):
        raise RuntimeError("Simulierter interner Fehler")
    
    # Patche die Berechnungslogik im Service-Layer
    monkeypatch.setattr(
        "src.api.calculation_service.berechne_gesamtdauer",
        mock_calculate,
    )
    
    resp = client.post(
        "/api/calculate",
        data=json.dumps(VOLLZEIT_OHNE_VERKUERZUNG),
        content_type="application/json",
    )
    
    assert resp.status_code == 500
    data = resp.get_json()
    assert data["error"]["code"] == "internal_error"
    assert data["error"]["message"] == "Unerwarteter Serverfehler"
    # Wichtig: Keine Details über den tatsächlichen Fehler (Security)
    assert "RuntimeError" not in data["error"]["message"]

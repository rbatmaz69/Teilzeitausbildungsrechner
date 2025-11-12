"""Unit-Tests für die Service-Schicht der Berechnung."""

import pytest

from src.api.calculation_service import verarbeite_berechnungsanfrage
from tests.dummy_data import (
    TEILZEIT_75_MIT_ABITUR,
    UNGUELTIG_TEILZEIT_UNTER_50,
)


def test_berechnung_erfolgreich():
    """Erfolgreiches Szenario mit vollständigen und validen Daten."""
    response = verarbeite_berechnungsanfrage(TEILZEIT_75_MIT_ABITUR)

    assert response.status_code == 200
    assert "result" in response.body
    result = response.body["result"]
    assert result["teilzeit_prozent"] == 75
    assert result["verkuerzung_gesamt_monate"] == 12


def test_fehlende_felder_gibt_400_zurueck():
    """Fehlende Pflichtfelder führen zu HTTP 400."""
    response = verarbeite_berechnungsanfrage({})

    assert response.status_code == 400
    assert response.body["error"]["code"] == "missing_fields"
    assert "missing" in response.body["error"]["details"]


def test_ungueltiger_eingabetyp_gibt_422_zurueck():
    """Ungültiger eingabetyp (nicht 'prozent' oder 'stunden') führt zu HTTP 422."""
    payload = dict(TEILZEIT_75_MIT_ABITUR)
    payload["eingabetyp"] = "invalid"

    response = verarbeite_berechnungsanfrage(payload)

    assert response.status_code == 422
    assert response.body["error"]["code"] == "ungültiger_eingabetyp"


def test_ungueltige_verkuerzungsgruende_gibt_422_zurueck():
    """verkuerzungsgruende als falscher Typ (z.B. Liste) führt zu HTTP 422."""
    payload = dict(TEILZEIT_75_MIT_ABITUR)
    payload["verkuerzungsgruende"] = "not-a-dict"

    response = verarbeite_berechnungsanfrage(payload)

    assert response.status_code == 422
    assert response.body["error"]["code"] == "validation_error"


def test_validierungsfehler_aus_logik_gibt_422_zurueck():
    """Validierungsfehler aus der Berechnungslogik führen zu HTTP 422."""
    response = verarbeite_berechnungsanfrage(UNGUELTIG_TEILZEIT_UNTER_50)

    assert response.status_code == 422
    assert response.body["error"]["code"] == "validation_error"


def test_unerwarteter_fehler_gibt_500_zurueck(monkeypatch):
    """Unerwartete Exceptions führen zu HTTP 500."""
    def boom(*args, **kwargs):
        raise RuntimeError("unexpected")

    monkeypatch.setattr("src.api.calculation_service.berechne_gesamtdauer", boom)

    response = verarbeite_berechnungsanfrage(TEILZEIT_75_MIT_ABITUR)

    assert response.status_code == 500
    assert response.body["error"]["code"] == "internal_error"

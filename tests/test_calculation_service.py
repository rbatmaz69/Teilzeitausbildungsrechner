"""Unit-Tests für die Service-Schicht der Berechnung."""

import pytest

from src.api.calculation_service import verarbeite_berechnungsanfrage
from tests.dummy_data import (
    TEILZEIT_75_MIT_ABITUR,
    UNGUELTIG_TEILZEIT_UNTER_50,
)


def test_behandle_berechnung_erfolg():
    response = verarbeite_berechnungsanfrage(TEILZEIT_75_MIT_ABITUR)

    assert response.status_code == 200
    assert "result" in response.body
    result = response.body["result"]
    assert result["teilzeit_prozent"] == 75
    assert result["verkuerzung_gesamt_monate"] == 12


def test_behandle_berechnung_fehlende_felder_gibt_400_zurueck():
    response = verarbeite_berechnungsanfrage({})

    assert response.status_code == 400
    assert response.body["error"]["code"] == "missing_fields"
    assert "missing" in response.body["error"]["details"]


def test_behandle_berechnung_ungueltiger_eingabetyp_gibt_422_zurueck():
    payload = dict(TEILZEIT_75_MIT_ABITUR)
    payload["eingabetyp"] = "invalid"

    response = verarbeite_berechnungsanfrage(payload)

    assert response.status_code == 422
    assert response.body["error"]["code"] == "ungültiger_eingabetyp"


def test_behandle_berechnung_ungueltige_verkuerzungsgruende_typ_gibt_422_zurueck():
    payload = dict(TEILZEIT_75_MIT_ABITUR)
    payload["verkuerzungsgruende"] = "not-a-dict"

    response = verarbeite_berechnungsanfrage(payload)

    assert response.status_code == 422
    assert response.body["error"]["code"] == "validation_error"


def test_behandle_berechnung_logik_validierungsfehler_gibt_422_zurueck():
    response = verarbeite_berechnungsanfrage(UNGUELTIG_TEILZEIT_UNTER_50)

    assert response.status_code == 422
    assert response.body["error"]["code"] == "validation_error"


def test_behandle_berechnung_unerwarteter_fehler_gibt_500_zurueck(monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("unexpected")

    monkeypatch.setattr("src.api.calculation_service.berechne_gesamtdauer", boom)

    response = verarbeite_berechnungsanfrage(TEILZEIT_75_MIT_ABITUR)

    assert response.status_code == 500
    assert response.body["error"]["code"] == "internal_error"

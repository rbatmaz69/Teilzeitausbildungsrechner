"""Unit-Tests für die Service-Schicht der Berechnung."""

import pytest

from src.api.calculation_service import handle_calculation_request
from tests.dummy_data import (
    TEILZEIT_75_MIT_ABITUR,
    UNGUELTIG_TEILZEIT_UNTER_50,
)


def test_handle_calculation_success():
    response = handle_calculation_request(TEILZEIT_75_MIT_ABITUR)

    assert response.status_code == 200
    assert "result" in response.body
    result = response.body["result"]
    assert result["teilzeit_prozent"] == 75
    assert result["verkuerzung_gesamt_monate"] == 12


def test_handle_calculation_missing_fields_returns_400():
    response = handle_calculation_request({})

    assert response.status_code == 400
    assert response.body["error"]["code"] == "missing_fields"
    assert "missing" in response.body["error"]["details"]


def test_handle_calculation_invalid_input_type_returns_422():
    payload = dict(TEILZEIT_75_MIT_ABITUR)
    payload["input_type"] = "invalid"

    response = handle_calculation_request(payload)

    assert response.status_code == 422
    assert response.body["error"]["code"] == "invalid_input_type"


def test_handle_calculation_invalid_verkuerzungsgruende_type_returns_422():
    payload = dict(TEILZEIT_75_MIT_ABITUR)
    payload["verkuerzungsgruende"] = "not-a-dict"

    response = handle_calculation_request(payload)

    assert response.status_code == 422
    assert response.body["error"]["code"] == "validation_error"


def test_handle_calculation_logic_validation_error_returns_422():
    response = handle_calculation_request(UNGUELTIG_TEILZEIT_UNTER_50)

    assert response.status_code == 422
    assert response.body["error"]["code"] == "validation_error"


def test_handle_calculation_unexpected_error_returns_500(monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("unexpected")

    monkeypatch.setattr("src.api.calculation_service.calculate_gesamtdauer", boom)

    response = handle_calculation_request(TEILZEIT_75_MIT_ABITUR)

    assert response.status_code == 500
    assert response.body["error"]["code"] == "internal_error"


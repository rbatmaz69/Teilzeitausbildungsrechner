"""Unit-Tests für die Service-Schicht der Berechnung."""

import pytest

from src.api.calculation_service import verarbeite_berechnungsanfrage
from tests.dummy_data import (
    TEILZEIT_75_MIT_ABITUR,
    UNGUELTIG_TEILZEIT_UNTER_50,
)
import src.api.calculation_service as cs


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


def test_legacy_key_beruf_q5_wird_ignoriert():
    """Legacy-Key 'beruf_q5' wird ignoriert und löst keinen Fehler aus."""
    payload = dict(TEILZEIT_75_MIT_ABITUR)
    payload["verkuerzungsgruende"] = dict(payload["verkuerzungsgruende"])
    payload["verkuerzungsgruende"]["beruf_q5"] = True
    response = verarbeite_berechnungsanfrage(payload)
    assert response.status_code == 200
    assert "result" in response.body


def test_bool_typfehler_in_verkuerzungsgruende():
    """Ein bool-Feld mit falschem Typ (z.B. int statt bool) löst einen Fehler aus."""
    payload = dict(TEILZEIT_75_MIT_ABITUR)
    payload["verkuerzungsgruende"] = dict(payload["verkuerzungsgruende"])
    payload["verkuerzungsgruende"]["abitur"] = 1  # Muss bool sein
    response = verarbeite_berechnungsanfrage(payload)
    assert response.status_code == 422
    assert response.body["error"]["code"] == "validation_error"
    assert "abitur" in response.body["error"]["details"]["field"]


def test_invalid_float_string_in_vorkenntnisse():
    """Ungültiger Zahlenstring für vorkenntnisse_monate löst einen Fehler aus."""
    payload = dict(TEILZEIT_75_MIT_ABITUR)
    payload["verkuerzungsgruende"] = dict(payload["verkuerzungsgruende"])
    payload["verkuerzungsgruende"]["vorkenntnisse_monate"] = "abc"
    response = verarbeite_berechnungsanfrage(payload)
    assert response.status_code == 422
    assert response.body["error"]["code"] == "validation_error"
    assert "vorkenntnisse_monate" in response.body["error"]["details"]["field"]


def test_invalid_int_string_in_beruf_q2_dauer():
    """Ungültiger Zahlenstring für beruf_q2_dauer_monate löst einen Fehler aus."""
    payload = dict(TEILZEIT_75_MIT_ABITUR)
    payload["verkuerzungsgruende"] = dict(payload["verkuerzungsgruende"])
    payload["verkuerzungsgruende"]["beruf_q2_dauer_monate"] = "xyz"
    response = verarbeite_berechnungsanfrage(payload)
    assert response.status_code == 422
    assert response.body["error"]["code"] == "validation_error"
    assert "beruf_q2_dauer_monate" in response.body["error"]["details"]["field"]


def test_invalid_int_string_in_berufliche_verkuerzung_monate():
    """Ungültiger Zahlenstring für berufliche_verkuerzung_monate löst einen Fehler aus."""
    payload = dict(TEILZEIT_75_MIT_ABITUR)
    payload["verkuerzungsgruende"] = dict(payload["verkuerzungsgruende"])
    payload["verkuerzungsgruende"]["berufliche_verkuerzung_monate"] = "notanumber"
    response = verarbeite_berechnungsanfrage(payload)
    assert response.status_code == 422
    assert response.body["error"]["code"] == "validation_error"
    assert "berufliche_verkuerzung_monate" in response.body["error"]["details"]["field"]


def test_coerce_float_with_bool():
    """_coerce_float mit bool-Wert wirft NutzlastValidierungsFehler."""
    with pytest.raises(cs.NutzlastValidierungsFehler):
        cs._coerce_float(True, "testfeld")


def test_coerce_int_with_non_integer_float():
    """_coerce_int mit float, der keine Ganzzahl ist, wirft NutzlastValidierungsFehler."""
    with pytest.raises(cs.NutzlastValidierungsFehler):
        cs._coerce_int(3.14, "testfeld")


def test_benoetige_dictionary_with_list():
    """_benoetige_dictionary mit falschem Typ (Liste) wirft NutzlastValidierungsFehler."""
    with pytest.raises(cs.NutzlastValidierungsFehler):
        cs._benoetige_dictionary([1,2,3], "testfeld")


def test_normalisiere_verkuerzungsgruende_missing_optional():
    """_normalisiere_verkuerzungsgruende funktioniert mit fehlenden optionalen Feldern."""
    data = {"abitur": True, "realschule": False, "alter_ueber_21": False, "familien_pflegeverantwortung": False, "familien_kinderbetreuung": False}
    result = cs._normalisiere_verkuerzungsgruende(data)
    assert "beruf_q1" in result
    assert "beruf_q4" in result
    assert "vorkenntnisse_monate" in result


def test_nutzlast_validierungsfehler_custom_code_details():
    """NutzlastValidierungsFehler kann mit custom code und details erzeugt werden."""
    err = cs.NutzlastValidierungsFehler("msg", code="custom_code", details={"foo": "bar"})
    assert err.code == "custom_code"
    assert err.details == {"foo": "bar"}


    # Zusätzliche Tests für Coverage
    def test_unerlaubter_key_in_verkuerzungsgruende():
        """Ein unerlaubter Key in verkuerzungsgruende löst einen Fehler aus."""
        payload = dict(TEILZEIT_75_MIT_ABITUR)
        payload["verkuerzungsgruende"] = dict(payload["verkuerzungsgruende"])
        payload["verkuerzungsgruende"]["unbekannt"] = True
        response = verarbeite_berechnungsanfrage(payload)
        assert response.status_code == 422
        assert response.body["error"]["code"] == "validation_error"
        assert "unexpected" in response.body["error"]["details"]

    def test_deutsches_zahlenformat_in_vorkenntnisse():
        """Deutsches Zahlenformat ("1.234,5") wird korrekt geparst."""
        payload = dict(TEILZEIT_75_MIT_ABITUR)
        payload["verkuerzungsgruende"] = dict(payload["verkuerzungsgruende"])
        payload["verkuerzungsgruende"]["vorkenntnisse_monate"] = "1.234,0"
        response = verarbeite_berechnungsanfrage(payload)
        assert response.status_code == 200
        assert "result" in response.body

    def test_coerce_int_with_string_ganzzahl():
        """_coerce_int akzeptiert Ganzzahl-String."""
        assert cs._coerce_int("42", "testfeld") == 42
        assert cs._coerce_int("1.000", "testfeld") == 1000

    def test_coerce_int_with_string_keine_ganzzahl():
        """_coerce_int mit String, der keine Ganzzahl ist, wirft Fehler."""
        with pytest.raises(cs.NutzlastValidierungsFehler):
            cs._coerce_int("3,14", "testfeld")

    def test_normalize_numeric_string_varianten():
        """_normalize_numeric_string entfernt Leerzeichen, NBSP und wandelt Komma/Punkt."""
        assert cs._normalize_numeric_string(" 1.234,5 ") == "1234.5"
        assert cs._normalize_numeric_string("1 234,5") == "1234.5"
        assert cs._normalize_numeric_string("1\u00A0234,5") == "1234.5"
        assert cs._normalize_numeric_string("42") == "42"

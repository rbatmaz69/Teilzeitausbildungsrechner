"""Service-Schicht für die Berechnungs-API des Teilzeitrechners.

Dieses Modul kapselt Validierung, Fehlerbehandlung und den Aufbau der
Antwortdaten. Die Logik bleibt zentral, während die Transportschicht (Flask)
schlank und verlässlich für alle Konsumenten bleibt.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Dict, Mapping, Optional

from ..calculation_logic import berechne_gesamtdauer

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Datenmodelle
# ---------------------------------------------------------------------------


PFLICHTFELDER = (
    "basis_dauer_monate",
    "vollzeit_stunden",
    "teilzeit_eingabe",
    "eingabetyp",
    "verkuerzungsgruende",
)


@dataclass(frozen=True)
class BerechnungsAnfrage:
    """Streng typisierte Darstellung des Request-Payloads für Berechnungen."""

    basis_dauer_monate: int
    vollzeit_stunden: float
    teilzeit_eingabe: float
    eingabetyp: str
    verkuerzungsgruende: Dict[str, Any]

    @staticmethod
    def from_dict(payload: Mapping[str, Any]) -> "BerechnungsAnfrage":
        missing = [field for field in PFLICHTFELDER if field not in payload]
        if missing:
            raise FehlendeFelderFehler(missing)

        verkuerzungsgruende = _benoetige_dictionary(
            payload["verkuerzungsgruende"],
            "verkuerzungsgruende",
        )
        _validiere_verkuerzungsgruende(verkuerzungsgruende)
        verkuerzungsgruende = _normalisiere_verkuerzungsgruende(verkuerzungsgruende)

        eingabetyp = payload["eingabetyp"]
        if eingabetyp not in {"prozent", "stunden"}:
            raise NutzlastValidierungsFehler(
                "eingabetyp muss 'prozent' oder 'stunden' sein",
                code="ungültiger_eingabetyp",
            )

        return BerechnungsAnfrage(
            basis_dauer_monate=payload["basis_dauer_monate"],
            vollzeit_stunden=payload["vollzeit_stunden"],
            teilzeit_eingabe=payload["teilzeit_eingabe"],
            eingabetyp=eingabetyp,
            verkuerzungsgruende=verkuerzungsgruende,
        )


@dataclass(frozen=True)
class DienstFehler:
    """Repräsentiert einen Fehler, der für die API-Antwort serialisiert wird."""

    code: str
    message: str
    details: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        payload = {"code": self.code, "message": self.message}
        if self.details:
            payload["details"] = self.details
        return payload


@dataclass(frozen=True)
class BerechnungsDienstAntwort:
    """Container für das Zurückgeben der Ergebnisse an die Transportschicht."""

    status_code: int
    body: Dict[str, Any]


# ---------------------------------------------------------------------------
# Ausnahmen
# ---------------------------------------------------------------------------


class BerechnungsDienstFehler(Exception):
    """Basisklasse für Service-spezifische Ausnahmen."""


class FehlendeFelderFehler(BerechnungsDienstFehler):
    def __init__(self, missing: Any) -> None:
        self.missing = list(missing)
        message = f"Fehlende Felder: {', '.join(self.missing)}"
        super().__init__(message)


class NutzlastValidierungsFehler(BerechnungsDienstFehler):
    def __init__(
        self,
        message: str,
        *,
        code: str = "validation_error",
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.code = code
        self.details = details
        super().__init__(message)


# ---------------------------------------------------------------------------
# Öffentliche API
# ---------------------------------------------------------------------------


def verarbeite_berechnungsanfrage(
    payload: Mapping[str, Any],
) -> BerechnungsDienstAntwort:
    """Zentrale Einstiegsmethode für die Flask-Routen.

    Args:
        payload: Bereits geparstes JSON des Requests.

    Returns:
        BerechnungsDienstAntwort: Normalisierte Antwort mit Statuscode.
    """

    logger.info("Berechnungsanfrage eingegangen")

    try:
        request_model = BerechnungsAnfrage.from_dict(payload)
    except FehlendeFelderFehler as exc:
        logger.warning("missing_fields")
        error = DienstFehler(
            code="missing_fields",
            message=str(exc),
            details={"missing": exc.missing},
        )
        return BerechnungsDienstAntwort(
            status_code=400,
            body={"error": error.to_dict()},
        )
    except NutzlastValidierungsFehler as exc:
        logger.warning("validation_error:%s", exc.code or "validation_error")
        error = DienstFehler(
            code=exc.code,
            message=str(exc),
            details=exc.details,
        )
        return BerechnungsDienstAntwort(
            status_code=422,
            body={"error": error.to_dict()},
        )

    try:
        result = berechne_gesamtdauer(
            basis_dauer_monate=request_model.basis_dauer_monate,
            vollzeit_stunden=request_model.vollzeit_stunden,
            teilzeit_eingabe=request_model.teilzeit_eingabe,
            verkuerzungsgruende=request_model.verkuerzungsgruende,
            eingabetyp=request_model.eingabetyp,
        )
    except (TypeError, ValueError) as exc:
        logger.warning("validation_error")
        error = DienstFehler(code="validation_error", message=str(exc))
        return BerechnungsDienstAntwort(
            status_code=422,
            body={"error": error.to_dict()},
        )
    except Exception:  # pragma: no cover - Catch-All zur Sicherheit
        logger.exception(
            "Unerwarteter Fehler während berechne_gesamtdauer",
        )
        error = DienstFehler(
            code="internal_error",
            message="Unerwarteter Serverfehler",
        )
        return BerechnungsDienstAntwort(
            status_code=500,
            body={"error": error.to_dict()},
        )
    logger.info("Berechnung erfolgreich")
    return BerechnungsDienstAntwort(status_code=200, body={"result": result})


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------


def _benoetige_dictionary(value: Any, field_name: str) -> Dict[str, Any]:
    if not isinstance(value, Mapping):
        raise NutzlastValidierungsFehler(
            f"{field_name} muss ein Objekt sein",
            details={"field": field_name},
        )
    return dict(value)


def _validiere_verkuerzungsgruende(data: Mapping[str, Any]) -> None:
    allowed_keys = {
        "abitur",
        "realschule",
        "alter_ueber_21",
        "familien_kinderbetreuung",
        "familien_pflegeverantwortung",
        "vorkenntnisse_monate",
        "beruf_q1",
        "beruf_q2",
        "beruf_q2_dauer_monate",
        "beruf_q3",
        "beruf_q4",
        "beruf_q5",
        "beruf_q6",
        "berufliche_verkuerzung_monate",
    }
    unexpected_keys = sorted(set(data.keys()) - allowed_keys)
    if unexpected_keys:
        raise NutzlastValidierungsFehler(
            "Unbekannte Felder in verkuerzungsgruende",
            details={"field": "verkuerzungsgruende", "unexpected": unexpected_keys},
        )

    bool_keys = {
        "abitur",
        "realschule",
        "alter_ueber_21",
        "familien_kinderbetreuung",
        "familien_pflegeverantwortung",
        # berufliche Ja/Nein-Antworten
        "beruf_q1",
        "beruf_q2",
        "beruf_q3",
        "beruf_q4",
        "beruf_q5",
        "beruf_q6",
    }
    for key in bool_keys:
        value = data.get(key, False)
        if not isinstance(value, bool):
            raise NutzlastValidierungsFehler(
                f"{key} muss bool sein",
                details={"field": f"verkuerzungsgruende.{key}"},
            )

    if "vorkenntnisse_monate" in data:
        value = data["vorkenntnisse_monate"]
        if not isinstance(value, (int, float)):
            raise NutzlastValidierungsFehler(
                "vorkenntnisse_monate muss eine Zahl sein",
                details={"field": "verkuerzungsgruende.vorkenntnisse_monate"},
            )

    # beruf_q2_dauer_monate ist optional, muss aber eine Zahl sein, wenn vorhanden
    if "beruf_q2_dauer_monate" in data:
        value = data["beruf_q2_dauer_monate"]
        if not isinstance(value, (int, float)):
            raise NutzlastValidierungsFehler(
                "beruf_q2_dauer_monate muss eine Zahl sein",
                details={"field": "verkuerzungsgruende.beruf_q2_dauer_monate"},
            )

    # berufliche_verkuerzung_monate kann vom Client als Vorkalkulation geliefert werden
    if "berufliche_verkuerzung_monate" in data:
        value = data["berufliche_verkuerzung_monate"]
        if not isinstance(value, (int, float)):
            raise NutzlastValidierungsFehler(
                "berufliche_verkuerzung_monate muss eine Zahl sein",
                details={"field": "verkuerzungsgruende.berufliche_verkuerzung_monate"},
            )


def _normalisiere_verkuerzungsgruende(data: Mapping[str, Any]) -> Dict[str, Any]:
    # Berufserfahrung/Vorkenntnisse: Wenn > 0, wird auf festen 12-Monats-Wert abgebildet
    vorkenntnisse = data.get("vorkenntnisse_monate", 0)
    vorkenntnisse_monate = 12 if vorkenntnisse and vorkenntnisse > 0 else 0

    # Normalisiere die neuen beruflichen Felder (bools und Zahlen)
    beruf_q1 = bool(data.get("beruf_q1", False))
    beruf_q2 = bool(data.get("beruf_q2", False))
    beruf_q2_dauer = int(data.get("beruf_q2_dauer_monate", 0) or 0)
    beruf_q3 = bool(data.get("beruf_q3", False))
    beruf_q4 = bool(data.get("beruf_q4", False))
    beruf_q5 = bool(data.get("beruf_q5", False))
    beruf_q6 = bool(data.get("beruf_q6", False))
    wert = data.get("berufliche_verkuerzung_monate", 0) or 0
    berufliche_verkuerzung_monate = int(wert)

    return {
        "abitur": bool(data.get("abitur", False)),
        "realschule": bool(data.get("realschule", False)),
        "alter_ueber_21": bool(data.get("alter_ueber_21", False)),
        "familien_pflegeverantwortung": bool(
            data.get("familien_pflegeverantwortung", False)
        ),
        "familien_kinderbetreuung": bool(
            data.get("familien_kinderbetreuung", False)
        ),
        "vorkenntnisse_monate": vorkenntnisse_monate,
        # berufliche Fragen
        "beruf_q1": beruf_q1,
        "beruf_q2": beruf_q2,
        "beruf_q2_dauer_monate": beruf_q2_dauer,
        "beruf_q3": beruf_q3,
        "beruf_q4": beruf_q4,
        "beruf_q5": beruf_q5,
        "beruf_q6": beruf_q6,
        "berufliche_verkuerzung_monate": berufliche_verkuerzung_monate,
    }

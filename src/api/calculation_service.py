"""Service-Schicht für die Berechnungs-API des Teilzeitrechners.

Dieses Modul kapselt Validierung, Fehlerbehandlung und den Aufbau der
Antwortdaten. Die Logik bleibt zentral, während die Transportschicht (Flask)
schlank und verlässlich für alle Konsumenten bleibt.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Dict, Mapping, Optional

from ..calculation_logic import calculate_gesamtdauer

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Datenmodelle
# ---------------------------------------------------------------------------


REQUIRED_FIELDS = (
    "base_duration_months",
    "vollzeit_stunden",
    "teilzeit_input",
    "input_type",
    "verkuerzungsgruende",
)


@dataclass(frozen=True)
class CalculationRequest:
    """Streng typisierte Darstellung des Request-Payloads für Berechnungen."""

    base_duration_months: int
    vollzeit_stunden: float
    teilzeit_input: float
    input_type: str
    verkuerzungsgruende: Dict[str, Any]

    @staticmethod
    def from_dict(payload: Mapping[str, Any]) -> "CalculationRequest":
        missing = [field for field in REQUIRED_FIELDS if field not in payload]
        if missing:
            raise MissingFieldsError(missing)

        verkuerzungsgruende = _require_dict(
            payload["verkuerzungsgruende"],
            "verkuerzungsgruende",
        )
        _validate_verkuerzungsgruende(verkuerzungsgruende)
        verkuerzungsgruende = _normalise_verkuerzungsgruende(verkuerzungsgruende)

        input_type = payload["input_type"]
        if input_type not in {"prozent", "stunden"}:
            raise PayloadValidationError(
                "input_type muss 'prozent' oder 'stunden' sein",
                code="invalid_input_type",
            )

        return CalculationRequest(
            base_duration_months=payload["base_duration_months"],
            vollzeit_stunden=payload["vollzeit_stunden"],
            teilzeit_input=payload["teilzeit_input"],
            input_type=input_type,
            verkuerzungsgruende=verkuerzungsgruende,
        )


@dataclass(frozen=True)
class ServiceError:
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
class CalculationServiceResponse:
    """Container für das Zurückgeben der Ergebnisse an die Transportschicht."""

    status_code: int
    body: Dict[str, Any]


# ---------------------------------------------------------------------------
# Ausnahmen
# ---------------------------------------------------------------------------


class CalculationServiceError(Exception):
    """Basisklasse für Service-spezifische Ausnahmen."""


class MissingFieldsError(CalculationServiceError):
    def __init__(self, missing: Any) -> None:
        self.missing = list(missing)
        message = f"Fehlende Felder: {', '.join(self.missing)}"
        super().__init__(message)


class PayloadValidationError(CalculationServiceError):
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


def handle_calculation_request(payload: Mapping[str, Any]) -> CalculationServiceResponse:
    """Zentrale Einstiegsmethode für die Flask-Routen.

    Args:
        payload: Bereits geparstes JSON des Requests.

    Returns:
        CalculationServiceResponse: Normalisierte Antwort mit Statuscode.
    """

    try:
        request_model = CalculationRequest.from_dict(payload)
    except MissingFieldsError as exc:
        error = ServiceError(
            code="missing_fields",
            message=str(exc),
            details={"missing": exc.missing},
        )
        return CalculationServiceResponse(
            status_code=400,
            body={"error": error.to_dict()},
        )
    except PayloadValidationError as exc:
        error = ServiceError(
            code=exc.code,
            message=str(exc),
            details=exc.details,
        )
        return CalculationServiceResponse(
            status_code=422,
            body={"error": error.to_dict()},
        )

    try:
        result = calculate_gesamtdauer(
            base_duration_months=request_model.base_duration_months,
            vollzeit_stunden=request_model.vollzeit_stunden,
            teilzeit_input=request_model.teilzeit_input,
            verkuerzungsgruende=request_model.verkuerzungsgruende,
            input_type=request_model.input_type,
        )
    except (TypeError, ValueError) as exc:
        error = ServiceError(code="validation_error", message=str(exc))
        return CalculationServiceResponse(
            status_code=422,
            body={"error": error.to_dict()},
        )
    except Exception:  # pragma: no cover - Catch-All zur Sicherheit
        logger.exception(
            "Unerwarteter Fehler während calculate_gesamtdauer",
        )
        error = ServiceError(
            code="internal_error",
            message="Unerwarteter Serverfehler",
        )
        return CalculationServiceResponse(
            status_code=500,
            body={"error": error.to_dict()},
        )

    return CalculationServiceResponse(status_code=200, body={"result": result})


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------


def _require_dict(value: Any, field_name: str) -> Dict[str, Any]:
    if not isinstance(value, Mapping):
        raise PayloadValidationError(
            f"{field_name} muss ein Objekt sein",
            details={"field": field_name},
        )
    return dict(value)


def _validate_verkuerzungsgruende(data: Mapping[str, Any]) -> None:
    allowed_keys = {"abitur", "realschule", "alter_ueber_21", "vorkenntnisse_monate"}
    unexpected_keys = sorted(set(data.keys()) - allowed_keys)
    if unexpected_keys:
        raise PayloadValidationError(
            "Unbekannte Felder in verkuerzungsgruende",
            details={"field": "verkuerzungsgruende", "unexpected": unexpected_keys},
        )

    for key in {"abitur", "realschule", "alter_ueber_21"}:
        value = data.get(key, False)
        if not isinstance(value, bool):
            raise PayloadValidationError(
                f"{key} muss bool sein",
                details={"field": f"verkuerzungsgruende.{key}"},
            )

    if "vorkenntnisse_monate" in data:
        value = data["vorkenntnisse_monate"]
        if not isinstance(value, (int, float)):
            raise PayloadValidationError(
                "vorkenntnisse_monate muss eine Zahl sein",
                details={"field": "verkuerzungsgruende.vorkenntnisse_monate"},
            )


def _normalise_verkuerzungsgruende(data: Mapping[str, Any]) -> Dict[str, Any]:
    return {
        "abitur": bool(data.get("abitur", False)),
        "realschule": bool(data.get("realschule", False)),
        "alter_ueber_21": bool(data.get("alter_ueber_21", False)),
        "vorkenntnisse_monate": data.get("vorkenntnisse_monate", 0),
    }

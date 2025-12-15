"""Zentrale Logging-Konfiguration für das Projekt.

Ziele:
- Einheitliches Log-Format und -Level über alle Module
- Konfiguration über Umgebungsvariable ``LOG_LEVEL`` (INFO, WARNING, ERROR)
- Keine Duplikate in Tests (idempotente Initialisierung)
- Ausgabe auf STDOUT (containerfreundlich)

Hinweis: Wir konfigurieren den Paket-Logger ``src`` und vermeiden eine
Root-Logger-Neukonfiguration, um Konflikte mit Werkzeug/Gunicorn zu minimieren.
"""

from __future__ import annotations

import logging
import os
import sys
from typing import Optional

_LOGGING_CONFIGURED: bool = False


def _resolve_level(default: str = "INFO") -> int:
    level_name = os.getenv("LOG_LEVEL")
    if not level_name:
        # In Pytest standardmäßig weniger Lärm erzeugen
        level_name = "WARNING" if os.getenv("PYTEST_CURRENT_TEST") else default
    level_name = str(level_name).upper()
    return {
        "DEBUG": logging.DEBUG,
        "INFO": logging.INFO,
        "WARNING": logging.WARNING,
        "ERROR": logging.ERROR,
        "CRITICAL": logging.CRITICAL,
    }.get(level_name, logging.INFO)


def configure_logging(default_level: str = "INFO") -> None:
    """Initialisiert die Logging-Konfiguration idempotent.

    - Setzt einen einzelnen ``StreamHandler`` auf STDOUT am ``src``-Logger
    - Steuert das Level über ``LOG_LEVEL``
    - Verhindert Mehrfach-Handler in Testläufen
    """
    global _LOGGING_CONFIGURED
    if _LOGGING_CONFIGURED:
        return

    level = _resolve_level(default_level)

    # Paket-Logger für unser Projekt
    pkg_logger = logging.getLogger("src")
    pkg_logger.setLevel(level)

    # Prüfen, ob bereits ein geeigneter Handler existiert
    handler: Optional[logging.Handler] = None
    for h in pkg_logger.handlers:
        if isinstance(h, logging.StreamHandler):
            # Wir akzeptieren genau einen StreamHandler;
            # aktualisieren nur Level/Formatter
            handler = h
            break

    if handler is None:
        handler = logging.StreamHandler(stream=sys.stdout)
        pkg_logger.addHandler(handler)

    handler.setLevel(level)
    formatter = logging.Formatter(
        fmt="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    handler.setFormatter(formatter)

    # Nicht zum Root-Logger propagieren, um doppelte Ausgaben zu vermeiden
    pkg_logger.propagate = False

    _LOGGING_CONFIGURED = True

"""
Flask Web-Application für den Teilzeitrechner

Diese Datei implementiert User Story 31:
Verbindung zwischen Frontend und Backend.

Die Flask-App stellt folgende Funktionen bereit:
- Liefert die HTML-UI (index.html) aus
- Stellt eine REST-API für Berechnungen bereit (POST /api/calculate)
- Validierung der Eingabedaten
- Strukturierte Fehlerbehandlung
"""

import os
import sys
import time
from pathlib import Path

# Automatische venv-Aktivierung: Füge venv site-packages zum Python-Pfad hinzu
# Muss VOR den Imports passieren, damit Flask gefunden wird
project_root = Path(__file__).parent.parent
venv_path = project_root / "venv"

if venv_path.exists():
    # Finde site-packages in venv
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}"
    venv_site_packages = venv_path / "lib" / f"python{python_version}" / "site-packages"

    if venv_site_packages.exists():
        # Füge venv site-packages zum Python-Pfad hinzu
        if str(venv_site_packages) not in sys.path:
            sys.path.insert(0, str(venv_site_packages))

    # Setze VIRTUAL_ENV für Kompatibilität
    os.environ["VIRTUAL_ENV"] = str(venv_path)

from flask import Flask, g, jsonify, render_template, request  # noqa: E402

# Import der zentralen Berechnungslogik
# Diese enthält die komplette Implementierung gemäß BBiG § 7a und § 8
from .api import verarbeite_berechnungsanfrage  # noqa: E402
from .logging_config import configure_logging  # noqa: E402


def create_app() -> Flask:
    """
    Flask App-Factory Pattern

    Erstellt und konfiguriert die Flask-Applikation.
    Das Factory-Pattern ermöglicht:
    - Flexible Konfiguration für unterschiedliche Umgebungen
      (Development, Testing, Production)
    - Mehrfache App-Instanzen für Tests
    - Nachträgliche Konfiguration durch Flask-Erweiterungen

    Returns:
        Flask: Konfigurierte Flask-Applikation mit allen Routen
    """
    # Flask-App erstellen mit absoluten Pfaden zu Static Files und Templates
    # Dies funktioniert unabhängig vom aktuellen Arbeitsverzeichnis
    # Ermittelt das Projekt-Root-Verzeichnis (ein Level über src/)
    base_dir = Path(__file__).parent.parent
    # Zentrales Logging initialisieren (idempotent)
    configure_logging()

    app = Flask(
        __name__,
        static_folder=str(base_dir / "static"),      # JavaScript, CSS-Dateien
        template_folder=str(base_dir / "templates"),  # HTML-Templates
    )

    # Request-Lifecycle-Logging (PII-sicher)
    @app.before_request
    def _log_request_start():  # pragma: no cover - trivial
        """Speichert den Startzeitpunkt der Anfrage in `g._start_time`.

        Dient der Messung der Request-Dauer (Performance-Metriken). Es werden
        keine personenbezogenen Daten (PII) gespeichert.
        """
        # Nur Startzeit speichern, keine Request-Daten loggen
        g._start_time = time.perf_counter()

    @app.after_request
    def _log_request_end(response):  # pragma: no cover - trivial
        """Berechnet und protokolliert die Dauer der Anfrage sowie Methode/Pfad/Status.

        Protokolliert ausschließlich Metadaten (Methode, Pfad, Status, Dauer)
        und keine PII. Fehler im Logging dürfen den Responsefluss nicht stören.
        """
        try:
            start = getattr(g, "_start_time", None)
            duration_ms = None
            if start is not None:
                duration_ms = int((time.perf_counter() - start) * 1000)

            import logging as _logging

            logger = _logging.getLogger("src.app")
            # Nur Methode, Pfad, Status und Dauer loggen (keine PII)
            if duration_ms is None:
                logger.info(
                    "%s %s -> %s",
                    request.method,
                    request.path,
                    response.status_code,
                )
            else:
                logger.info(
                    "%s %s -> %s (%dms)",
                    request.method,
                    request.path,
                    response.status_code,
                    duration_ms,
                )
        except Exception:
            # Logging darf nie den Responsefluss stören
            pass
        return response

    @app.get("/")
    def index():
        """
        Hauptroute: Liefert die HTML-Startseite aus

        Diese Route rendert das index.html Template, welches die
        komplette Benutzeroberfläche enthält
        (Eingabefelder, Verkürzungsgründe, Ergebnisanzeige).

        Returns:
            str: Gerendertes HTML-Template
        """
        return render_template("index.html")

    @app.post("/api/calculate")
    def api_calculate():
        """
        API-Endpoint: Berechnung der Teilzeitausbildungsdauer

        Empfängt JSON-Daten vom Frontend, validiert diese und führt die
        Berechnung über calculate_gesamtdauer() durch.

        Request Body (JSON):
            {
                "basis_dauer_monate": int,        # Reguläre Ausbildungsdauer (AO)
                "vollzeit_stunden": float,        # Wochenstunden bei Vollzeit
                "teilzeit_eingabe": float,        # Teilzeit als % oder Stunden
                "eingabetyp": str,                # "prozent" oder "stunden"
                "verkuerzungsgruende": {
                    "abitur": bool,
                    "realschule": bool,
                    "alter_ueber_21": bool,
                    "vorkenntnisse_monate": int   # 0, 6-12
                }
            }

        Responses:
            200 OK: Berechnung erfolgreich
            400 Bad Request: Ungültige Request-Struktur oder fehlende Felder
            422 Unprocessable Entity: Validierungsfehler
            (z.B. Teilzeit < 50%)
            500 Internal Server Error: Unerwarteter Serverfehler
        """
        # ============================================================
        # SCHRITT 1: Content-Type Validierung
        # ============================================================
        # Prüfen, ob der Request wirklich JSON enthält
        # Frontend sollte "Content-Type: application/json" senden
        if not request.is_json:
            return (
                jsonify({
                    "error": {
                        "code": "invalid_request",
                        "message": (
                            "Erwarte application/json im Request-Body"
                        ),
                    }
                }),
                400,
            )

        # JSON-Daten extrahieren
        # force=True: ignoriert Content-Type, wenn JSON erkannt wird
        # silent=True: gibt None statt Exception bei Parse-Fehler
        # or {}: Fallback auf leeres Dict, falls Parsing fehlschlägt
        data = request.get_json(force=True, silent=True) or {}

        # ============================================================
        # SCHRITT 2: Service-Layer Aufruf
        # ============================================================
        response = verarbeite_berechnungsanfrage(data)

        return jsonify(response.body), response.status_code

    return app


# ============================================================
# Exportiere das Flask-App-Objekt für Tests und WSGI
# ============================================================
app = create_app()

# Lokaler Entwicklungsstart
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    try:
        app.run(host=host, port=port, debug=True)
    except OSError:
        fallback_port = port + 1
        print(f"⚠️  Port {port} ist belegt, verwende Port {fallback_port}")
        app.run(host=host, port=fallback_port, debug=True)

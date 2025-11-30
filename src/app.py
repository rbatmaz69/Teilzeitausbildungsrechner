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

from flask import Flask, jsonify, render_template, request  # noqa: E402

# Import der zentralen Berechnungslogik
# Diese enthält die komplette Implementierung gemäß BBiG § 7a und § 8
from .api import verarbeite_berechnungsanfrage  # noqa: E402


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
    app = Flask(
        __name__,
        static_folder=str(base_dir / "static"),      # JavaScript, CSS-Dateien
        template_folder=str(base_dir / "templates"),  # HTML-Templates
    )

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
# Lokaler Entwicklungsstart
# ============================================================
# Wenn diese Datei direkt ausgeführt wird (nicht importiert),
# startet der Flask-Entwicklungsserver
#
# Verwendung:
#   python -m src.app
#   oder
#   python src/app.py
#
# Der Development-Server läuft dann auf http://localhost:8000/
# Falls Port 8000 belegt ist, wird automatisch ein anderer Port verwendet
# debug=True aktiviert automatisches Neuladen bei Code-Änderungen
if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 8000))

    # Für Handy-Testing: HOST auf 0.0.0.0 setzen (von außen erreichbar)
    # Später einfach diese Zeile entfernen oder HOST=127.0.0.1 setzen
    host = os.getenv("HOST", "0.0.0.0")  # 0.0.0.0 = von außen erreichbar

    # Prüfe ob Port bereits belegt ist (z.B. AirPlay auf macOS)
    # Falls ja, versuche alternativen Port
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass

    try:
        app.run(host=host, port=port, debug=True)
    except OSError:
        # Port belegt, versuche alternativen Port
        fallback_port = port + 1
        print(f"⚠️  Port {port} ist belegt, verwende Port {fallback_port}")
        app.run(host=host, port=fallback_port, debug=True)

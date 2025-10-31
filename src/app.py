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

from flask import Flask, jsonify, render_template, request

# Import der zentralen Berechnungslogik
# Diese enthält die komplette Implementierung gemäß BBiG § 7a und § 8
from .calculation_logic import calculate_gesamtdauer


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
    # Flask-App erstellen mit relativen Pfaden zu Static Files und Templates
    # Da src/app.py in einem Unterverzeichnis liegt,
    # müssen wir einen Level nach oben gehen
    app = Flask(
        __name__,
        static_folder="../static",      # JavaScript, CSS-Dateien
        template_folder="../templates",  # HTML-Templates
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
                "base_duration_months": int,      # Reguläre Ausbildungsdauer (AO)
                "vollzeit_stunden": float,        # Wochenstunden bei Vollzeit
                "teilzeit_input": float,          # Teilzeit als % oder Stunden
                "input_type": str,                # "prozent" oder "stunden"
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
        # SCHRITT 2: Pflichtfelder-Validierung
        # ============================================================
        # Liste aller Felder, die für die Berechnung
        # zwingend erforderlich sind
        required = [
            "base_duration_months",    # Ausbildungsdauer gemäß AO
            "vollzeit_stunden",        # Wochenstunden bei Vollzeit
            "teilzeit_input",          # Teilzeit-Eingabe (Prozent/Stunden)
            "input_type",              # Ob teilzeit_input als % oder h
                                       # interpretiert wird
            "verkuerzungsgruende",     # Dictionary mit Verkürzungsgründen
        ]

        # Prüfen, welche Pflichtfelder fehlen
        missing = [k for k in required if k not in data]
        if missing:
            # Strukturierte Fehlerantwort mit Details über fehlende Felder
            # Dies hilft dem Frontend, dem Benutzer gezielt zu sagen,
            # was fehlt
            return (
                jsonify({
                    "error": {
                        "code": "missing_fields",
                        "message": f"Fehlende Felder: {', '.join(missing)}",
                        "details": {"missing": missing},
                    }
                }),
                400,
            )

        # ============================================================
        # SCHRITT 3: Berechnung durchführen
        # ============================================================
        try:
            # Aufruf der zentralen Berechnungslogik
            # Diese Funktion führt das komplette 4-Schritt-Verfahren durch:
            # 1. Verkürzung anwenden (gemäß § 8 BBiG)
            # 2. Automatische Verlängerung durch Teilzeit
            #    (gemäß § 7a Abs. 2 BBiG)
            # 3. Gesetzliche Obergrenze prüfen (max. 1,5-fache AO-Dauer)
            # 4. Auf ganze Monate abrunden
            result = calculate_gesamtdauer(
                base_duration_months=data["base_duration_months"],
                vollzeit_stunden=data["vollzeit_stunden"],
                teilzeit_input=data["teilzeit_input"],
                verkuerzungsgruende=data["verkuerzungsgruende"],
                input_type=data.get("input_type", "prozent"),  # Default: %
            )

            # Erfolgreiche Antwort mit allen Berechnungsergebnissen
            # Das Frontend kann diese direkt zur Anzeige verwenden
            return jsonify({"result": result}), 200

        # ============================================================
        # SCHRITT 4: Fehlerbehandlung
        # ============================================================
        except (TypeError, ValueError) as e:
            # Typ- oder Validierungsfehler aus der Berechnungslogik
            # Beispiele:
            # - Teilzeit < 50% (gemäß § 7a Abs. 1 Satz 3 BBiG)
            # - Ungültige Datentypen (z.B. String statt Zahl)
            # - Logische Fehler (z.B. Stunden > Vollzeitstunden)
            # HTTP 422 = Unprocessable Entity:
            # Request ist syntaktisch korrekt, aber semantisch ungültig
            return (
                jsonify({
                    "error": {
                        "code": "validation_error",
                        "message": str(e),  # Fehlermeldung aus
                        # calculation_logic.py
                    }
                }),
                422,
            )
        except Exception:
            # Unerwarteter Fehler (z.B. interne Logik-Fehler,
            # Datenbank-Fehler)
            # WICHTIG: Keine Details zurückgeben aus Sicherheitsgründen!
            # Ein Angreifer könnte sonst Rückschlüsse auf die
            # Server-Struktur ziehen.
            # Die detaillierte Fehlermeldung wird serverseitig geloggt
            # (nicht hier implementiert).
            # HTTP 500 = Internal Server Error
            return (
                jsonify({
                    "error": {
                        "code": "internal_error",
                        "message": "Unerwarteter Serverfehler",
                    }
                }),
                500,
            )

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
# Der Development-Server läuft dann auf http://localhost:5000/
# debug=True aktiviert automatisches Neuladen bei Code-Änderungen
if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)


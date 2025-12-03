# API-Referenz

Automatisch generiert aus den Docstrings der Python-Module.

## Berechnungslogik
Zentrale Berechnungslogik für den Teilzeitrechner

Implementiert die gesetzlichen Vorgaben gemäß:
- § 7a BBiG (Teilzeitberufsausbildung)
- § 8 BBiG (Verkürzung und Verlängerung der Ausbildungsdauer)

Basierend auf der Empfehlung des Hauptausschusses des Bundesinstituts
für Berufsbildung vom 10. Juni 2021
### berechne_gesamtdauer(basis_dauer_monate, vollzeit_stunden, teilzeit_eingabe, verkuerzungsgruende, eingabetyp='prozent')

Hauptfunktion: Berechnet die Gesamtdauer der Teilzeitausbildung

Führt das komplette 4-Schritt-Verfahren durch:
1. Verkürzung anwenden
2. Automatische Verlängerung durch Teilzeit (Schritt 1)
3. Gesetzliche Obergrenze prüfen (Schritt 2)
4. Auf ganze Monate abrunden (Schritt 3)

Schritt 4 (Verlängerung bis zur nächsten Prüfung) ist optional und
wird hier nicht implementiert, da er von konkreten Prüfungsterminen abhängt.

Args:
    basis_dauer_monate (int): Reguläre Ausbildungsdauer in Monaten (gemäß AO)
    vollzeit_stunden (float): Wochenstunden bei Vollzeit
    teilzeit_eingabe (float): Teilzeit-Eingabe (Prozentsatz ODER Stunden)
    verkuerzungsgruende (dict): Dictionary mit Verkürzungsgründen
    eingabetyp (str): 'prozent' oder 'stunden' - Art der Teilzeit-Eingabe

Returns:
    dict: Alle Berechnungsergebnisse mit folgenden Keys:
        - 'original_dauer_monate': Original AO-Dauer
        - 'verkuerzte_dauer_monate': Dauer nach Verkürzung
        - 'teilzeit_prozent': Vereinbarter Teilzeit-Prozentsatz
        - 'teilzeit_stunden': Vereinbarte Teilzeitstunden
        - 'nach_schritt1_monate': Nach automatischer Verlängerung
        - 'nach_schritt2_monate': Nach Anwendung der Obergrenze
        - 'finale_dauer_monate': Finale Dauer (nach Abrundung)
        - 'finale_dauer_jahre': Finale Dauer in Jahren (gerundet auf 1 Dezimale)
        - 'wochenstunden': Tatsächliche Wochenstunden
        - 'verkuerzung_gesamt_monate': Gesamte Verkürzung in Monaten
        - 'verlaengerung_durch_teilzeit_monate': Verlängerung durch Teilzeit

Beispiel:
    >>> # Mit Prozentsatz
    >>> ergebnis = berechne_gesamtdauer(
    ...     basis_dauer_monate=36,
    ...     vollzeit_stunden=40,
    ...     teilzeit_eingabe=75,
    ...     verkuerzungsgruende={'abitur': True, 'realschule': False,
    ...                          'alter_ueber_21': False,
    ...                          'vorkenntnisse_monate': 0},
    ...     eingabetyp='prozent'
    ... )

    >>> # Mit Stunden
    >>> ergebnis = berechne_gesamtdauer(
    ...     basis_dauer_monate=36,
    ...     vollzeit_stunden=40,
    ...     teilzeit_eingabe=30,
    ...     verkuerzungsgruende={'abitur': True, 'realschule': False,
    ...                          'alter_ueber_21': False,
    ...                          'vorkenntnisse_monate': 0},
    ...     eingabetyp='stunden'
    ... )

### berechne_teilzeit_prozent(vollzeit_stunden, teilzeit_stunden)

Berechnet den Teilzeit-Prozentsatz basierend auf Vollzeit- und Teilzeitstunden

Args:
    vollzeit_stunden (float): Wochenstunden bei Vollzeit
    teilzeit_stunden (float): Gewünschte Wochenstunden bei Teilzeit

Returns:
    float: Teilzeit-Prozentsatz (50.0-100.0)

Beispiel:
    >>> berechne_teilzeit_prozent(40, 30)
    75.0
    >>> berechne_teilzeit_prozent(40, 20)
    50.0

### berechne_teilzeit_schritt1(verkuerzte_dauer_monate, teilzeit_prozent)

Schritt 1: Berechnet die automatische Verlängerung durch Teilzeit

Gemäß § 7a Abs. 2 Satz 1 BBiG: "verlängert sich entsprechend"
Die Ausbildungszeit bleibt gleich, aber die kalendarische Dauer verlängert sich.

Formel: Verkürzte Dauer in Monaten / (Teilzeit-Prozent / 100)

Beispiel aus der Empfehlung (Seite 2):
- AO-Dauer: 36 Monate, Teilzeit 75%
- Berechnung: 36 / 0,75 = 48 Monate

Args:
    verkuerzte_dauer_monate (int): Verkürzte Ausbildungsdauer in Monaten
    teilzeit_prozent (int): Prozentsatz der Teilzeit (50-100)

Returns:
    float: Verlängerte Ausbildungsdauer in Monaten (wird später gerundet)

Beispiel:
    >>> berechne_teilzeit_schritt1(36, 75)
    48.0
    >>> berechne_teilzeit_schritt1(24, 50)
    48.0

### berechne_teilzeit_stunden(vollzeit_stunden, teilzeit_prozent)

Berechnet die Teilzeitstunden basierend auf Vollzeitstunden und Prozentsatz

Args:
    vollzeit_stunden (float): Wochenstunden bei Vollzeit
    teilzeit_prozent (float): Teilzeit-Prozentsatz (50.0-100.0)

Returns:
    float: Berechnete Teilzeitstunden

Beispiel:
    >>> berechne_teilzeit_stunden(40, 75.0)
    30.0
    >>> berechne_teilzeit_stunden(40, 50.0)
    20.0

### berechne_verkuerzung(basis_dauer_monate, verkuerzungsgruende)

Berechnet die Gesamtverkürzung der Ausbildungsdauer basierend auf
verschiedenen Verkürzungsgründen gemäß § 8 BBiG.

Diese Verkürzung wird VOR der Teilzeit-Verlängerung angewendet.
Siehe Abschnitt 5.2.2 der Empfehlung.

Args:
    basis_dauer_monate (int): Reguläre Ausbildungsdauer in Monaten (gemäß AO)
    verkuerzungsgruende (dict): Dictionary mit Verkürzungsgründen:
        - 'abitur' (bool): Hat Abitur/Hochschulreife
        - 'realschule' (bool): Hat Realschulabschluss/Fachoberschulreife
        - 'alter_ueber_21' (bool): Ist über 21 Jahre alt
        - 'familien_pflegeverantwortung' (bool): Hat Familien- oder
          Pflegeverantwortung
        - 'vorkenntnisse_monate' (int): Berufliche Vorkenntnisse,
          wird auf einen festen Wert von 12 Monaten abgebildet, sobald > 0

Returns:
    int: Verkürzte Ausbildungsdauer in Monaten

Beispiel:
    >>> berechne_verkuerzung(36, {'abitur': True, 'realschule': False,
    ...      'alter_ueber_21': False, 'vorkenntnisse_monate': 0})
    24  # 36 - 12 = 24 Monate

### formatiere_ergebnis(ergebnis)

Formatiert das Ergebnis der Berechnung für eine lesbare Ausgabe

Args:
    ergebnis (dict): Ergebnis von berechne_gesamtdauer()

Returns:
    str: Formatierte Ausgabe

### obergrenze_anwenden_schritt2(verlaengerte_dauer_monate: float, original_ao_dauer_monate: int) -> int

Schritt 2: Wendet die gesetzliche Obergrenze an

Gemäß § 7a Abs. 2 Satz 1 BBiG: "höchstens jedoch bis zum Eineinhalbfachen
der in der Ausbildungsordnung genannten Ausbildungsdauer"

Die Dauer der Teilzeitausbildung darf das 1,5-fache der ursprünglichen
AO-Dauer nicht überschreiten.

Beispiel aus der Empfehlung (Seite 3):
- AO-Dauer: 36 Monate, Teilzeit 50%
- Nach Schritt 1: 72 Monate
- Obergrenze: 36 * 1,5 = 54 Monate
- Ergebnis: 54 Monate (begrenzt durch Obergrenze)

Args:
    verlaengerte_dauer_monate (float): Dauer nach automatischer Verlängerung
    original_ao_dauer_monate (int): Original-Ausbildungsdauer gemäß AO

Returns:
    float: Begrenzte Ausbildungsdauer in Monaten

Beispiel:
    >>> obergrenze_anwenden_schritt2(72, 36)
    54.0
    >>> obergrenze_anwenden_schritt2(48, 36)
    48.0

### rundung_anwenden_schritt3(dauer_monate: float) -> int

Schritt 3: Rundet auf ganze Monate ab

Gemäß § 7a Abs. 2 Satz 2 BBiG: "Ist eine Verkürzung der kalendermäßigen
Ausbildungsdauer nicht ganzzahlig, ist auf ganze Monate abzurunden."

Beispiel aus der Empfehlung (Seite 4):
- AO-Dauer: 36 Monate, Teilzeit 70%
- Berechnung: 36 / 0,70 = 51,4 Monate
- Nach Abrundung: 51 Monate

Args:
    dauer_monate (float): Ausbildungsdauer in Monaten (kann Nachkommastellen haben)

Returns:
    int: Abgerundete Ausbildungsdauer in ganzen Monaten

Beispiel:
    >>> rundung_anwenden_schritt3(51.4)
    51
    >>> rundung_anwenden_schritt3(48.0)
    48

## Service Layer
Service-Schicht für die Berechnungs-API des Teilzeitrechners.

Dieses Modul kapselt Validierung, Fehlerbehandlung und den Aufbau der
Antwortdaten. Die Logik bleibt zentral, während die Transportschicht (Flask)
schlank und verlässlich für alle Konsumenten bleibt.
### BerechnungsAnfrage

Streng typisierte Darstellung des Request-Payloads für Berechnungen.

### BerechnungsDienstAntwort

Container für das Zurückgeben der Ergebnisse an die Transportschicht.

### BerechnungsDienstFehler

Basisklasse für Service-spezifische Ausnahmen.

### DienstFehler

Repräsentiert einen Fehler, der für die API-Antwort serialisiert wird.

### FehlendeFelderFehler

Basisklasse für Service-spezifische Ausnahmen.

### NutzlastValidierungsFehler

Basisklasse für Service-spezifische Ausnahmen.

### verarbeite_berechnungsanfrage(payload: 'Mapping[str, Any]') -> 'BerechnungsDienstAntwort'

Zentrale Einstiegsmethode für die Flask-Routen.

Args:
    payload: Bereits geparstes JSON des Requests.

Returns:
    BerechnungsDienstAntwort: Normalisierte Antwort mit Statuscode.

## Flask App
Flask Web-Application für den Teilzeitrechner

Diese Datei implementiert User Story 31:
Verbindung zwischen Frontend und Backend.

Die Flask-App stellt folgende Funktionen bereit:
- Liefert die HTML-UI (index.html) aus
- Stellt eine REST-API für Berechnungen bereit (POST /api/calculate)
- Validierung der Eingabedaten
- Strukturierte Fehlerbehandlung
### create_app() -> flask.app.Flask

Flask App-Factory Pattern

Erstellt und konfiguriert die Flask-Applikation.
Das Factory-Pattern ermöglicht:
- Flexible Konfiguration für unterschiedliche Umgebungen
  (Development, Testing, Production)
- Mehrfache App-Instanzen für Tests
- Nachträgliche Konfiguration durch Flask-Erweiterungen

Returns:
    Flask: Konfigurierte Flask-Applikation mit allen Routen

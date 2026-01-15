# Teilzeitrechner - Group 04

> ✅ **Projekt abgeschlossen** – Meilenstein 3 ist abgeschlossen, das Projekt ist fertig und produktionsbereit.

Ein Python-basierter Rechner für Teilzeitberufsausbildungen gemäß BBiG § 7a und § 8.

## 📋 Überblick

Dieses Projekt implementiert die gesetzlichen Vorgaben für Teilzeitberufsausbildungen basierend auf der Empfehlung des Hauptausschusses des Bundesinstituts für Berufsbildung vom 10. Juni 2021.

## 🏗️ Architekturüberblick

Der Teilzeitrechner ist als klassische Drei-Schichten-Anwendung aufgebaut:

- **Frontend (Static Assets in `static/` + Templates in `templates/`)**  
  Eine schlanke HTML-Oberfläche (`templates/index.html`) liefert die Eingabe- und Ausgabemasken.  
  JavaScript-Module (`static/script_eingabe.js`, `static/script_Verkuerzungsgruende_Auswaehlen.js`, `static/script_Ergebnis_Uebersicht.js`, `static/script_Sprache_Auswaehlen.js`) übernehmen Formularvalidierung, Mehrsprachigkeit und die Kommunikation mit der API.

- **Service-/API-Schicht (`src/api/`)**  
  `src/api/calculation_service.py` kapselt Request-Validierung, Fehlercodes und die Ankopplung an die Berechnungslogik. Über `src/api/__init__.py` wird eine stabile öffentliche Schnittstelle (`verarbeite_berechnungsanfrage`) bereitgestellt, die von der Flask-App konsumiert wird.

- **Berechnungslogik (`src/calculation_logic.py`)**  
  Enthält das fachliche Herzstück mit den vier Berechnungsschritten (Verkürzung, automatische Verlängerung, gesetzliche Obergrenze, Rundung) sowie Helfern für Stunden-/Prozent-Umrechnungen. Die Funktionen sind so dokumentiert, dass sie auch unabhängig vom Web-Layer test- und nachvollziehbar bleiben.

Die Schichten werden über die Flask-App (`src/app.py`) verdrahtet. `create_app()` registriert zwei Routen:
1. `GET /` liefert die Benutzeroberfläche
2. `POST /api/calculate` verarbeitet Berechnungsanfragen, ruft den Service-Layer auf und liefert strukturierte Ergebnisse zurück

Tests im Ordner `tests/` decken jede Schicht ab (Unit-Tests für Logik und Service, Integrationstests für die API). Dummy-Daten für manuelle Tests stehen in `tests/dummy_data.py` bereit.



### ✨ Features

- **Vollständige Berechnungslogik** für Teilzeitausbildungen nach BBiG § 7a und § 8
- **Verkürzungsgründe**: Abitur, Realschule, Alter, Vorkenntnisse, Familien- und Pflegeverantwortung, berufliche Gründe
- **Flexible Eingabe**: Prozent oder Stunden, automatische Umrechnung
- **4-Schritt-Verfahren**: Verkürzung → Verlängerung → Obergrenze → Rundung
- **Umfassende Tests**: Realistische Szenarien, Unit-, Service- und API-Tests, E2E-Tests
- **Ausführliche Dokumentation**: BBiG-Verweise, Docstrings, API-Referenz
- **Mehrsprachigkeit**: UI und Ergebnis in 10 Sprachen (Deutsch, Englisch, Arabisch, Französisch, Polnisch, Rumänisch, Russisch, Türkisch, Ukrainisch, weitere möglich)
- **PDF-Export**: Ergebnis und Berechnungsdetails als PDF herunterladen
- **Link-Sharing**: Berechnungsergebnis als Link teilen
- **Barrierefreiheits-Button**: Umschalten auf Leichte Sprache, Farbmodus (Darkmode, Hell, Auto)
- **Vorlesefunktion**: Ergebnis und Hinweise werden vorgelesen (Screenreader-kompatibel)
- **Schriftgrößenanpassung**: Schriftgröße individuell vergrößern und verkleinern
- **Responsive Design**: Optimiert für Desktop und Mobile, inkl. Touch-Unterstützung

## 🚀 Installation

### Voraussetzungen
- Python 3.12+ (empfohlen) — das Backend‑Docker‑Image basiert auf `python:3.12-slim`
- Node.js 18+ (nur für Linter / Playwright Tooling)
- Python‑Dependencies in `requirements.txt`
- Node‑Dependencies in `package.json` (nur für Linting / Playwright)

### Setup
```bash
# Repository klonen
git clone https://git.it.hs-heilbronn.de/it/courses/seb/lab/ws25/group-04.git
cd group-04
# Python-Abhängigkeiten installieren
pip install -r requirements.txt
# Die Pipeline installiert diese automatisch - dieses Setup ist nur für lokale Entwicklung
npm install
```

### App lokal starten
Hinweis: Die Anwendung kann lokal auf zwei Ports laufen, je nach Startmethode:

- Development server (empfohlen für Entwicklung): `PORT=8000` (Default). Beispiel (PowerShell):
```powershell
python -m src.app
# oder: python -m src.app 8001  # Port als CLI-Argument
```

- Playwright (E2E Tests) startet in der Testkonfiguration einen temporären Server auf Port `8000`. Sie können Playwright‑Tests mit `npm run test:e2e` starten; der Test‑Runner startet oder verbindet sich zu `http://localhost:8000` (siehe `playwright.config.js`).

- Docker: `docker-compose.yaml` mappt Host‑Port `8000` auf Container‑Port `8000` (siehe Docker‑Abschnitt). Nach `docker compose up` ist die App unter `http://localhost:8000/` erreichbar.

Wenn Port `8000` belegt ist, versucht der Dev‑Server automatisch einen Fallback‑Port.

## 🐳 Docker

Das Projekt enthält ein Docker‑Setup für das Backend (`Dockerfile.backend`) und eine `docker-compose.yaml` mit dem Service `backend`. Das Backend läuft im Container auf Port `8000` und ist auf Host‑Port `8000` gemappt.

Wichtige Befehle:

```powershell
# Image bauen (via docker compose)
docker compose build backend

# Backend im Hintergrund starten
docker compose up -d

# Logs ansehen
docker compose logs -f backend

# Neu bauen und neu starten
docker compose up -d --build

# Stoppen und aufräumen
docker compose down
```

## 🐙 Docker Hub Image

Das Projekt wird automatisch als Multi-Platform Docker-Image auf Docker Hub unter `jkeller5/group04-tzr` veröffentlicht.

**Unterstützte Plattformen:**
- `linux/amd64` - Intel/AMD-Prozessoren (Standard Server, Desktop)
- `linux/arm64` - Apple Silicon (M1/M2/M3/M4), AWS Graviton, ARM-Server

Die CI/CD-Pipeline baut beide Architekturen parallel und pusht sie als ein einziges Image-Tag. Docker wählt automatisch die passende Plattform beim Pull.

Einfachste Nutzung (empfohlen):
```bash
# Startet das Image (Docker zieht automatisch `latest`, wenn lokal nicht vorhanden)
docker run -d --name tzr -p 8000:8000 jkeller5/group04-tzr

# Backend stoppen und Container entfernen
docker stop tzr
docker rm tzr
```

Nur das Image von Docker Hub ziehen:
```bash
docker pull jkeller5/group04-tzr
```

Ein bereits gezogenes Image mit Docker Desktop starten:

- In der Docker Desktop App, wähle das gezogene Image `jkeller5/group04-tzr` und starte einen neuen Container.
- In den optionalen Start‑Einstellungen das Port‑Mapping auf `8000:8000` setzen, damit die App unter `http://localhost:8000/` erreichbar ist.

Weitere Hinweise:
- Das Image enthält das komplette Backend (Flask, Abhängigkeiten) und die statischen Assets — es ist startbereit.
- Gezogene Images werden im lokalen Docker‑Daemon gespeichert.

## 💻 Verwendung

### Web-UI + API

API-Endpoint:

```
POST /api/calculate
Content-Type: application/json

{
  "basis_dauer_monate": 36,
  "vollzeit_stunden": 40,
  "teilzeit_eingabe": 75,
  "eingabetyp": "prozent",           # oder "stunden"
  "verkuerzungsgruende": {
    "abitur": true,
    "realschule": false,
    "alter_ueber_21": false,
    "familien_pflegeverantwortung": false,
    "familien_kinderbetreuung": false,
    # berufliche Fragen (neue, granularere Felder)
    "beruf_q1": false,
    "beruf_q2": false,
    "beruf_q2_dauer_monate": 0,
    "beruf_q3": false,
    "beruf_q4": false,
    # optional: bereits vorab berechneter Gesamtwert
    "berufliche_verkuerzung_monate": 0
  }
}
```

Wichtig — Pflichtfelder in `verkuerzungsgruende`:

- Alle Ja/Nein‑Felder (bool) müssen vom Client explizit angegeben werden; sie sind Pflichtfelder:
  - `abitur`, `realschule`, `alter_ueber_21`,
  - `familien_kinderbetreuung`, `familien_pflegeverantwortung`,
  - `beruf_q1`, `beruf_q2`, `beruf_q3`, `beruf_q4`

- Zahlenfelder (als Werte oder 0) — sollten ebenfalls explizit übergeben werden, wenn relevant:
  - `beruf_q2_dauer_monate`, `berufliche_verkuerzung_monate`



Hinweis: Die Service‑Validierung akzeptiert fehlende Felder und füllt intern fehlende bools standardmäßig mit `false`, trotzdem ist es aus Kompatibilitäts‑ und Prüfungsgründen wichtig, dass Clients die oben genannten Ja/Nein‑Felder immer explizit mitsenden (mit `true` oder `false`).

Antwort (200):

```
{
  "result": {
    "original_dauer_monate": 36,
    "verkuerzte_dauer_monate": 24,
    "teilzeit_prozent": 75,
    "teilzeit_stunden": 30.0,
    "nach_schritt1_monate": 32.0,
    "nach_schritt2_monate": 32.0,
    "finale_dauer_monate": 32,
    "finale_dauer_jahre": 2.7,
    "wochenstunden": 30.0,
    "verkuerzung_gesamt_monate": 12,
    "verlaengerung_durch_teilzeit_monate": 8,
    # zusätzliche Felder, die die Logik zurückliefert
    "verkuerzung_gesamt_ohne_begrenzung": 14,
    "regel_8_abs_3_angewendet": false
  }
}
```

Fehler (400/422/500):

```
{ "error": { "code": "...", "message": "...", "details": { } } }
```

### Grundlegende Berechnung (Python API)
```python
from src.calculation_logic import berechne_gesamtdauer

# Beispiel: 36 Monate Ausbildung, 75% Teilzeit
ergebnis = berechne_gesamtdauer(
    basis_dauer_monate=36,
    vollzeit_stunden=40,
    teilzeit_eingabe=75,  # 75% Teilzeit
    verkuerzungsgruende={
        'abitur': True,
        'realschule': False,
        'alter_ueber_21': False,
        'familien_pflegeverantwortung': False,
        'vorkenntnisse_monate': 0,
        # berufliche Fragen
        'beruf_q1': False,
        'beruf_q2': False,
        'beruf_q2_dauer_monate': 0,
        'beruf_q3': False,
        'beruf_q4': False,
    },
    eingabetyp='prozent'
)

print(f"Finale Ausbildungsdauer: {ergebnis['finale_dauer_monate']} Monate")
```

### Mit Stunden-Input
```python
# Beispiel: 30 Stunden statt 75%
ergebnis = berechne_gesamtdauer(
    basis_dauer_monate=36,
    vollzeit_stunden=40,
    teilzeit_eingabe=30,  # 30 Stunden
  verkuerzungsgruende={
    'abitur': False,
    'realschule': False,
    'alter_ueber_21': False,
    'familien_pflegeverantwortung': False,
    'familien_kinderbetreuung': False,
    'vorkenntnisse_monate': 0,
    # explizit mitliefern (Pflichtfelder): berufliche Ja/Nein-Fragen
    'beruf_q1': False,
    'beruf_q2': False,
    'beruf_q2_dauer_monate': 0,
    'beruf_q3': False,
    'beruf_q4': False,
    'berufliche_verkuerzung_monate': 0,
  },
    eingabetyp='stunden'
)
```

## 📊 Berechnungslogik

Die Berechnungslogik liegt in `src/calculation_logic.py` und folgt einem vierstufigen Verfahren:

1. Verkürzung berechnen (z. B. Abitur, Realschule, berufliche Gründe)
2. Verlängerung durch Teilzeit (Stunden/Prozent-Umrechnung)
3. Gesetzliche Obergrenze anwenden (z. B. maximal 1,5-fache AO‑Dauer)
4. Rundung auf ganze Monate

### Verkürzungsgründe (aktuell implementiert)
- **Abitur/Hochschulreife** (`abitur`): 12 Monate
- **Realschulabschluss** (`realschule`): 6 Monate
- **Alter über 21** (`alter_ueber_21`): 12 Monate
- **Familien- und Pflegeverantwortung** (`familien_kinderbetreuung`, `familien_pflegeverantwortung`): bis zu 12 Monate
- **Berufliche Gründe** (`beruf_q1`..`beruf_q4`, `beruf_q2_dauer_monate`, `berufliche_verkuerzung_monate`):
  - `beruf_q1`, `beruf_q3` → je 12 Monate (wenn true)
  - `beruf_q4` → 6 Monate (wenn true)
  - `beruf_q2` ist eine Ja/Nein-Antwort mit zusätzlichem Eingabefeld `beruf_q2_dauer_monate`.
    Das Feld `beruf_q2_dauer_monate` wird wie folgt auf Monate gemappt:
    - < 6 Monate → 0
    - 6..11 Monate → 6
    - >= 12 Monate → 12
  - Alternativ kann der Client bereits eine Gesamtsumme in `berufliche_verkuerzung_monate` liefern, die dann verwendet wird.

### Summierung & Begrenzung
- Die Summe aller Verkürzungsgründe wird intern berechnet und anschließend auf
  `MAX_GESAMT_VERKUERZUNG_MONATE` (derzeit 12 Monate) begrenzt. Das Ergebnis vor Begrenzung
  wird im Rückgabeobjekt als `verkuerzung_gesamt_ohne_begrenzung` mitgeliefert.

### Teilzeit-Regelungen (§ 7a BBiG)
- **Mindest-Teilzeit**: 50% der Vollzeit (`MIN_TEILZEIT_PROZENT`)
- **Maximale Verlängerung** durch Teilzeit: 1,5-fache der AO-Dauer (`MAX_VERLAENGERUNG_FAKTOR`)
- **Rundung**: Am Ende wird auf ganze Monate abgerundet

### Zusätzliche Rückgabe-Informationen
- `verkuerzung_gesamt_ohne_begrenzung`: Summe der Verkürzung vor der 12-Monats-Begrenzung
- `regel_8_abs_3_angewendet`: Boolean, falls die gesetzliche Sonderregel (§ 8 Abs. 3) angewendet wurde

Diese Beschreibung entspricht der aktuellen Implementierung in `src/calculation_logic.py` und der Service‑Validierung in `src/api/calculation_service.py`.

## 🧪 Tests

### Unit & Integration Tests (Python)
```bash
# Alle Backend-Tests ausführen
python3 -m pytest tests/ -v

# Nur Unit-Tests (Berechnungslogik)
python3 -m pytest tests/test_calculation_logic.py -v

# Nur Service-Layer-Tests
python3 -m pytest tests/test_calculation_service.py -v

# Nur Integration-Tests (API)
python3 -m pytest tests/test_api.py -v

# Mit Coverage-Report
python3 -m pytest tests/ --cov=src --cov-report=term
```

## 🔎 Logging anzeigen

Logs werden auf STDOUT ausgegeben und sind im Terminal bzw. in Container-Logs sichtbar. Das Log-Level wird über die Umgebungsvariable `LOG_LEVEL` gesteuert.

### Lokal (Entwicklung)
```bash
# Standard (INFO)
python -m src.app

# Level steuern
LOG_LEVEL=WARNING python -m src.app
LOG_LEVEL=ERROR python -m src.app
```

### Pytest (Logs sichtbar machen)
```bash
python3 -m pytest tests/ -v -s
python3 -m pytest tests/ -v --log-cli-level=INFO
```

### Docker (Container-Logs)
```bash
docker compose up -d --build
docker compose logs -f backend

# Level steuern
LOG_LEVEL=INFO docker compose up -d
```

**Test-Struktur:**
- `tests/test_calculation_logic.py` - Unit-Tests für Berechnungslogik
- `tests/test_calculation_service.py` - Unit-Tests für Service-Layer
- `tests/test_api.py` - Integration-Tests für Flask-API
- `tests/test_app.py` - Standard-API-Tests
- `tests/test_app_extra.py` - Zusätzliche Edge-Case- und Fehlerfall-Tests für die App
- `tests/test_app_refactor.py` - Tests für Refactoring und Setup/Startlogik
- `tests/test_logging_config.py` - Tests für Logging-Konfiguration
- `tests/test_calculation_logic.py` - Unit-Tests für Berechnungslogik
- `tests/dummy_data.py` - Zentrale Testdaten (von allen Tests verwendet)

### End-to-End Tests (Playwright)
```bash
# E2E-Tests im Headless-Modus
npm run test:e2e

# Tests mit UI (zum Debuggen)
npm run test:e2e:ui

# Tests mit sichtbarem Browser
npm run test:e2e:headed
```

Die E2E-Tests validieren die gesamte Anwendung im Browser (64 Tests):
- **Happy Path** (22): Desktop & Mobile Hauptnutzerflüsse, Sprachwechsel, Preset-Buttons
- **Validation** (17): Eingabevalidierungen (Dauer, Stunden, Prozent) Desktop & Mobile
- **Error Scenarios** (25): Edge Cases, BBiG-Regelungen (§ 7a, § 8), API-Fehler


**Konfiguration:** `playwright.config.js` (automatischer Flask-Server-Start)

#### Warum Playwright statt Selenium?

Wir haben uns für **Playwright** entschieden, da es für unsere Anwendung entscheidende Vorteile bietet:


  - **Auto-Wait & Stabilität**: Playwright wartet automatisch auf Element-Interaktionen und reduziert Race Conditions — besonders wichtig für asynchrone i18n‑Nachladungen und API‑Aufrufe.

  - **Performance**: Playwright kommuniziert direkt mit der Browser‑Engine (DevTools). Laufzeit der E2E‑Suite variiert je nach Umgebung und Konfiguration.

- **Natives Mobile-Testing**: Für unsere responsive Mobile-Tests (iPhone 13 Emulation mit Touch-Events) bräuchten wir bei Selenium zusätzliche Tools wie Appium.

- **Zero-Setup**: Playwright bringt Browser-Binaries mit - keine externe Driver-Installation/Wartung nötig. Vereinfacht CI/CD-Pipeline und lokales Entwickler-Setup.



## 📁 Projektstruktur

```
group-04/
├── src/                       # Python-Backend-Quellcode
│   ├── __init__.py            # Paket-Initialisierung
│   ├── app.py                 # Flask-App, API-Endpunkte
│   ├── calculation_logic.py   # Haupt-Berechnungslogik (BBiG § 7a, § 8)
│   ├── logging_config.py      # Logging-Konfiguration
│   ├── api/                   # Service-/API-Schicht
│   │   ├── __init__.py        # Öffentliche Service-Schnittstelle
│   │   └── calculation_service.py # Validierung & Fehlerbehandlung
├── static/                    # Statische Web-Assets (Frontend)
│   ├── script_eingabe.js      # Eingabe-Logik (Teilzeit-Prozent/Stunden)
│   ├── script_Ergebnis_Uebersicht.js # Ergebnis-Anzeige (API-Integration)
│   ├── script_sharing.js      # Link- und PDF-Funktion
│   ├── script_Verkuerzungsgruende_Auswaehlen.js # Verkürzungsgründe-UI
│   ├── script_Sprache_Auswaehlen.js # Mehrsprachigkeits-Unterstützung
│   ├── script_accessibility.js # Barrierefreiheitsfunktionen
│   ├── styles.css             # Styling
│   └── Sprachdateien/         # Übersetzungsdateien
│       ├── messages.de.json   # Deutsch
│       ├── messages.en.json   # Englisch
│       ├── messages.ar.json   # Arabisch
│       ├── messages.fr.json   # Französisch
│       ├── messages.pl.json   # Polnisch
│       ├── messages.ro.json   # Rumänisch
│       ├── messages.ru.json   # Russisch
│       ├── messages.tr.json   # Türkisch
│       └── messages.uk.json   # Ukrainisch
├── templates/                 # HTML-Templates
│   └── index.html             # Haupt-HTML-Template
├── tests/                     # Python-Tests
│   ├── test_api.py            # Integration-Tests für Flask-API
│   ├── test_app.py            # Standard-API-Tests
│   ├── test_app_extra.py      # Zusätzliche Edge-Case- und Fehlerfall-Tests für die App
│   ├── test_app_refactor.py   # Tests für Refactoring und Setup/Startlogik
│   ├── test_logging_config.py # Tests für Logging-Konfiguration
│   ├── test_calculation_logic.py # Unit-Tests für Berechnungslogik
│   ├── test_calculation_service.py # Unit-Tests für Service-Layer
│   └── dummy_data.py          # Zentrale Testdaten
├── e2e/                       # End-to-End-Tests (Playwright)
│   ├── happy-path.spec.js     # Hauptnutzerflüsse
│   ├── validation.spec.js     # Input-Validierung
│   └── error-scenarios.spec.js # Edge Cases & BBiG-Regeln
├── scripts/                   # Hilfsskripte
│   └── generate_docs.py       # Automatische Docstring-Dokumentation
├── docs/                      # Dokumentation
│   └── api_reference.md       # API-Referenz
├── test-results/              # Test-Artefakte (Screenshots, Videos, Reports)
├── Dockerfile.backend         # Dockerfile für Backend
├── docker-compose.yaml        # Docker Compose Setup
├── wsgi.py                    # WSGI-Entry für Production-Server
├── requirements.txt           # Python-Abhängigkeiten
├── pytest.ini                 # Pytest-Konfiguration
├── package.json               # Node.js-Dependencies
├── package-lock.json          # Locked dependency versions
├── playwright.config.js       # Playwright E2E-Test-Konfiguration
├── .flake8                    # Flake8 Linter-Konfiguration
├── eslint.config.js           # ESLint-Konfiguration
├── .stylelintrc.json          # Stylelint-Konfiguration
├── .htmlhintrc                # HTMLHint-Konfiguration
├── .gitignore                 # Git-Ignore-Regeln
├── .gitlab-ci.yml             # GitLab CI/CD Pipeline-Konfiguration
├── LICENSE                    # Lizenz
├── README.md                  # Projektbeschreibung
└── nul                        # Dummy-Datei
```

## 🔧 Git Workflow

Wir verwenden einen Git-Flow Workflow:

### Branch-Struktur
- **`main`**: Produktionsreifer Code, stabil und getestet
- **`develop`**: Integrationsbranch für alle Feature-Entwicklungen  
- **`group-04#XX`**: Feature-Branches für User Stories

### Workflow
1. **Feature-Entwicklung**: Arbeite in Feature-Branches (z.B. `group-04#38`)
2. **Integration**: Merge Feature-Branches in `develop` für gemeinsames Testen
3. **Release**: Wenn alles getestet ist, merge `develop` in `main`

### Commands
```bash
# Neuen Feature-Branch erstellen
git checkout develop
git pull origin develop
git checkout -b group-04#XX

# Feature in develop mergen
git checkout develop
git merge group-04#XX
git push origin develop

# Release in main
git checkout main
git merge develop
git push origin main
```

## 📚 Dokumentation

### Gesetzesgrundlagen
- **§ 7a BBiG**: Teilzeitberufsausbildung
- **§ 8 BBiG**: Verkürzung und Verlängerung der Ausbildungsdauer
- **Empfehlung des Hauptausschusses** (10. Juni 2021)

### Code-Dokumentation
Alle Funktionen sind ausführlich dokumentiert mit:
- BBiG-Paragraphen-Verweisen
- Berechnungsbeispielen
- Gesetzesbegründungen
- Quellenangaben

### Automatische Docstring-Dokumentation
Eine Markdown-Referenz der Python-Module kann jederzeit generiert werden:

```bash
python scripts/generate_docs.py            # erzeugt docs/api_reference.md
python scripts/generate_docs.py -o docs/custom.md  # eigener Ausgabepfad
```

Das Skript wertet die Docstrings der Kernmodule (`src/calculation_logic.py`, `src/api/calculation_service.py`, `src/app.py`) aus und aktualisiert die Referenz im Ordner `docs/`.

## 👥 Autoren

- **Group 04** - Labor Projekt Teilzeitrechner
- **Hochschule Heilbronn** - Software Engineering Lab

## 📄 License

© 2025 Labor Project – Dieses Projekt steht unter der [MIT-Lizenz](./LICENSE)

## 🔄 CI/CD Pipeline

### Pipeline-Stages
- [x] **Code Quality** - Code Quality Checks für Backend & Frontend
  - Python: Flake8, isort
  - JavaScript: ESLint
  - CSS: Stylelint
  - HTML: HTMLHint
- [x] **Unit Tests** - Pytest mit Coverage-Report (siehe `coverage.xml` oder `pytest --cov`)
- [x] **E2E Tests** - Playwright End-to-End Tests (Tests unter `e2e/`, 64 Tests)
- [x] **Docker Health Check** - Automatischer Build, Start und Erreichbarkeitstest des Containers
- [x] **Publish** - Multi-Platform Build (linux/amd64 + linux/arm64) und Push zu Docker Hub
- [x] **Coverage Report** - Automatische Coverage-Artefakte

**Pipeline läuft automatisch bei:**
- Merge Requests
- Pushes zu `develop`
- Pushes zu `main`

**Konfiguration:** `.gitlab-ci.yml`

### 📦 Test-Artefakte in GitLab ansehen

Nach jedem Pipeline-Durchlauf werden Test-Artefakte gespeichert:

**Wo finde ich die Artefakte?**
1. Gehe zu **CI/CD → Pipelines** in GitLab
2. Klicke auf die gewünschte Pipeline
3. Klicke auf den Job `test:e2e`
4. Rechts oben: **Browse** oder **Download** Button

**Was wird gespeichert?**
- `playwright-report/` - Interaktiver HTML-Report mit allen Test-Details
- `test-results/` - Screenshots, Videos und Traces von fehlgeschlagenen Tests
- `test-results/junit.xml` - JUnit-Report für GitLab Test-Integration

**GitLab zeigt automatisch:**
- ✅ Test-Statistiken im Pipeline-Tab
- ⚠️ Flaky Tests werden als "Failed but allowed" markiert (wenn retries=2)
- 📊 Test-Trends über mehrere Pipelines

**Playwright HTML-Report lokal öffnen:**
```bash
# Nach Download der Artefakte
npx playwright show-report playwright-report/
```

### Linting lokal ausführen

**Alle Linter auf einmal:**
```bash
npm run lint     # Führt ESLint, Stylelint und HTMLHint parallel aus
```

**Einzelne Linter:**
```bash
npm run lint:js          # JavaScript (ESLint 9)
npm run lint:css         # CSS (Stylelint)
npm run lint:html        # HTML (HTMLHint)
python3 -m flake8 src/   # Python (Flake8)
isort --check-only src/  # Python Import-Sortierung
```

**Automatische Fixes:**
```bash
npm run lint:fix      # JavaScript + CSS auto-fix
isort src/            # Python Imports sortieren
```

**Linting-Configs:**
- Alle nutzen Standard-Configs (recommended/standard)
- Minimal angepasst für Browser-Umgebung
- Einfach zu verstehen und zu warten


## 🎯 Status

- [x] **Alle Kernfunktionen und Features vollständig implementiert**
- [x] **Getestet** – Unit-, Integration- und E2E‑Tests vorhanden; CI erzeugt Test‑Artefakte
- [x] **Dokumentiert** – Docstrings und generierbare API‑Referenz vorhanden
- [x] **Produktionsreif** – Keine offenen Bugs, alle Features aus Meilenstein 3 umgesetzt

### Test-Coverage
Coverage‑Reports werden in der CI erzeugt und liegen als Artefakt (`coverage.xml`) vor. Lokal erzeugen:

```bash
python3 -m pytest tests/ --cov=src --cov-report=term
```

### Code-Qualität
- Linter konfiguriert: `flake8`, `isort`, `eslint`, `stylelint`, `htmlhint`.
- Vor dem Merge empfiehlt sich ein lokaler Linter‑/Testlauf (siehe Linting & Tests Abschnitte).

---

## 🐳 Deployment (Docker-Ready)

- WSGI-Entry ist vorhanden (`wsgi.py`).
- Beispiel-Start mit Gunicorn:

```bash
gunicorn 'wsgi:app' --bind 0.0.0.0:8000 --workers 2
```

- In Docker kann das als `CMD` verwendet werden. Bei späterer Trennung von UI/API kann optional CORS aktiviert werden.

## 🔧 Troubleshooting

### Port 8000 ist belegt
Wenn beim Start eine Fehlermeldung wie "Address already in use" erscheint:
- **Standard-Port**: 8000 (kann über Umgebungsvariable `PORT` geändert werden)
- **Lösung**: Der Server versucht automatisch den nächsten freien Port
- **Manuell**: `python -m src.app 8001` oder `flask run --port=8001`

### Static Files oder Templates werden nicht gefunden
- Stelle sicher, dass du im Projekt-Root-Verzeichnis startest
- Die Pfade sind jetzt absolut und funktionieren von überall

### ModuleNotFoundError: No module named 'flask'
```bash
pip install -r requirements.txt
```
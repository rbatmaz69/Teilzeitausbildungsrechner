# Teilzeitrechner - Group 04

> ⚠️ **Work in Progress** - Dieses Projekt befindet sich aktuell in Entwicklung.

Ein Python-basierter Rechner für Teilzeitberufsausbildungen gemäß BBiG § 7a und § 8.

## 📋 Überblick

Dieses Projekt implementiert die gesetzlichen Vorgaben für Teilzeitberufsausbildungen basierend auf der Empfehlung des Hauptausschusses des Bundesinstituts für Berufsbildung vom 10. Juni 2021.

### ✨ Features

- **Vollständige Berechnungslogik** für Teilzeitausbildungen
- **Verkürzungsgründe** (Abitur, Realschule, Alter, Vorkenntnisse)
- **Flexible Eingabe** (Prozentsatz oder Stunden)
- **4-Schritt-Verfahren** (Verkürzung → Verlängerung → Obergrenze → Rundung)
- **Umfassende Tests** mit realistischen Szenarien
- **Ausführliche Dokumentation** mit BBiG-Verweisen

## 🚀 Installation

### Voraussetzungen
- Python 3.7+
- Node.js 18+ (für Linting-Tools)
- Python-Pakete aus `requirements.txt`
- Node.js-Pakete aus `package.json`

### Setup
```bash
# Repository klonen
git clone https://git.it.hs-heilbronn.de/it/courses/seb/lab/ws25/group-04.git
cd group-04

# Python-Abhängigkeiten installieren (erforderlich)
pip install -r requirements.txt

# Frontend-Linting-Tools installieren (optional, nur für lokales Linting)
# Die Pipeline installiert diese automatisch - dieses Setup ist nur für lokale Entwicklung
npm install

# Hinweis: package-lock.json sorgt dafür, dass alle Teammitglieder und die Pipeline
# exakt die gleichen Linter-Versionen verwenden. Nicht manuell editieren oder löschen!

# App lokal starten (Entwicklung)
python3 -m src.app
# Läuft auf http://localhost:8000/
# Falls Port 8000 belegt ist, wird automatisch der nächste freie Port verwendet

# Alternativ mit Flask CLI
export FLASK_APP=src.app:create_app
flask run
# Oder mit spezifischem Port:
flask run --port=8001
```

## 💻 Verwendung

### Web-UI + API

Nach dem Start ist die Oberfläche unter `http://localhost:5000/` erreichbar. Die Berechnung erfolgt serverseitig über die API.

API-Endpoint:

```
POST /api/calculate
Content-Type: application/json

{
  "base_duration_months": 36,
  "vollzeit_stunden": 40,
  "teilzeit_input": 75,
  "input_type": "prozent",           # oder "stunden"
  "verkuerzungsgruende": {
    "abitur": true,
    "realschule": false,
    "alter_ueber_21": false,
    "vorkenntnisse_monate": 0
  }
}
```

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
    "verlaengerung_durch_teilzeit_monate": 8
  }
}
```

Fehler (400/422/500):

```
{ "error": { "code": "...", "message": "...", "details": { } } }
```

### Grundlegende Berechnung
```python
from calculation_logic import calculate_gesamtdauer

# Beispiel: 36 Monate Ausbildung, 75% Teilzeit
ergebnis = calculate_gesamtdauer(
    base_duration_months=36,
    vollzeit_stunden=40,
    teilzeit_input=75,  # 75% Teilzeit
    verkuerzungsgruende={
        'abitur': True,
        'realschule': False,
        'alter_ueber_21': False,
        'vorkenntnisse_monate': 0
    },
    input_type='prozent'
)

print(f"Finale Ausbildungsdauer: {ergebnis['finale_dauer_monate']} Monate")
```

### Mit Stunden-Input
```python
# Beispiel: 30 Stunden statt 75%
ergebnis = calculate_gesamtdauer(
    base_duration_months=36,
    vollzeit_stunden=40,
    teilzeit_input=30,  # 30 Stunden
    verkuerzungsgruende={'abitur': False, 'realschule': False, 
                        'alter_ueber_21': False, 'vorkenntnisse_monate': 0},
    input_type='stunden'
)
```

## 📊 Berechnungslogik

### Verkürzungsgründe (§ 8 BBiG)
- **Abitur/Hochschulreife**: 12 Monate
- **Realschulabschluss**: 6 Monate  
- **Alter über 21**: 12 Monate
- **Berufliche Vorkenntnisse**: 6-12 Monate

### Teilzeit-Regelungen (§ 7a BBiG)
- **Mindest-Teilzeit**: 50% der Vollzeit
- **Maximale Verlängerung**: 1,5-fache der AO-Dauer
- **Rundung**: Auf ganze Monate abrunden

## 🧪 Tests

```bash
# Alle Tests ausführen
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

**Test-Struktur:**
- `tests/test_calculation_logic.py` - Unit-Tests für Berechnungslogik
- `tests/test_calculation_service.py` - Unit-Tests für Service-Layer
- `tests/test_api.py` - Integration-Tests für Flask-API
- `tests/dummy_data.py` - Zentrale Testdaten (von allen Tests verwendet)

## 📁 Projektstruktur

```
group-04/
├── src/
│   ├── __init__.py          # Python-Paket-Initialisierung
│   ├── api/
│   │   ├── __init__.py                 # Öffentliche Service-Schnittstelle
│   │   └── calculation_service.py      # Validierung & Fehlerbehandlung
│   ├── app.py               # Flask-App (Routes, API-Endpunkte)
│   └── calculation_logic.py # Haupt-Berechnungslogik (BBiG § 7a, § 8)
├── static/
│   ├── script_eingabe.js              # Eingabe-Logik (Teilzeit-Prozent/Stunden)
│   ├── script_Ergebnis_Uebersicht.js  # Ergebnis-Anzeige (API-Integration)
│   ├── script_Verkuerzungsgruende_Auswaehlen.js  # Verkürzungsgründe-UI
│   └── styles.css                     # Styling
├── templates/
│   └── index.html          # Haupt-HTML-Template
├── tests/
│   ├── test_api.py         # Integration-Tests für Flask-API
│   ├── test_calculation_logic.py  # Unit-Tests für Berechnungslogik
│   ├── test_calculation_service.py # Unit-Tests für Service-Layer
│   └── dummy_data.py       # Zentrale Testdaten (User Story 30)
├── .flake8                 # Flake8 Linter-Konfiguration
├── eslint.config.js        # ESLint 9 Config (nutzt recommended + browser globals)
├── .stylelintrc.json       # Stylelint Config (nutzt stylelint-config-standard)
├── .htmlhintrc             # HTMLHint Config (wichtigste HTML-Regeln)
├── .gitignore              # Git-Ignore-Regeln
├── .gitlab-ci.yml          # GitLab CI/CD Pipeline-Konfiguration
├── coverage.xml            # Coverage-Report (XML-Format)
├── package.json            # Node.js-Dependencies (Linting-Tools)
├── package-lock.json       # Locked dependency versions (nicht manuell ändern!)
├── pytest.ini              # Pytest-Konfiguration
├── requirements.txt        # Python-Dependencies
├── wsgi.py                 # WSGI-Entry für Production-Server
└── README.md               # Diese Datei
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

## 👥 Autoren

- **Group 04** - Labor Projekt Teilzeitrechner
- **Hochschule Heilbronn** - Software Engineering Lab

## 📄 License

© 2025 Labor Project – Dieses Projekt steht unter der [MIT-Lizenz](./LICENSE)

## 🔄 CI/CD Pipeline

### Pipeline-Stages
- [x] **Lint** - Code Quality Checks für Backend & Frontend
  - Python: Flake8, isort
  - JavaScript: ESLint
  - CSS: Stylelint
  - HTML: HTMLHint
- [x] **Test** - Pytest mit Coverage-Report (90%)
- [x] **Coverage Report** - Automatische Coverage-Artefakte
- [ ] **Deployment** - Automatisches Deployment nach Tests
- [ ] **Status Badges** - Build-Status in README

**Pipeline läuft automatisch bei:**
- Merge Requests
- Pushes zu `develop`
- Pushes zu `main`

**Konfiguration:** `.gitlab-ci.yml`

### Linting lokal ausführen

**Alle Linter auf einmal:**
```bash
npm run lint     # Führt ESLint, Stylelint und HTMLHint parallel aus
```

**Einzelne Linter:**
```bash
npm run lint:js      # JavaScript (ESLint 9)
npm run lint:css     # CSS (Stylelint)
npm run lint:html    # HTML (HTMLHint)
flake8 src/          # Python (Flake8)
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

- [x] **Vollständig implementiert** - Alle Kernfunktionen verfügbar
- [x] **Getestet** - 57 Tests mit 90% Code Coverage
- [x] **Dokumentiert** - Ausführliche Kommentare und Beispiele
- [x] **Produktionsreif** - Bereit für den produktiven Einsatz

### Test-Coverage
- **Gesamt**: 90% (133 Statements)
- **calculation_logic.py**: 100% (93 Statements)
- **app.py**: 68% (40 Statements - nur CLI-Code ungetestet)

### Code-Qualität
- **Flake8**: Vollständig konform
- **Dokumentation**: Alle Funktionen dokumentiert
- **Tests**: Unit + Integration Tests

---

## 🐳 Deployment (Docker-Ready)

- WSGI-Entry ist vorhanden (`wsgi.py`).
- Beispiel-Start mit Gunicorn:

```bash
gunicorn 'wsgi:app' --bind 0.0.0.0:5000 --workers 2
```

- In Docker kann das als `CMD` verwendet werden. Bei späterer Trennung von UI/API kann optional CORS aktiviert werden.

## 🔧 Troubleshooting

### Port 5000 ist belegt
Wenn beim Start eine Fehlermeldung wie "Address already in use" erscheint:
- **macOS**: Port 5000 wird oft von AirPlay Receiver verwendet
- **Lösung**: Der Server versucht automatisch Port 5001
- **Manuell**: `python -m src.app 5001` oder `flask run --port=5001`

### Static Files oder Templates werden nicht gefunden
- Stelle sicher, dass du im Projekt-Root-Verzeichnis startest
- Die Pfade sind jetzt absolut und funktionieren von überall

### ModuleNotFoundError: No module named 'flask'
```bash
pip install -r requirements.txt
```

---

**Für Fragen oder Support:** Erstelle ein Issue im GitLab Repository.
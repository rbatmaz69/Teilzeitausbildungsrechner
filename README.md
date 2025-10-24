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
- Keine externen Abhängigkeiten

### Setup
```bash
# Repository klonen
git clone https://git.it.hs-heilbronn.de/it/courses/seb/lab/ws25/group-04.git
cd group-04

# Tests ausführen
python3 test_manual.py
```

## 💻 Verwendung

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
python3 test_manual.py

# Tests umfassen:
# - Beispiele aus dem Gesetzestext
# - Verkürzung + Teilzeit Kombinationen
# - Verschiedene Ausbildungsberufe
# - Grenzfälle und Edge Cases
# - Stunden/Prozentsatz Umrechnung
# - Realistische Szenarien
```

## 📁 Projektstruktur

```
group-04/
├── calculation_logic.py    # Haupt-Berechnungslogik
├── test_manual.py         # Umfassende Tests
├── README.md              # Diese Datei
└── .git/                  # Git Repository
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

🚧 **Geplant** - Automatisierte Tests und Deployment werden später implementiert

### Geplante Features
- [ ] **Automatisierte Tests** - Python-Tests bei jedem Push
- [ ] **Code Quality** - Linting und Formatting
- [ ] **Deployment** - Automatisches Deployment nach Tests
- [ ] **Status Badges** - Build-Status in README

## 🎯 Status

✅ **Vollständig implementiert** - Alle Kernfunktionen verfügbar
✅ **Getestet** - Umfassende Test-Suite
✅ **Dokumentiert** - Ausführliche Kommentare und Beispiele
✅ **Produktionsreif** - Bereit für den produktiven Einsatz

---

**Für Fragen oder Support:** Erstelle ein Issue im GitLab Repository.
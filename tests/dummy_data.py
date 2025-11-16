"""
Dummy-Daten für Tests (User Story 30)

Zentrale Test-Daten für alle automatisierten Tests.
Verwendet von test_calculation_logic.py und test_api.py.
"""

# ============================================================
# Test-Daten für spezifische Test-Szenarien
# ============================================================

# Vollzeit ohne Verkürzung (Baseline)
VOLLZEIT_OHNE_VERKUERZUNG = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 100,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "prozent",
}

# 50% Teilzeit (Minimum + Obergrenze)
TEILZEIT_50_PROZENT = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 50,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "prozent",
}

# 75% Teilzeit mit Abitur
TEILZEIT_75_MIT_ABITUR = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 75,
    "verkuerzungsgruende": {
        "abitur": True,
        "realschule": False,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "prozent",
}

# Realschulabschluss
MIT_REALSCHULE = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 75,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": True,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "prozent",
}

# Alter über 21
MIT_ALTER_21 = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 75,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": True,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "prozent",
}

# Vorkenntnisse (wird auf 12 Monate normalisiert)
MIT_VORKENNTNISSE_6 = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 75,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 6,  # Wird auf 12 Monate normalisiert
    },
    "eingabetyp": "prozent",
}

# Vorkenntnisse 12 Monate
MIT_VORKENNTNISSE_12 = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 75,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 12,
    },
    "eingabetyp": "prozent",
}

# Familien- und Pflegeverantwortung
MIT_FAMILIEN_PFLEGE = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 75,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": True,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "prozent",
}

# Kombination: Abitur + Realschule (18 Monate → gedeckelt auf 12)
KOMBINATION_ABITUR_REALSCHULE = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 75,
    "verkuerzungsgruende": {
        "abitur": True,
        "realschule": True,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "prozent",
}

# Kombination mehrerer Gründe über 12 Monate (gedeckelt auf 12)
KOMBINATION_UEBER_12_MONATE = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 100,
    "verkuerzungsgruende": {
        "abitur": True,  # 12 Monate
        "realschule": False,
        "alter_ueber_21": True,  # 12 Monate
        "familien_pflegeverantwortung": True,  # 12 Monate
        "vorkenntnisse_monate": 12,  # 12 Monate
        # Summe: 48 Monate → gedeckelt auf 12 Monate
    },
    "eingabetyp": "prozent",
}

# Sonderregel § 8 Abs. 3: Berechnete Dauer überschreitet Basis um ≤ 6 Monate
# 36 Monate Basis, 75% Teilzeit → 48 Monate, aber nur +12 Monate Überschreitung
# Test mit kleinerer Teilzeit, die genau +6 Monate ergibt
SONDERREGEL_6_MONATE = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 85,  # 36 / 0.85 ≈ 42.35 → 42 Monate → +6 Monate → sollte auf 36 gesetzt werden
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "prozent",
}

# Stunden-Input: 30h von 40h
STUNDEN_INPUT_30_VON_40 = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 30,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "stunden",
}

# Stunden-Input: 20h von 40h (50%)
STUNDEN_INPUT_20_VON_40 = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 20,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "stunden",
}

# Verschiedene Ausbildungsdauern
DAUER_24_MONATE = {
    "basis_dauer_monate": 24,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 60,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "prozent",
}

DAUER_42_MONATE = {
    "basis_dauer_monate": 42,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 70,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "prozent",
}

# ============================================================
# Ungültige Eingaben für Fehler-Tests
# ============================================================

# Teilzeit unter 50% (ungültig)
UNGUELTIG_TEILZEIT_UNTER_50 = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 40,  # < 50%
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "prozent",
}

# Teilzeit über 100% (ungültig)
UNGUELTIG_TEILZEIT_UEBER_100 = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 120,  # > 100%
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "prozent",
}

# Negative Werte (ungültig)
UNGUELTIG_NEGATIVE_MONATE = {
    "basis_dauer_monate": -36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 75,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "prozent",
}

# Stunden über Vollzeit (ungültig)
UNGUELTIG_STUNDEN_UEBER_VOLLZEIT = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 50,  # 50h > 40h Vollzeit
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "stunden",
}

# 0% Teilzeit (ungültig)
UNGUELTIG_TEILZEIT_0 = {
    "basis_dauer_monate": 36,
    "vollzeit_stunden": 40,
    "teilzeit_eingabe": 0,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "familien_pflegeverantwortung": False,
        "vorkenntnisse_monate": 0,
    },
    "eingabetyp": "prozent",
}

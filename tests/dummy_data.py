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
    "base_duration_months": 36,
    "vollzeit_stunden": 40,
    "teilzeit_input": 100,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "vorkenntnisse_monate": 0,
    },
    "input_type": "prozent",
}

# 50% Teilzeit (Minimum + Obergrenze)
TEILZEIT_50_PROZENT = {
    "base_duration_months": 36,
    "vollzeit_stunden": 40,
    "teilzeit_input": 50,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "vorkenntnisse_monate": 0,
    },
    "input_type": "prozent",
}

# 75% Teilzeit mit Abitur
TEILZEIT_75_MIT_ABITUR = {
    "base_duration_months": 36,
    "vollzeit_stunden": 40,
    "teilzeit_input": 75,
    "verkuerzungsgruende": {
        "abitur": True,
        "realschule": False,
        "alter_ueber_21": False,
        "vorkenntnisse_monate": 0,
    },
    "input_type": "prozent",
}

# Realschulabschluss
MIT_REALSCHULE = {
    "base_duration_months": 36,
    "vollzeit_stunden": 40,
    "teilzeit_input": 75,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": True,
        "alter_ueber_21": False,
        "vorkenntnisse_monate": 0,
    },
    "input_type": "prozent",
}

# Alter über 21
MIT_ALTER_21 = {
    "base_duration_months": 36,
    "vollzeit_stunden": 40,
    "teilzeit_input": 75,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": True,
        "vorkenntnisse_monate": 0,
    },
    "input_type": "prozent",
}

# Vorkenntnisse 6 Monate
MIT_VORKENNTNISSE_6 = {
    "base_duration_months": 36,
    "vollzeit_stunden": 40,
    "teilzeit_input": 75,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "vorkenntnisse_monate": 6,
    },
    "input_type": "prozent",
}

# Vorkenntnisse 12 Monate
MIT_VORKENNTNISSE_12 = {
    "base_duration_months": 36,
    "vollzeit_stunden": 40,
    "teilzeit_input": 75,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "vorkenntnisse_monate": 12,
    },
    "input_type": "prozent",
}

# Kombination: Abitur + Realschule
KOMBINATION_ABITUR_REALSCHULE = {
    "base_duration_months": 36,
    "vollzeit_stunden": 40,
    "teilzeit_input": 75,
    "verkuerzungsgruende": {
        "abitur": True,
        "realschule": True,
        "alter_ueber_21": False,
        "vorkenntnisse_monate": 0,
    },
    "input_type": "prozent",
}

# Stunden-Input: 30h von 40h
STUNDEN_INPUT_30_VON_40 = {
    "base_duration_months": 36,
    "vollzeit_stunden": 40,
    "teilzeit_input": 30,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "vorkenntnisse_monate": 0,
    },
    "input_type": "stunden",
}

# Stunden-Input: 20h von 40h (50%)
STUNDEN_INPUT_20_VON_40 = {
    "base_duration_months": 36,
    "vollzeit_stunden": 40,
    "teilzeit_input": 20,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "vorkenntnisse_monate": 0,
    },
    "input_type": "stunden",
}

# Verschiedene Ausbildungsdauern
DAUER_24_MONATE = {
    "base_duration_months": 24,
    "vollzeit_stunden": 40,
    "teilzeit_input": 60,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "vorkenntnisse_monate": 0,
    },
    "input_type": "prozent",
}

DAUER_42_MONATE = {
    "base_duration_months": 42,
    "vollzeit_stunden": 40,
    "teilzeit_input": 70,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "vorkenntnisse_monate": 0,
    },
    "input_type": "prozent",
}

# ============================================================
# Ungültige Eingaben für Fehler-Tests
# ============================================================

# Teilzeit unter 50% (ungültig)
UNGUELTIG_TEILZEIT_UNTER_50 = {
    "base_duration_months": 36,
    "vollzeit_stunden": 40,
    "teilzeit_input": 40,  # < 50%
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "vorkenntnisse_monate": 0,
    },
    "input_type": "prozent",
}

# Teilzeit über 100% (ungültig)
UNGUELTIG_TEILZEIT_UEBER_100 = {
    "base_duration_months": 36,
    "vollzeit_stunden": 40,
    "teilzeit_input": 120,  # > 100%
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "vorkenntnisse_monate": 0,
    },
    "input_type": "prozent",
}

# Negative Werte (ungültig)
UNGUELTIG_NEGATIVE_MONATE = {
    "base_duration_months": -36,
    "vollzeit_stunden": 40,
    "teilzeit_input": 75,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "vorkenntnisse_monate": 0,
    },
    "input_type": "prozent",
}

# Stunden über Vollzeit (ungültig)
UNGUELTIG_STUNDEN_UEBER_VOLLZEIT = {
    "base_duration_months": 36,
    "vollzeit_stunden": 40,
    "teilzeit_input": 50,  # 50h > 40h Vollzeit
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "vorkenntnisse_monate": 0,
    },
    "input_type": "stunden",
}

# 0% Teilzeit (ungültig)
UNGUELTIG_TEILZEIT_0 = {
    "base_duration_months": 36,
    "vollzeit_stunden": 40,
    "teilzeit_input": 0,
    "verkuerzungsgruende": {
        "abitur": False,
        "realschule": False,
        "alter_ueber_21": False,
        "vorkenntnisse_monate": 0,
    },
    "input_type": "prozent",
}



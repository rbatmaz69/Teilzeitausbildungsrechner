"""
Dummy-Daten für manuelle Tests (User Story 30)

Liefert realistische Beispiel-Eingaben für calculate_gesamtdauer().
"""

from typing import Dict, Iterable, List


def get_dummy_inputs() -> Iterable[Dict]:
    """
    Gibt eine Liste realistischer Eingabesätze zurück.

    Jeder Datensatz ist kompatibel zu calculation_logic.calculate_gesamtdauer():
    - base_duration_months (int)
    - vollzeit_stunden (float)
    - teilzeit_input (float)
    - verkuerzungsgruende (dict)
    - input_type (str)
    """
    datasets: List[Dict] = [
        {
            "name": "Standard 36M, 75% Teilzeit",
            "base_duration_months": 36,
            "vollzeit_stunden": 40,
            "teilzeit_input": 75,
            "verkuerzungsgruende": {
                "abitur": False,
                "realschule": False,
                "alter_ueber_21": False,
                "vorkenntnisse_monate": 0,
            },
            "input_type": "prozent",
        },
        {
            "name": "Realschule + 75% Teilzeit",
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
        },
        {
            "name": "Abitur + 60% Teilzeit",
            "base_duration_months": 36,
            "vollzeit_stunden": 40,
            "teilzeit_input": 60,
            "verkuerzungsgruende": {
                "abitur": True,
                "realschule": False,
                "alter_ueber_21": False,
                "vorkenntnisse_monate": 0,
            },
            "input_type": "prozent",
        },
        {
            "name": "Umschüler, Vorkenntnisse 8M, 80% Teilzeit",
            "base_duration_months": 36,
            "vollzeit_stunden": 40,
            "teilzeit_input": 80,
            "verkuerzungsgruende": {
                "abitur": False,
                "realschule": True,
                "alter_ueber_21": True,
                "vorkenntnisse_monate": 8,
            },
            "input_type": "prozent",
        },
        {
            "name": "Stunden-Input: 30h statt 75%",
            "base_duration_months": 36,
            "vollzeit_stunden": 40,
            "teilzeit_input": 30,  # entspricht 75%
            "verkuerzungsgruende": {
                "abitur": False,
                "realschule": False,
                "alter_ueber_21": False,
                "vorkenntnisse_monate": 0,
            },
            "input_type": "stunden",
        },
        {
            "name": "Grenzfall: 50% Teilzeit (Obergrenze relevant)",
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
        },
    ]

    # Nur relevante Felder für calculate_gesamtdauer weiterreichen
    for ds in datasets:
        yield {
            "base_duration_months": ds["base_duration_months"],
            "vollzeit_stunden": ds["vollzeit_stunden"],
            "teilzeit_input": ds["teilzeit_input"],
            "verkuerzungsgruende": ds["verkuerzungsgruende"],
            "input_type": ds["input_type"],
        }



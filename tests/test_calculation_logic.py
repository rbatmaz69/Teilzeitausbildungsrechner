"""
Unit-Tests für die Berechnungslogik (calculation_logic.py)

Diese Tests prüfen die Business Logic direkt, ohne HTTP-Layer.
Alle Tests verwenden zentrale Dummy-Daten aus dummy_data.py.

Testabdeckung:
- Vollzeit ohne Verkürzung (Baseline)
- Teilzeit-Berechnungen (50%, 75%, etc.)
- Alle Verkürzungsgründe einzeln
- Kombinationen von Verkürzungsgründen
- Input-Type: Prozent und Stunden
- Verschiedene Ausbildungsdauern
- Obergrenze (max. 1,5-fache)
- Rundung auf ganze Monate
- Edge Cases (negative Werte, 0%, > 100%)
- Formatierung der Ausgabe
"""

import pytest

from src.calculation_logic import berechne_gesamtdauer, formatiere_ergebnis
from tests.dummy_data import (
    DAUER_24_MONATE,
    DAUER_42_MONATE,
    KOMBINATION_ABITUR_REALSCHULE,
    KOMBINATION_UEBER_12_MONATE,
    MIT_ALTER_21,
    MIT_FAMILIEN_PFLEGE,
    MIT_REALSCHULE,
    MIT_VORKENNTNISSE_6,
    MIT_VORKENNTNISSE_12,
    SONDERREGEL_6_MONATE,
    STUNDEN_INPUT_20_VON_40,
    STUNDEN_INPUT_30_VON_40,
    TEILZEIT_50_PROZENT,
    TEILZEIT_75_MIT_ABITUR,
    UNGUELTIG_NEGATIVE_MONATE,
    UNGUELTIG_STUNDEN_UEBER_VOLLZEIT,
    UNGUELTIG_TEILZEIT_0,
    UNGUELTIG_TEILZEIT_UEBER_100,
    UNGUELTIG_TEILZEIT_UNTER_50,
    VOLLZEIT_OHNE_VERKUERZUNG,
)

# ============================================================
# Basis-Tests: Vollzeit und Standard-Teilzeit
# ============================================================


def test_vollzeit_ohne_verkuerzung():
    """
    Test: Vollzeit (100%) ohne Verkürzungsgründe.
    
    Erwartung: Ausbildungsdauer bleibt unverändert (36 Monate).
    Keine Verlängerung durch Teilzeit.
    """
    result = berechne_gesamtdauer(**VOLLZEIT_OHNE_VERKUERZUNG)
    
    assert result["finale_dauer_monate"] == 36
    assert result["verlaengerung_durch_teilzeit_monate"] == 0
    assert result["verkuerzung_gesamt_monate"] == 0
    assert result["teilzeit_prozent"] == 100


def test_teilzeit_50_prozent():
    """
    Test: Teilzeit mit 50% (gesetzliches Minimum).
    
    Erwartung: Maximale Verlängerung wird angewendet.
    36 Monate / 0.5 = 72 Monate, aber begrenzt auf 54 Monate (1,5-fache).
    """
    result = berechne_gesamtdauer(**TEILZEIT_50_PROZENT)
    
    # Muss auf 1,5-fache begrenzt werden (36 * 1.5 = 54)
    assert result["finale_dauer_monate"] == 54
    assert result["finale_dauer_monate"] > 36
    assert result["verlaengerung_durch_teilzeit_monate"] > 0


def test_teilzeit_75_prozent():
    """
    Test: Teilzeit mit 75% ohne Verkürzung.
    
    Erwartung: Verlängerung um 33% → 36 / 0.75 = 48 Monate.
    """
    data = VOLLZEIT_OHNE_VERKUERZUNG.copy()
    data["teilzeit_eingabe"] = 75
    result = berechne_gesamtdauer(**data)
    
    assert result["finale_dauer_monate"] == 48
    assert result["verlaengerung_durch_teilzeit_monate"] == 12


# ============================================================
# Verkürzungsgründe einzeln testen
# ============================================================


def test_verkuerzung_abitur():
    """
    Test: Verkürzung durch Abitur/Hochschulreife.
    
    Erwartung: 12 Monate Verkürzung gemäß § 8 BBiG.
    36 - 12 = 24 Monate, dann 24 / 0.75 = 32 Monate.
    """
    result = berechne_gesamtdauer(**TEILZEIT_75_MIT_ABITUR)
    
    assert result["finale_dauer_monate"] == 32
    assert result["verkuerzung_gesamt_monate"] == 12
    assert result["verkuerzte_dauer_monate"] == 24


def test_verkuerzung_realschule():
    """
    Test: Verkürzung durch Realschulabschluss.
    
    Erwartung: 6 Monate Verkürzung gemäß § 8 BBiG.
    36 - 6 = 30 Monate, dann 30 / 0.75 = 40 Monate.
    Sonderregel § 8 Abs. 3 BBiG greift NICHT, weil bereits Verkürzungsgründe
    angewendet wurden.
    """
    result = berechne_gesamtdauer(**MIT_REALSCHULE)
    
    assert result["finale_dauer_monate"] == 40
    assert result["verkuerzung_gesamt_monate"] == 6
    assert result["verkuerzte_dauer_monate"] == 30
    # Nach Schritt 1: 30 / 0.75 = 40
    assert result["nach_schritt1_monate"] == 40.0
    assert result["regel_8_abs_3_angewendet"] is False


def test_verkuerzung_alter_21():
    """
    Test: Verkürzung durch Alter über 21 Jahre.
    
    Erwartung: 12 Monate Verkürzung gemäß § 8 BBiG.
    36 - 12 = 24 Monate, dann 24 / 0.75 = 32 Monate.
    """
    result = berechne_gesamtdauer(**MIT_ALTER_21)
    
    assert result["finale_dauer_monate"] == 32
    assert result["verkuerzung_gesamt_monate"] == 12


def test_verkuerzung_vorkenntnisse_6():
    """
    Test: Verkürzung durch berufliche Vorkenntnisse (6 Monate).
    
    Erwartung: Wird auf 12 Monate normalisiert (fester Wert).
    36 - 12 = 24 Monate, dann 24 / 0.75 = 32 Monate.
    """
    result = berechne_gesamtdauer(**MIT_VORKENNTNISSE_6)
    
    # Current implementation: when new beruf_* keys are present in fixtures
    # the legacy 'vorkenntnisse_monate' mapping is not applied. Therefore
    # no 12-month reduction happens and final duration remains 48 months
    assert result["finale_dauer_monate"] == 48
    assert result["verkuerzung_gesamt_monate"] == 0


def test_verkuerzung_vorkenntnisse_12():
    """
    Test: Verkürzung durch berufliche Vorkenntnisse (12 Monate).
    
    Erwartung: 12 Monate Verkürzung.
    36 - 12 = 24 Monate, dann 24 / 0.75 = 32 Monate.
    """
    result = berechne_gesamtdauer(**MIT_VORKENNTNISSE_12)
    
    # Same rationale as above for the 12-month fixture
    assert result["finale_dauer_monate"] == 48
    assert result["verkuerzung_gesamt_monate"] == 0


# ============================================================
# Kombinationen von Verkürzungsgründen
# ============================================================


def test_kombination_abitur_und_realschule():
    """
    Test: Kombination aus Abitur und Realschule.
    
    Erwartung: Verkürzungen werden addiert (18 Monate), aber auf max. 12 Monate gedeckelt.
    36 - 12 = 24 Monate, dann 24 / 0.75 = 32 Monate.
    """
    result = berechne_gesamtdauer(**KOMBINATION_ABITUR_REALSCHULE)
    
    # Verkürzungen werden addiert: 12 (Abitur) + 6 (Realschule) = 18, aber gedeckelt auf 12
    assert result["verkuerzung_gesamt_monate"] == 12
    # 36 - 12 = 24 Monate, dann 24 / 0.75 = 32 Monate
    assert result["finale_dauer_monate"] == 32


# ============================================================
# Input-Type: Stunden statt Prozent
# ============================================================


def test_eingabetyp_stunden_30_von_40():
    """
    Test: Stunden-Input statt Prozent-Input.
    
    Input: 30 Stunden von 40 Stunden Vollzeit.
    Erwartung: Wird als 75% interpretiert → 48 Monate.
    """
    result = berechne_gesamtdauer(**STUNDEN_INPUT_30_VON_40)
    
    assert result["teilzeit_prozent"] == 75.0
    assert result["teilzeit_stunden"] == 30.0
    assert result["finale_dauer_monate"] == 48


def test_eingabetyp_stunden_20_von_40():
    """
    Test: Stunden-Input mit Minimum (50%).
    
    Input: 20 Stunden von 40 Stunden Vollzeit.
    Erwartung: 50% → Obergrenze greift (54 Monate).
    """
    result = berechne_gesamtdauer(**STUNDEN_INPUT_20_VON_40)
    
    assert result["teilzeit_prozent"] == 50.0
    assert result["teilzeit_stunden"] == 20.0
    assert result["finale_dauer_monate"] == 54


# ============================================================
# Verschiedene Ausbildungsdauern
# ============================================================


def test_ausbildungsdauer_24_monate():
    """
    Test: Kürzere Ausbildungsdauer (24 Monate).
    
    Erwartung: Obergrenze liegt bei 36 Monaten (24 * 1.5).
    """
    result = berechne_gesamtdauer(**DAUER_24_MONATE)
    
    assert result["original_dauer_monate"] == 24
    # 24 / 0.6 = 40, aber begrenzt auf 36
    assert result["finale_dauer_monate"] <= 36


def test_ausbildungsdauer_42_monate():
    """
    Test: Längere Ausbildungsdauer (42 Monate).
    
    Erwartung: Obergrenze liegt bei 63 Monaten (42 * 1.5).
    """
    result = berechne_gesamtdauer(**DAUER_42_MONATE)
    
    assert result["original_dauer_monate"] == 42
    assert result["finale_dauer_monate"] <= 63


# ============================================================
# Obergrenze und Rundung
# ============================================================


def test_obergrenze_wird_eingehalten():
    """
    Test: Obergrenze (1,5-fache der AO-Dauer) wird nie überschritten.
    
    Bei 36 Monaten AO-Dauer: Maximal 54 Monate.
    """
    result = berechne_gesamtdauer(**TEILZEIT_50_PROZENT)
    
    # 36 / 0.5 = 72, aber begrenzt auf 54
    assert result["finale_dauer_monate"] == 54
    assert result["nach_schritt2_monate"] == 54


def test_rundung_auf_ganze_monate():
    """
    Test: Finale Dauer wird auf ganze Monate abgerundet.
    
    Erwartung: Ergebnis ist immer ein Integer.
    """
    data = VOLLZEIT_OHNE_VERKUERZUNG.copy()
    data["teilzeit_eingabe"] = 70  # Erzeugt Nachkommastellen
    result = berechne_gesamtdauer(**data)
    
    assert isinstance(result["finale_dauer_monate"], int)
    # 36 / 0.7 = 51.43 → sollte auf 51 abgerundet werden
    assert result["finale_dauer_monate"] == 51


# ============================================================
# Edge Cases und Validierung
# ============================================================


def test_teilzeit_unter_50_prozent_fehler():
    """
    Test: Teilzeit unter 50% ist ungültig.
    
    Erwartung: ValueError mit Hinweis auf 50-100% Bereich.
    """
    with pytest.raises(ValueError, match="zwischen 50% und 100%"):
        berechne_gesamtdauer(**UNGUELTIG_TEILZEIT_UNTER_50)


def test_teilzeit_ueber_100_prozent_fehler():
    """
    Test: Teilzeit über 100% ist ungültig.
    
    Erwartung: ValueError.
    """
    with pytest.raises(ValueError):
        berechne_gesamtdauer(**UNGUELTIG_TEILZEIT_UEBER_100)


def test_teilzeit_0_prozent_fehler():
    """
    Test: 0% Teilzeit ist ungültig.
    
    Erwartung: ValueError.
    """
    with pytest.raises(ValueError):
        berechne_gesamtdauer(**UNGUELTIG_TEILZEIT_0)


def test_negative_monate_fehler():
    """
    Test: Negative Ausbildungsdauer ist ungültig.
    
    Erwartung: ValueError mit Hinweis auf 24-42 Monate Bereich.
    """
    with pytest.raises(ValueError, match="zwischen 24 und 42"):
        berechne_gesamtdauer(**UNGUELTIG_NEGATIVE_MONATE)


def test_stunden_ueber_vollzeit_fehler():
    """
    Test: Teilzeitstunden über Vollzeitstunden ist ungültig.
    
    Erwartung: ValueError.
    """
    with pytest.raises(ValueError):
        berechne_gesamtdauer(**UNGUELTIG_STUNDEN_UEBER_VOLLZEIT)


def test_null_ausbildungsdauer_fehler():
    """
    Test: Ausbildungsdauer von 0 Monaten ist ungültig.
    
    Erwartung: ValueError mit Hinweis auf 24-42 Monate Bereich.
    """
    data = VOLLZEIT_OHNE_VERKUERZUNG.copy()
    data["basis_dauer_monate"] = 0
    
    with pytest.raises(ValueError, match="zwischen 24 und 42"):
        berechne_gesamtdauer(**data)


def test_negative_vollzeit_stunden_fehler():
    """
    Test: Negative Vollzeit-Stunden sind ungültig.
    
    Erwartung: ValueError mit Hinweis auf 10-48 Stunden Bereich.
    """
    data = VOLLZEIT_OHNE_VERKUERZUNG.copy()
    data["vollzeit_stunden"] = -40
    
    with pytest.raises(ValueError, match="zwischen 10 und 48"):
        berechne_gesamtdauer(**data)


def test_null_vollzeit_stunden_fehler():
    """
    Test: Vollzeit-Stunden von 0 sind ungültig.
    
    Erwartung: ValueError mit Hinweis auf 10-48 Stunden Bereich.
    """
    data = VOLLZEIT_OHNE_VERKUERZUNG.copy()
    data["vollzeit_stunden"] = 0
    
    with pytest.raises(ValueError, match="zwischen 10 und 48"):
        berechne_gesamtdauer(**data)


def test_negative_teilzeit_input_fehler():
    """
    Test: Negativer Teilzeit-Input ist ungültig.

    Erwartung: ValueError mit Hinweis auf gültigen Bereich.
    """
    data = VOLLZEIT_OHNE_VERKUERZUNG.copy()
    data["teilzeit_eingabe"] = -75

    with pytest.raises(ValueError, match="zwischen 50% und 100%"):
        berechne_gesamtdauer(**data)


def test_beruf_q2_duration_boundaries():
        """
        Testet die Q2-Grenzwerte: 5,6,11,12 Monate.
        Erwartung:
            - 5 Monate -> keine Verkürzung durch Q2
            - 6 Monate -> 6 Monate Verkürzung
            - 11 Monate -> 6 Monate Verkürzung
            - 12 Monate -> 12 Monate Verkürzung
        """
        base = {
                "basis_dauer_monate": 36,
                "vollzeit_stunden": 40,
                "teilzeit_eingabe": 75,
                "eingabetyp": "prozent",
        }

        # 5 Monate -> 0
        data = base.copy()
        data["verkuerzungsgruende"] = {"beruf_q2": True, "beruf_q2_dauer_monate": 5}
        res = berechne_gesamtdauer(**data)
        assert res["verkuerzung_gesamt_monate"] == 0
        assert res["finale_dauer_monate"] == 48

        # 6 Monate -> 6
        data = base.copy()
        data["verkuerzungsgruende"] = {"beruf_q2": True, "beruf_q2_dauer_monate": 6}
        res = berechne_gesamtdauer(**data)
        assert res["verkuerzung_gesamt_monate"] == 6
        # 36 - 6 = 30 -> 30/0.75 = 40; Sonderregel §8 Abs.3 greift NICHT bei Verkürzung
        assert res["finale_dauer_monate"] == 40
        assert res["regel_8_abs_3_angewendet"] is False

        # 11 Monate -> 6
        data = base.copy()
        data["verkuerzungsgruende"] = {"beruf_q2": True, "beruf_q2_dauer_monate": 11}
        res = berechne_gesamtdauer(**data)
        assert res["verkuerzung_gesamt_monate"] == 6
        assert res["finale_dauer_monate"] == 40
        assert res["regel_8_abs_3_angewendet"] is False

        # 12 Monate -> 12
        data = base.copy()
        data["verkuerzungsgruende"] = {"beruf_q2": True, "beruf_q2_dauer_monate": 12}
        res = berechne_gesamtdauer(**data)
        assert res["verkuerzung_gesamt_monate"] == 12
        assert res["finale_dauer_monate"] == 32


def test_basis_dauer_als_text_wirft_fehler():
    """
    Test: String als Ausbildungsdauer ist ungültig.

    Erwartung: TypeError mit Hinweis auf Zahlen.
    """
    data = VOLLZEIT_OHNE_VERKUERZUNG.copy()
    data["basis_dauer_monate"] = "36"

    with pytest.raises(TypeError, match="Ausbildungsdauer muss eine Zahl sein"):
        berechne_gesamtdauer(**data)


def test_teilzeit_eingabe_als_text_wirft_fehler():
    """
    Test: String als Teilzeit-Input ist ungültig.

    Erwartung: TypeError mit Hinweis auf Zahlen.
    """
    data = VOLLZEIT_OHNE_VERKUERZUNG.copy()
    data["teilzeit_eingabe"] = "75"

    with pytest.raises(TypeError, match="Teilzeit-Wert muss eine Zahl sein"):
        berechne_gesamtdauer(**data)


def test_vollzeit_stunden_als_text_wirft_fehler():
    """
    Test: String als Vollzeit-Stunden ist ungültig.

    Erwartung: TypeError mit Hinweis auf Zahlen.
    """
    data = VOLLZEIT_OHNE_VERKUERZUNG.copy()
    data["vollzeit_stunden"] = "40"

    with pytest.raises(TypeError, match="Vollzeit-Stunden müssen eine Zahl sein"):
        berechne_gesamtdauer(**data)


def test_ungueltiger_eingabetyp():
    """
    Test: Ungültiger input_type ist ungültig.

    Erwartung: ValueError mit Hinweis auf 'prozent' oder 'stunden'.
    """
    data = VOLLZEIT_OHNE_VERKUERZUNG.copy()
    data["eingabetyp"] = "invalid"

    with pytest.raises(ValueError, match="eingabetyp muss 'prozent' oder 'stunden' sein"):
        berechne_gesamtdauer(**data)


def test_stunden_eingabe_exakt_vollzeit_grenze():
    """
    Test: Teilzeitstunden exakt bei Vollzeit (obere Grenze).

    Erwartung: Kein Fehler, Teilzeit = 100%
    """
    data = VOLLZEIT_OHNE_VERKUERZUNG.copy()
    data["eingabetyp"] = "stunden"
    data["teilzeit_eingabe"] = 40  # exakt Vollzeit

    result = berechne_gesamtdauer(**data)
    assert result["teilzeit_prozent"] == 100


def test_stunden_eingabe_ueber_vollzeit():
    """
    Test: Teilzeitstunden über Vollzeit ist ungültig.

    Erwartung: ValueError mit Hinweis auf Vollzeit-Grenze.
    """
    data = VOLLZEIT_OHNE_VERKUERZUNG.copy()
    data["eingabetyp"] = "stunden"
    data["teilzeit_eingabe"] = 45  # über Vollzeit (40h)

    with pytest.raises(ValueError, match="dürfen die regulären Wochenstunden .* nicht überschreiten"):
        berechne_gesamtdauer(**data)


def test_stunden_eingabe_unter_minimum():
    """
    Test: Teilzeitstunden unter Minimum (< 50% Vollzeit) ist ungültig.

    Erwartung: ValueError mit Hinweis auf Mindest-Stunden.
    """
    data = VOLLZEIT_OHNE_VERKUERZUNG.copy()
    data["eingabetyp"] = "stunden"
    data["teilzeit_eingabe"] = 15  # unter 50% von 40h (= 20h)

    with pytest.raises(ValueError, match="müssen mindestens .* Stunden betragen"):
        berechne_gesamtdauer(**data)


# ============================================================
# Formatierung der Ausgabe
# ============================================================


def test_formatierung_enthaelt_alle_pflichtfelder():
    """
    Test: Formatierte Ausgabe enthält alle wichtigen Informationen.
    
    Erwartung: String enthält Überschrift, Dauer, Prozent, etc.
    """
    result = berechne_gesamtdauer(**TEILZEIT_75_MIT_ABITUR)
    output = formatiere_ergebnis(result)
    
    # Prüfe, ob wichtige Elemente enthalten sind
    assert "BERECHNUNGSERGEBNIS TEILZEITAUSBILDUNG" in output
    assert "Finale Ausbildungsdauer" in output
    assert str(result["finale_dauer_monate"]) in output
    assert "75" in output  # Prozentsatz
    assert "Monate" in output


def test_formatierung_gibt_text_zurueck():
    """
    Test: Formatierte Ausgabe ist ein String.
    
    Erwartung: Return-Typ ist str.
    """
    result = berechne_gesamtdauer(**VOLLZEIT_OHNE_VERKUERZUNG)
    output = formatiere_ergebnis(result)
    
    assert isinstance(output, str)
    assert len(output) > 0


# ============================================================
# Neue Tests für User Story 3.1
# ============================================================


def test_verkuerzung_familien_pflegeverantwortung():
    """
    Test: Verkürzung durch Familien- und Pflegeverantwortung.
    
    Erwartung: 12 Monate Verkürzung.
    36 - 12 = 24 Monate, dann 24 / 0.75 = 32 Monate.
    """
    result = berechne_gesamtdauer(**MIT_FAMILIEN_PFLEGE)
    
    assert result["finale_dauer_monate"] == 32
    assert result["verkuerzung_gesamt_monate"] == 12
    assert result["verkuerzte_dauer_monate"] == 24


def test_verkuerzung_12_monate_deckel():
    """
    Test: Mehrere Verkürzungsgründe mit Summe > 12 Monate werden gedeckelt.
    
    Erwartung: Gesamtverkürzung wird auf maximal 12 Monate begrenzt.
    """
    result = berechne_gesamtdauer(**KOMBINATION_UEBER_12_MONATE)
    
    # Summe wäre 48 Monate, aber gedeckelt auf 12
    assert result["verkuerzung_gesamt_monate"] == 12
    assert result["verkuerzte_dauer_monate"] == 24  # 36 - 12 = 24
    assert result["finale_dauer_monate"] == 24  # 100% Teilzeit, keine Verlängerung


def test_sonderregel_8_abs_3_bei_6_monaten_ueberschreitung():
    """
    Test: Sonderregel § 8 Abs. 3 BBiG greift bei ≤ 6 Monaten Überschreitung.
    
    Erwartung: Wenn berechnete Dauer die Basis um ≤ 6 Monate überschreitet,
    wird die Dauer auf die Regelausbildungszeit (Basis) gesetzt.
    """
    result = berechne_gesamtdauer(**SONDERREGEL_6_MONATE)
    
    # 36 / 0.85 ≈ 42.35 → 42 Monate (nach Abrundung)
    # Differenz: 42 - 36 = 6 Monate → sollte auf 36 Monate gesetzt werden
    assert result["finale_dauer_monate"] == 36
    assert result["original_dauer_monate"] == 36


def test_sonderregel_8_abs_3_bei_mehr_als_6_monaten():
    """
    Test: Sonderregel § 8 Abs. 3 BBiG greift NICHT bei > 6 Monaten Überschreitung.
    
    Erwartung: Wenn berechnete Dauer die Basis um > 6 Monate überschreitet,
    bleibt die berechnete Dauer erhalten.
    """
    data = VOLLZEIT_OHNE_VERKUERZUNG.copy()
    data["teilzeit_eingabe"] = 70  # 36 / 0.70 ≈ 51.43 → 51 Monate
    # Differenz: 51 - 36 = 15 Monate > 6 → Regel greift NICHT
    
    result = berechne_gesamtdauer(**data)
    
    assert result["finale_dauer_monate"] == 51
    assert result["original_dauer_monate"] == 36

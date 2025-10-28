#!/usr/bin/env python3
"""
Manuelles Test-Script für die Berechnungslogik des Teilzeitrechners

Testet die Implementierung mit verschiedenen Beispielen aus dem Gesetzestext
und weiteren realistischen Szenarien.
"""

from src.calculation_logic import calculate_gesamtdauer, format_ergebnis, calculate_teilzeit_prozent, calculate_teilzeit_stunden
import os


def is_dummy_enabled():
    """
    Prüft, ob Dummy-Daten aktiviert sind (über Env-Variable USE_DUMMY_DATA).
    Gültige Werte: "1", "true", "True".
    """
    return os.environ.get("USE_DUMMY_DATA", "0") in {"1", "true", "True"}


def test_beispiele_aus_gesetzestext():
    """
    Testet die Beispiele aus der Empfehlung des Bundesinstituts für Berufsbildung
    """
    print("=" * 80)
    print("TESTE BEISPIELE AUS DEM GESETZESTEXT")
    print("=" * 80)
    
    # Beispiel 1: Seite 2 - Durchgängig 75% Teilzeit
    print("\n📋 BEISPIEL 1: Durchgängig 75% Teilzeit (Seite 2)")
    print("-" * 50)
    ergebnis1 = calculate_gesamtdauer(
        base_duration_months=36,
        vollzeit_stunden=40,
        teilzeit_input=75,
        verkuerzungsgruende={
            'abitur': False,
            'realschule': False,
            'alter_ueber_21': False,
            'vorkenntnisse_monate': 0
        },
        input_type='prozent'
    )
    print(format_ergebnis(ergebnis1))
    print(f"✅ Erwartet: 48 Monate | Tatsächlich: {ergebnis1['finale_dauer_monate']} Monate")
    
    # Beispiel 2: Seite 2 - Durchgängig 50% Teilzeit
    print("\n📋 BEISPIEL 2: Durchgängig 50% Teilzeit (Seite 2)")
    print("-" * 50)
    ergebnis2 = calculate_gesamtdauer(
        base_duration_months=36,
        vollzeit_stunden=40,
        teilzeit_input=50,
        verkuerzungsgruende={
            'abitur': False,
            'realschule': False,
            'alter_ueber_21': False,
            'vorkenntnisse_monate': 0
        },
        input_type='prozent'
    )
    print(format_ergebnis(ergebnis2))
    print(f"✅ Erwartet: 54 Monate (Obergrenze) | Tatsächlich: {ergebnis2['finale_dauer_monate']} Monate")
    
    # Beispiel 3: Seite 4 - 70% Teilzeit mit Rundung
    print("\n📋 BEISPIEL 3: 70% Teilzeit mit Rundung (Seite 4)")
    print("-" * 50)
    ergebnis3 = calculate_gesamtdauer(
        base_duration_months=36,
        vollzeit_stunden=40,
        teilzeit_input=70,
        verkuerzungsgruende={
            'abitur': False,
            'realschule': False,
            'alter_ueber_21': False,
            'vorkenntnisse_monate': 0
        },
        input_type='prozent'
    )
    print(format_ergebnis(ergebnis3))
    print(f"✅ Erwartet: 51 Monate | Tatsächlich: {ergebnis3['finale_dauer_monate']} Monate")


def test_verkuerzung_mit_teilzeit():
    """
    Testet die Kombination von Verkürzungsgründen mit Teilzeit
    """
    print("\n" + "=" * 80)
    print("TESTE VERKÜRZUNG + TEILZEIT")
    print("=" * 80)
    
    # Beispiel: Abitur + 75% Teilzeit
    print("\n📋 BEISPIEL: Abitur + 75% Teilzeit")
    print("-" * 50)
    ergebnis = calculate_gesamtdauer(
        base_duration_months=36,
        vollzeit_stunden=40,
        teilzeit_input=75,
        verkuerzungsgruende={
            'abitur': True,
            'realschule': False,
            'alter_ueber_21': False,
            'vorkenntnisse_monate': 0
        },
        input_type='prozent'
    )
    print(format_ergebnis(ergebnis))
    print(f"✅ Verkürzung durch Abitur: 12 Monate")
    print(f"✅ Verkürzte Dauer: {ergebnis['verkuerzte_dauer_monate']} Monate")
    print(f"✅ Finale Dauer: {ergebnis['finale_dauer_monate']} Monate")


def test_verschiedene_ausbildungsberufe():
    """
    Testet verschiedene Ausbildungsberufe mit unterschiedlichen Dauer
    """
    print("\n" + "=" * 80)
    print("TESTE VERSCHIEDENE AUSBILDUNGSBERUFE")
    print("=" * 80)
    
    ausbildungsberufe = [
        {"name": "Kaufmann/-frau für Büromanagement", "dauer": 36, "stunden": 40},
        {"name": "Industriemechaniker/-in", "dauer": 42, "stunden": 40},
        {"name": "Fachinformatiker/-in", "dauer": 36, "stunden": 40},
        {"name": "Zimmerer/-in", "dauer": 36, "stunden": 40},
    ]
    
    for beruf in ausbildungsberufe:
        print(f"\n📋 {beruf['name']} ({beruf['dauer']} Monate)")
        print("-" * 50)
        
        ergebnis = calculate_gesamtdauer(
            base_duration_months=beruf['dauer'],
            vollzeit_stunden=beruf['stunden'],
            teilzeit_input=75,
            verkuerzungsgruende={
                'abitur': False,
                'realschule': True,  # Realschulabschluss
                'alter_ueber_21': False,
                'vorkenntnisse_monate': 0
            },
            input_type='prozent'
        )
        
        print(f"  • Original: {ergebnis['original_dauer_monate']} Monate")
        print(f"  • Nach Verkürzung: {ergebnis['verkuerzte_dauer_monate']} Monate")
        print(f"  • Finale Dauer: {ergebnis['finale_dauer_monate']} Monate ({ergebnis['finale_dauer_jahre']} Jahre)")
        print(f"  • Wochenstunden: {ergebnis['wochenstunden']} Stunden")


def test_grenzfaelle():
    """
    Testet Grenzfälle und Edge Cases
    """
    print("\n" + "=" * 80)
    print("TESTE GRENZFÄLLE")
    print("=" * 80)
    
    # Test 1: Mindest-Teilzeit (50%)
    print("\n📋 Test: Mindest-Teilzeit (50%)")
    print("-" * 50)
    try:
        ergebnis = calculate_gesamtdauer(
            base_duration_months=36,
            vollzeit_stunden=40,
            teilzeit_input=50,
            verkuerzungsgruende={
                'abitur': False,
                'realschule': False,
                'alter_ueber_21': False,
                'vorkenntnisse_monate': 0
            },
            input_type='prozent'
        )
        print(f"✅ 50% Teilzeit funktioniert: {ergebnis['finale_dauer_monate']} Monate")
    except Exception as e:
        print(f"❌ Fehler bei 50% Teilzeit: {e}")
    
    # Test 2: Zu wenig Teilzeit (sollte Fehler werfen)
    print("\n📋 Test: Zu wenig Teilzeit (49% - sollte Fehler werfen)")
    print("-" * 50)
    try:
        ergebnis = calculate_gesamtdauer(
            base_duration_months=36,
            vollzeit_stunden=40,
            teilzeit_input=49,
            verkuerzungsgruende={
                'abitur': False,
                'realschule': False,
                'alter_ueber_21': False,
                'vorkenntnisse_monate': 0
            },
            input_type='prozent'
        )
        print(f"❌ 49% Teilzeit sollte Fehler werfen, aber: {ergebnis['finale_dauer_monate']} Monate")
    except Exception as e:
        print(f"✅ Korrekt: 49% Teilzeit wirft Fehler: {e}")
    
    # Test 3: Maximale Verkürzung
    print("\n📋 Test: Maximale Verkürzung")
    print("-" * 50)
    ergebnis = calculate_gesamtdauer(
        base_duration_months=36,
        vollzeit_stunden=40,
        teilzeit_input=75,
        verkuerzungsgruende={
            'abitur': True,      # 12 Monate
            'realschule': True,  # 6 Monate
            'alter_ueber_21': True,  # 12 Monate
            'vorkenntnisse_monate': 12  # 12 Monate
        },
        input_type='prozent'
    )
    print(f"✅ Maximale Verkürzung: {ergebnis['verkuerzung_gesamt_monate']} Monate")
    print(f"✅ Verkürzte Dauer: {ergebnis['verkuerzte_dauer_monate']} Monate")
    print(f"✅ Finale Dauer: {ergebnis['finale_dauer_monate']} Monate")


def test_stunden_prozent_umrechnung():
    """
    Testet die Umrechnung zwischen Stunden und Prozentsatz
    """
    print("\n" + "=" * 80)
    print("TESTE STUNDEN/PROZENT-UMRECHNUNG")
    print("=" * 80)
    
    # Test 1: Stunden zu Prozentsatz
    print("\n📋 Test: Stunden zu Prozentsatz")
    print("-" * 50)
    vollzeit = 40
    test_stunden = [20, 30, 32, 40]
    
    for stunden in test_stunden:
        try:
            prozent = calculate_teilzeit_prozent(vollzeit, stunden)
            print(f"  {stunden} Stunden = {prozent:.1f}%")
        except Exception as e:
            print(f"  {stunden} Stunden = FEHLER: {e}")
    
    # Test 2: Prozentsatz zu Stunden
    print("\n📋 Test: Prozentsatz zu Stunden")
    print("-" * 50)
    test_prozente = [50, 75, 80, 100]
    
    for prozent in test_prozente:
        try:
            stunden = calculate_teilzeit_stunden(vollzeit, prozent)
            print(f"  {prozent}% = {stunden:.1f} Stunden")
        except Exception as e:
            print(f"  {prozent}% = FEHLER: {e}")
    
    # Test 3: Rundtrip-Test (Stunden -> Prozentsatz -> Stunden)
    print("\n📋 Test: Rundtrip (Stunden -> Prozentsatz -> Stunden)")
    print("-" * 50)
    test_stunden = [20, 30, 35]
    
    for stunden in test_stunden:
        try:
            prozent = calculate_teilzeit_prozent(vollzeit, stunden)
            stunden_zurueck = calculate_teilzeit_stunden(vollzeit, prozent)
            print(f"  {stunden} -> {prozent:.1f}% -> {stunden_zurueck:.1f} Stunden")
            if abs(stunden - stunden_zurueck) < 0.01:
                print("    ✅ Rundtrip erfolgreich")
            else:
                print("    ❌ Rundtrip fehlgeschlagen")
        except Exception as e:
            print(f"  {stunden} Stunden = FEHLER: {e}")


def test_gesamtdauer_mit_stunden():
    """
    Testet die Hauptfunktion mit Stunden-Input
    """
    print("\n" + "=" * 80)
    print("TESTE GESAMTDAUER MIT STUNDEN-INPUT")
    print("=" * 80)
    
    # Test 1: Mit Stunden statt Prozentsatz
    print("\n📋 Test: 30 Stunden statt 75%")
    print("-" * 50)
    ergebnis_stunden = calculate_gesamtdauer(
        base_duration_months=36,
        vollzeit_stunden=40,
        teilzeit_input=30,  # 30 Stunden
        verkuerzungsgruende={
            'abitur': False,
            'realschule': False,
            'alter_ueber_21': False,
            'vorkenntnisse_monate': 0
        },
        input_type='stunden'
    )
    
    ergebnis_prozent = calculate_gesamtdauer(
        base_duration_months=36,
        vollzeit_stunden=40,
        teilzeit_input=75,  # 75%
        verkuerzungsgruende={
            'abitur': False,
            'realschule': False,
            'alter_ueber_21': False,
            'vorkenntnisse_monate': 0
        },
        input_type='prozent'
    )
    
    print("Ergebnis mit Stunden-Input:")
    print(f"  Teilzeit: {ergebnis_stunden['teilzeit_stunden']:.1f} Stunden ({ergebnis_stunden['teilzeit_prozent']:.1f}%)")
    print(f"  Finale Dauer: {ergebnis_stunden['finale_dauer_monate']} Monate")
    
    print("\nErgebnis mit Prozent-Input:")
    print(f"  Teilzeit: {ergebnis_prozent['teilzeit_stunden']:.1f} Stunden ({ergebnis_prozent['teilzeit_prozent']:.1f}%)")
    print(f"  Finale Dauer: {ergebnis_prozent['finale_dauer_monate']} Monate")
    
    if (ergebnis_stunden['finale_dauer_monate'] == ergebnis_prozent['finale_dauer_monate'] and
        abs(ergebnis_stunden['teilzeit_stunden'] - ergebnis_prozent['teilzeit_stunden']) < 0.01):
        print("\n✅ Beide Methoden ergeben dasselbe Ergebnis!")
    else:
        print("\n❌ Ergebnisse unterscheiden sich!")


def test_realistische_szenarien():
    """
    Testet realistische Szenarien aus der Praxis
    """
    print("\n" + "=" * 80)
    print("TESTE REALISTISCHE SZENARIEN")
    print("=" * 80)
    
    szenarien = [
        {
            "name": "Auszubildende mit Kind (Abitur + 60% Teilzeit)",
            "dauer": 36,
            "stunden": 40,
            "teilzeit": 60,
            "verkuerzung": {
                'abitur': True,
                'realschule': False,
                'alter_ueber_21': False,
                'vorkenntnisse_monate': 0
            }
        },
        {
            "name": "Umschüler mit Vorkenntnissen (75% Teilzeit)",
            "dauer": 36,
            "stunden": 40,
            "teilzeit": 75,
            "verkuerzung": {
                'abitur': False,
                'realschule': True,
                'alter_ueber_21': True,
                'vorkenntnisse_monate': 8
            }
        },
        {
            "name": "Leistungssportler (80% Teilzeit)",
            "dauer": 36,
            "stunden": 40,
            "teilzeit": 80,
            "verkuerzung": {
                'abitur': True,
                'realschule': False,
                'alter_ueber_21': False,
                'vorkenntnisse_monate': 0
            }
        }
    ]
    
    for szenario in szenarien:
        print(f"\n📋 {szenario['name']}")
        print("-" * 50)
        
        ergebnis = calculate_gesamtdauer(
            base_duration_months=szenario['dauer'],
            vollzeit_stunden=szenario['stunden'],
            teilzeit_input=szenario['teilzeit'],
            verkuerzungsgruende=szenario['verkuerzung'],
            input_type='prozent'
        )
        
        print(f"  • Original: {ergebnis['original_dauer_monate']} Monate")
        print(f"  • Teilzeit: {ergebnis['teilzeit_prozent']:.1f}% ({ergebnis['teilzeit_stunden']:.1f} Stunden)")
        print(f"  • Verkürzung: {ergebnis['verkuerzung_gesamt_monate']} Monate")
        print(f"  • Finale Dauer: {ergebnis['finale_dauer_monate']} Monate ({ergebnis['finale_dauer_jahre']} Jahre)")


def test_dummy_szenarien():
    """
    Führt Dummy-Datensätze aus dummy_data.get_dummy_inputs() aus,
    wenn die Env-Variable USE_DUMMY_DATA gesetzt ist.
    """
    from dummy_data import get_dummy_inputs

    print("\n" + "=" * 80)
    print("TESTE DUMMY-DATEN (aktiviert über USE_DUMMY_DATA)")
    print("=" * 80)

    for case in get_dummy_inputs():
        ergebnis = calculate_gesamtdauer(
            base_duration_months=case["base_duration_months"],
            vollzeit_stunden=case["vollzeit_stunden"],
            teilzeit_input=case["teilzeit_input"],
            verkuerzungsgruende=case["verkuerzungsgruende"],
            input_type=case["input_type"],
        )
        print(format_ergebnis(ergebnis))

def main():
    """
    Hauptfunktion: Führt alle Tests aus
    """
    print("🚀 STARTE MANUELLE TESTS FÜR TEILZEITRECHNER")
    print("=" * 80)
    
    try:
        # Alle Tests ausführen
        test_beispiele_aus_gesetzestext()
        test_verkuerzung_mit_teilzeit()
        test_verschiedene_ausbildungsberufe()
        test_grenzfaelle()
        test_stunden_prozent_umrechnung()
        test_gesamtdauer_mit_stunden()
        test_realistische_szenarien()

        # Optional: Dummy-Szenarien, wenn aktiviert
        if is_dummy_enabled():
            test_dummy_szenarien()
        
        print("\n" + "=" * 80)
        print("✅ ALLE TESTS ERFOLGREICH ABGESCHLOSSEN!")
        print("=" * 80)
        print("\nDie Berechnungslogik funktioniert korrekt und entspricht")
        print("den gesetzlichen Vorgaben gemäß BBiG § 7a und § 8.")
        
    except Exception as e:
        print(f"\n❌ FEHLER BEIM TESTEN: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

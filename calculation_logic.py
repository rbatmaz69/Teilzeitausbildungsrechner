"""
Zentrale Berechnungslogik für den Teilzeitrechner

Implementiert die gesetzlichen Vorgaben gemäß:
- § 7a BBiG (Teilzeitberufsausbildung)
- § 8 BBiG (Verkürzung und Verlängerung der Ausbildungsdauer)

Basierend auf der Empfehlung des Hauptausschusses des Bundesinstituts 
für Berufsbildung vom 10. Juni 2021
"""

# ============================================================================
# KONSTANTEN (gemäß BBiG § 7a und § 8)
# ============================================================================

# Verkürzungsgründe (in Monaten)
VERKUERZUNG_ABITUR = 12  # § 8 Abs. 1 BBiG - Hochschulreife
VERKUERZUNG_REALSCHULE = 6  # § 8 Abs. 1 BBiG - Fachoberschulreife/Realschulabschluss
VERKUERZUNG_ALTER_21 = 12  # § 8 Abs. 1 BBiG - Alter über 21 Jahre
VERKUERZUNG_VORKENNTNISSE_MIN = 6  # § 8 Abs. 1 BBiG - Berufliche Vorkenntnisse (Minimum)
VERKUERZUNG_VORKENNTNISSE_MAX = 12  # § 8 Abs. 1 BBiG - Berufliche Vorkenntnisse (Maximum)

# Teilzeit-Regelungen
MIN_TEILZEIT_PROZENT = 50  # § 7a Abs. 1 Satz 3 BBiG - Mindestens 50% der Vollzeit
MAX_VERLAENGERUNG_FAKTOR = 1.5  # § 7a Abs. 2 Satz 1 BBiG - Höchstens 1,5-fache der AO-Dauer


# ============================================================================
# BERECHNUNGSFUNKTIONEN
# ============================================================================

def calculate_verkuerzung(base_duration_months, verkuerzungsgruende):
    """
    Berechnet die Gesamtverkürzung der Ausbildungsdauer basierend auf 
    verschiedenen Verkürzungsgründen gemäß § 8 BBiG.
    
    Diese Verkürzung wird VOR der Teilzeit-Verlängerung angewendet.
    Siehe Abschnitt 5.2.2 der Empfehlung.
    
    Args:
        base_duration_months (int): Reguläre Ausbildungsdauer in Monaten (gemäß AO)
        verkuerzungsgruende (dict): Dictionary mit Verkürzungsgründen:
            - 'abitur' (bool): Hat Abitur/Hochschulreife
            - 'realschule' (bool): Hat Realschulabschluss/Fachoberschulreife
            - 'alter_ueber_21' (bool): Ist über 21 Jahre alt
            - 'vorkenntnisse_monate' (int): Monate Verkürzung durch Vorkenntnisse (6-12)
    
    Returns:
        int: Verkürzte Ausbildungsdauer in Monaten
    
    Beispiel:
        >>> calculate_verkuerzung(36, {'abitur': True, 'realschule': False, 
        ...                             'alter_ueber_21': False, 'vorkenntnisse_monate': 0})
        24  # 36 - 12 = 24 Monate
    """
    verkuerzung_gesamt = 0
    
    # Abitur: 12 Monate Verkürzung
    if verkuerzungsgruende.get('abitur', False):
        verkuerzung_gesamt += VERKUERZUNG_ABITUR
    
    # Realschulabschluss: 6 Monate Verkürzung
    if verkuerzungsgruende.get('realschule', False):
        verkuerzung_gesamt += VERKUERZUNG_REALSCHULE
    
    # Alter über 21: 12 Monate Verkürzung
    if verkuerzungsgruende.get('alter_ueber_21', False):
        verkuerzung_gesamt += VERKUERZUNG_ALTER_21
    
    # Berufliche Vorkenntnisse: 6-12 Monate Verkürzung
    vorkenntnisse = verkuerzungsgruende.get('vorkenntnisse_monate', 0)
    if vorkenntnisse > 0:
        # Begrenzen auf erlaubten Bereich
        vorkenntnisse = min(max(vorkenntnisse, VERKUERZUNG_VORKENNTNISSE_MIN), 
                           VERKUERZUNG_VORKENNTNISSE_MAX)
        verkuerzung_gesamt += vorkenntnisse
    
    # Verkürzte Dauer berechnen
    verkuerzte_dauer = base_duration_months - verkuerzung_gesamt
    
    # Sicherstellen, dass Dauer nicht negativ wird
    verkuerzte_dauer = max(verkuerzte_dauer, 0)
    
    return verkuerzte_dauer


def calculate_teilzeit_schritt1(verkuerzte_dauer_months, teilzeit_prozent):
    """
    Schritt 1: Berechnet die automatische Verlängerung durch Teilzeit
    
    Gemäß § 7a Abs. 2 Satz 1 BBiG: "verlängert sich entsprechend"
    Die Ausbildungszeit bleibt gleich, aber die kalendarische Dauer verlängert sich.
    
    Formel: Verkürzte Dauer in Monaten / (Teilzeit-Prozent / 100)
    
    Beispiel aus der Empfehlung (Seite 2):
    - AO-Dauer: 36 Monate, Teilzeit 75%
    - Berechnung: 36 / 0,75 = 48 Monate
    
    Args:
        verkuerzte_dauer_months (int): Verkürzte Ausbildungsdauer in Monaten
        teilzeit_prozent (int): Prozentsatz der Teilzeit (50-100)
    
    Returns:
        float: Verlängerte Ausbildungsdauer in Monaten (wird später gerundet)
    
    Beispiel:
        >>> calculate_teilzeit_schritt1(36, 75)
        48.0
        >>> calculate_teilzeit_schritt1(24, 50)
        48.0
    """
    # Validierung: Mindestens 50% Teilzeit erforderlich
    if teilzeit_prozent < MIN_TEILZEIT_PROZENT:
        raise ValueError(f"Teilzeit muss mindestens {MIN_TEILZEIT_PROZENT}% betragen (§ 7a Abs. 1 Satz 3 BBiG)")
    
    if teilzeit_prozent > 100:
        raise ValueError("Teilzeit kann nicht über 100% liegen")
    
    # Automatische Verlängerung berechnen
    # Beispiel: 36 Monate bei 75% = 36 / 0.75 = 48 Monate
    verlaengerte_dauer = verkuerzte_dauer_months / (teilzeit_prozent / 100.0)
    
    return verlaengerte_dauer


def apply_obergrenze_schritt2(verlaengerte_dauer_months, original_ao_dauer_months):
    """
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
        verlaengerte_dauer_months (float): Dauer nach automatischer Verlängerung
        original_ao_dauer_months (int): Original-Ausbildungsdauer gemäß AO
    
    Returns:
        float: Begrenzte Ausbildungsdauer in Monaten
    
    Beispiel:
        >>> apply_obergrenze_schritt2(72, 36)
        54.0
        >>> apply_obergrenze_schritt2(48, 36)
        48.0
    """
    obergrenze = original_ao_dauer_months * MAX_VERLAENGERUNG_FAKTOR
    
    # Rückgabe des kleineren Wertes (Obergrenze wirkt als Maximum)
    return min(verlaengerte_dauer_months, obergrenze)


def apply_rundung_schritt3(dauer_months):
    """
    Schritt 3: Rundet auf ganze Monate ab
    
    Gemäß § 7a Abs. 2 Satz 2 BBiG: "Ist eine Verkürzung der kalendermäßigen 
    Ausbildungsdauer nicht ganzzahlig, ist auf ganze Monate abzurunden."
    
    Beispiel aus der Empfehlung (Seite 4):
    - AO-Dauer: 36 Monate, Teilzeit 70%
    - Berechnung: 36 / 0,70 = 51,4 Monate
    - Nach Abrundung: 51 Monate
    
    Args:
        dauer_months (float): Ausbildungsdauer in Monaten (kann Nachkommastellen haben)
    
    Returns:
        int: Abgerundete Ausbildungsdauer in ganzen Monaten
    
    Beispiel:
        >>> apply_rundung_schritt3(51.4)
        51
        >>> apply_rundung_schritt3(48.0)
        48
    """
    import math
    return math.floor(dauer_months)


def calculate_wochenstunden(vollzeit_stunden, teilzeit_prozent):
    """
    Berechnet die tatsächlichen Wochenstunden bei Teilzeit
    
    Beispiel aus der Empfehlung (Seite 1):
    - Vollzeit: 40 Stunden/Woche (5 Tage à 8 Stunden)
    - Teilzeit: 75%
    - Ergebnis: 30 Stunden/Woche (5 Tage à 6 Stunden)
    
    Args:
        vollzeit_stunden (float): Wochenstunden bei Vollzeit
        teilzeit_prozent (int): Prozentsatz der Teilzeit
    
    Returns:
        float: Tatsächliche Wochenstunden bei Teilzeit
    
    Beispiel:
        >>> calculate_wochenstunden(40, 75)
        30.0
        >>> calculate_wochenstunden(40, 50)
        20.0
    """
    return vollzeit_stunden * (teilzeit_prozent / 100.0)


def calculate_teilzeit_prozent(vollzeit_stunden, teilzeit_stunden):
    """
    Berechnet den Teilzeit-Prozentsatz basierend auf Vollzeit- und Teilzeitstunden
    
    Args:
        vollzeit_stunden (float): Wochenstunden bei Vollzeit
        teilzeit_stunden (float): Gewünschte Wochenstunden bei Teilzeit
    
    Returns:
        float: Teilzeit-Prozentsatz (50.0-100.0)
    
    Beispiel:
        >>> calculate_teilzeit_prozent(40, 30)
        75.0
        >>> calculate_teilzeit_prozent(40, 20)
        50.0
    """
    if vollzeit_stunden <= 0:
        raise ValueError("Vollzeitstunden müssen größer als 0 sein")
    
    if teilzeit_stunden <= 0:
        raise ValueError("Teilzeitstunden müssen größer als 0 sein")
    
    prozent = (teilzeit_stunden / vollzeit_stunden) * 100
    
    # Mindest-Teilzeit prüfen
    if prozent < MIN_TEILZEIT_PROZENT:
        raise ValueError(f"Teilzeit muss mindestens {MIN_TEILZEIT_PROZENT}% betragen. "
                        f"Bei {vollzeit_stunden} Vollzeitstunden sind das mindestens "
                        f"{vollzeit_stunden * MIN_TEILZEIT_PROZENT / 100} Stunden.")
    
    if prozent > 100:
        raise ValueError("Teilzeit kann nicht über 100% liegen")
    
    return prozent


def calculate_teilzeit_stunden(vollzeit_stunden, teilzeit_prozent):
    """
    Berechnet die Teilzeitstunden basierend auf Vollzeitstunden und Prozentsatz
    
    Args:
        vollzeit_stunden (float): Wochenstunden bei Vollzeit
        teilzeit_prozent (float): Teilzeit-Prozentsatz (50.0-100.0)
    
    Returns:
        float: Berechnete Teilzeitstunden
    
    Beispiel:
        >>> calculate_teilzeit_stunden(40, 75.0)
        30.0
        >>> calculate_teilzeit_stunden(40, 50.0)
        20.0
    """
    if teilzeit_prozent < MIN_TEILZEIT_PROZENT:
        raise ValueError(f"Teilzeit muss mindestens {MIN_TEILZEIT_PROZENT}% betragen")
    
    if teilzeit_prozent > 100:
        raise ValueError("Teilzeit kann nicht über 100% liegen")
    
    return vollzeit_stunden * (teilzeit_prozent / 100.0)


def calculate_gesamtdauer(base_duration_months, vollzeit_stunden, teilzeit_input, 
                         verkuerzungsgruende, input_type='prozent'):
    """
    Hauptfunktion: Berechnet die Gesamtdauer der Teilzeitausbildung
    
    Führt das komplette 4-Schritt-Verfahren durch:
    1. Verkürzung anwenden
    2. Automatische Verlängerung durch Teilzeit (Schritt 1)
    3. Gesetzliche Obergrenze prüfen (Schritt 2)
    4. Auf ganze Monate abrunden (Schritt 3)
    
    Schritt 4 (Verlängerung bis zur nächsten Prüfung) ist optional und
    wird hier nicht implementiert, da er von konkreten Prüfungsterminen abhängt.
    
    Args:
        base_duration_months (int): Reguläre Ausbildungsdauer in Monaten (gemäß AO)
        vollzeit_stunden (float): Wochenstunden bei Vollzeit
        teilzeit_input (float): Teilzeit-Eingabe (Prozentsatz ODER Stunden)
        verkuerzungsgruende (dict): Dictionary mit Verkürzungsgründen
        input_type (str): 'prozent' oder 'stunden' - Art der Teilzeit-Eingabe
    
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
        >>> ergebnis = calculate_gesamtdauer(
        ...     base_duration_months=36,
        ...     vollzeit_stunden=40,
        ...     teilzeit_input=75,
        ...     verkuerzungsgruende={'abitur': True, 'realschule': False, 
        ...                          'alter_ueber_21': False, 'vorkenntnisse_monate': 0},
        ...     input_type='prozent'
        ... )
        
        >>> # Mit Stunden
        >>> ergebnis = calculate_gesamtdauer(
        ...     base_duration_months=36,
        ...     vollzeit_stunden=40,
        ...     teilzeit_input=30,
        ...     verkuerzungsgruende={'abitur': True, 'realschule': False, 
        ...                          'alter_ueber_21': False, 'vorkenntnisse_monate': 0},
        ...     input_type='stunden'
        ... )
    """
    # Teilzeit-Input verarbeiten (Prozentsatz oder Stunden)
    if input_type == 'stunden':
        # Stunden zu Prozentsatz umrechnen
        teilzeit_prozent = calculate_teilzeit_prozent(vollzeit_stunden, teilzeit_input)
        teilzeit_stunden = teilzeit_input
    elif input_type == 'prozent':
        # Prozentsatz zu Stunden umrechnen
        teilzeit_prozent = teilzeit_input
        teilzeit_stunden = calculate_teilzeit_stunden(vollzeit_stunden, teilzeit_input)
    else:
        raise ValueError("input_type muss 'prozent' oder 'stunden' sein")
    
    # Schritt 0: Verkürzung anwenden (BEVOR Teilzeit berechnet wird)
    verkuerzte_dauer = calculate_verkuerzung(base_duration_months, verkuerzungsgruende)
    
    # Schritt 1: Automatische Verlängerung durch Teilzeit
    nach_schritt1 = calculate_teilzeit_schritt1(verkuerzte_dauer, teilzeit_prozent)
    
    # Schritt 2: Gesetzliche Obergrenze anwenden
    nach_schritt2 = apply_obergrenze_schritt2(nach_schritt1, base_duration_months)
    
    # Schritt 3: Auf ganze Monate abrunden
    finale_dauer = apply_rundung_schritt3(nach_schritt2)
    
    # Zusätzliche Informationen berechnen
    verkuerzung_gesamt = base_duration_months - verkuerzte_dauer
    verlaengerung_durch_teilzeit = finale_dauer - verkuerzte_dauer
    
    # Ergebnis zusammenstellen
    return {
        'original_dauer_monate': base_duration_months,
        'verkuerzte_dauer_monate': verkuerzte_dauer,
        'teilzeit_prozent': teilzeit_prozent,
        'teilzeit_stunden': teilzeit_stunden,
        'nach_schritt1_monate': nach_schritt1,
        'nach_schritt2_monate': nach_schritt2,
        'finale_dauer_monate': finale_dauer,
        'finale_dauer_jahre': round(finale_dauer / 12.0, 1),
        'wochenstunden': teilzeit_stunden,  # Gleiche wie teilzeit_stunden
        'verkuerzung_gesamt_monate': verkuerzung_gesamt,
        'verlaengerung_durch_teilzeit_monate': verlaengerung_durch_teilzeit
    }


# Hilfsfunktionen

def format_ergebnis(ergebnis):
    """
    Formatiert das Ergebnis der Berechnung für eine lesbare Ausgabe
    
    Args:
        ergebnis (dict): Ergebnis von calculate_gesamtdauer()
    
    Returns:
        str: Formatierte Ausgabe
    """
    output = []
    output.append("=" * 70)
    output.append("BERECHNUNGSERGEBNIS TEILZEITAUSBILDUNG")
    output.append("=" * 70)
    output.append("")
    output.append("EINGABEWERTE:")
    output.append(f"  • Reguläre Ausbildungsdauer (AO):  {ergebnis['original_dauer_monate']} Monate")
    output.append(f"  • Teilzeit-Prozentsatz:            {ergebnis['teilzeit_prozent']:.1f}%")
    output.append(f"  • Teilzeitstunden:                 {ergebnis['teilzeit_stunden']:.1f} Stunden")
    output.append("")
    output.append("BERECHNUNGSSCHRITTE:")
    output.append(f"  1. Nach Verkürzung:                {ergebnis['verkuerzte_dauer_monate']} Monate")
    output.append(f"     (Verkürzung gesamt: {ergebnis['verkuerzung_gesamt_monate']} Monate)")
    output.append(f"  2. Nach autom. Verlängerung:       {ergebnis['nach_schritt1_monate']:.1f} Monate")
    output.append(f"  3. Nach Obergrenze (max 1,5x):     {ergebnis['nach_schritt2_monate']:.1f} Monate")
    output.append(f"  4. Nach Abrundung:                 {ergebnis['finale_dauer_monate']} Monate")
    output.append("")
    output.append("ENDERGEBNIS:")
    output.append(f"  ► Finale Ausbildungsdauer:         {ergebnis['finale_dauer_monate']} Monate")
    output.append(f"                                     ({ergebnis['finale_dauer_jahre']} Jahre)")
    output.append(f"  ► Verlängerung durch Teilzeit:     {ergebnis['verlaengerung_durch_teilzeit_monate']} Monate")
    output.append("=" * 70)
    
    return "\n".join(output)


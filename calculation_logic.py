"""
Zentrale Berechnungslogik für den Teilzeitrechner
"""

# Konstanten
VERKUERZUNG_ABITUR = 12
VERKUERZUNG_REALSCHULE = 6
VERKUERZUNG_ALTER_21 = 12
VERKUERZUNG_VORKENNTNISSE_MIN = 6
VERKUERZUNG_VORKENNTNISSE_MAX = 12

MIN_TEILZEIT_PROZENT = 50
MAX_VERLAENGERUNG_FAKTOR = 1.5


# Berechnungsfunktionen

def calculate_verkuerzung(base_duration_months, verkuerzungsgruende):
    """Berechnet die Verkürzung der Ausbildungsdauer.
    
    Args:
        base_duration_months (int): Reguläre Ausbildungsdauer in Monaten
        verkuerzungsgruende (dict): Dictionary mit Verkürzungsgründen
    
    Returns:
        int: Verkürzte Ausbildungsdauer in Monaten
    """
    verkuerzung_gesamt = 0
    
    if verkuerzungsgruende.get('abitur', False):
        verkuerzung_gesamt += VERKUERZUNG_ABITUR
    
    if verkuerzungsgruende.get('realschule', False):
        verkuerzung_gesamt += VERKUERZUNG_REALSCHULE
    
    if verkuerzungsgruende.get('alter_ueber_21', False):
        verkuerzung_gesamt += VERKUERZUNG_ALTER_21
    
    vorkenntnisse = verkuerzungsgruende.get('vorkenntnisse_monate', 0)
    if vorkenntnisse > 0:
        vorkenntnisse = min(max(vorkenntnisse, VERKUERZUNG_VORKENNTNISSE_MIN), 
                           VERKUERZUNG_VORKENNTNISSE_MAX)
        verkuerzung_gesamt += vorkenntnisse
    
    verkuerzte_dauer = base_duration_months - verkuerzung_gesamt
    verkuerzte_dauer = max(verkuerzte_dauer, 0)
    
    return verkuerzte_dauer


def calculate_teilzeit_schritt1(verkuerzte_dauer_months, teilzeit_prozent):
    """Berechnet die automatische Verlängerung durch Teilzeit.
    
    Args:
        verkuerzte_dauer_months (int): Verkürzte Ausbildungsdauer in Monaten
        teilzeit_prozent (int): Prozentsatz der Teilzeit (50-100)
    
    Returns:
        float: Verlängerte Ausbildungsdauer in Monaten
    """
    if teilzeit_prozent < MIN_TEILZEIT_PROZENT:
        raise ValueError(f"Teilzeit muss mindestens {MIN_TEILZEIT_PROZENT}% betragen")
    
    if teilzeit_prozent > 100:
        raise ValueError("Teilzeit kann nicht über 100% liegen")
    
    verlaengerte_dauer = verkuerzte_dauer_months / (teilzeit_prozent / 100.0)
    
    return verlaengerte_dauer


def apply_obergrenze_schritt2(verlaengerte_dauer_months, original_ao_dauer_months):
    """Wendet die gesetzliche Obergrenze an.
    
    Args:
        verlaengerte_dauer_months (float): Dauer nach automatischer Verlängerung
        original_ao_dauer_months (int): Original-Ausbildungsdauer
    
    Returns:
        float: Begrenzte Ausbildungsdauer in Monaten
    """
    obergrenze = original_ao_dauer_months * MAX_VERLAENGERUNG_FAKTOR
    return min(verlaengerte_dauer_months, obergrenze)


def apply_rundung_schritt3(dauer_months):
    """Rundet auf ganze Monate ab.
    
    Args:
        dauer_months (float): Ausbildungsdauer in Monaten
    
    Returns:
        int: Abgerundete Ausbildungsdauer in ganzen Monaten
    """
    import math
    return math.floor(dauer_months)


def calculate_wochenstunden(vollzeit_stunden, teilzeit_prozent):
    """Berechnet die tatsächlichen Wochenstunden bei Teilzeit.
    
    Args:
        vollzeit_stunden (float): Wochenstunden bei Vollzeit
        teilzeit_prozent (int): Prozentsatz der Teilzeit
    
    Returns:
        float: Tatsächliche Wochenstunden bei Teilzeit
    """
    return vollzeit_stunden * (teilzeit_prozent / 100.0)


def calculate_teilzeit_prozent(vollzeit_stunden, teilzeit_stunden):
    """Berechnet den Teilzeit-Prozentsatz.
    
    Args:
        vollzeit_stunden (float): Wochenstunden bei Vollzeit
        teilzeit_stunden (float): Gewünschte Wochenstunden bei Teilzeit
    
    Returns:
        float: Teilzeit-Prozentsatz (50.0-100.0)
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
    """Berechnet die Teilzeitstunden.
    
    Args:
        vollzeit_stunden (float): Wochenstunden bei Vollzeit
        teilzeit_prozent (float): Teilzeit-Prozentsatz (50.0-100.0)
    
    Returns:
        float: Berechnete Teilzeitstunden
    """
    if teilzeit_prozent < MIN_TEILZEIT_PROZENT:
        raise ValueError(f"Teilzeit muss mindestens {MIN_TEILZEIT_PROZENT}% betragen")
    
    if teilzeit_prozent > 100:
        raise ValueError("Teilzeit kann nicht über 100% liegen")
    
    return vollzeit_stunden * (teilzeit_prozent / 100.0)


def calculate_gesamtdauer(base_duration_months, vollzeit_stunden, teilzeit_input, 
                         verkuerzungsgruende, input_type='prozent'):
    """Berechnet die Gesamtdauer der Teilzeitausbildung.
    
    Args:
        base_duration_months (int): Reguläre Ausbildungsdauer in Monaten
        vollzeit_stunden (float): Wochenstunden bei Vollzeit
        teilzeit_input (float): Teilzeit-Eingabe (Prozentsatz ODER Stunden)
        verkuerzungsgruende (dict): Dictionary mit Verkürzungsgründen
        input_type (str): 'prozent' oder 'stunden' - Art der Teilzeit-Eingabe
    
    Returns:
        dict: Alle Berechnungsergebnisse
    """
    if input_type == 'stunden':
        teilzeit_prozent = calculate_teilzeit_prozent(vollzeit_stunden, teilzeit_input)
        teilzeit_stunden = teilzeit_input
    elif input_type == 'prozent':
        teilzeit_prozent = teilzeit_input
        teilzeit_stunden = calculate_teilzeit_stunden(vollzeit_stunden, teilzeit_input)
    else:
        raise ValueError("input_type muss 'prozent' oder 'stunden' sein")
    
    verkuerzte_dauer = calculate_verkuerzung(base_duration_months, verkuerzungsgruende)
    nach_schritt1 = calculate_teilzeit_schritt1(verkuerzte_dauer, teilzeit_prozent)
    nach_schritt2 = apply_obergrenze_schritt2(nach_schritt1, base_duration_months)
    finale_dauer = apply_rundung_schritt3(nach_schritt2)
    
    verkuerzung_gesamt = base_duration_months - verkuerzte_dauer
    verlaengerung_durch_teilzeit = finale_dauer - verkuerzte_dauer
    return {
        'original_dauer_monate': base_duration_months,
        'verkuerzte_dauer_monate': verkuerzte_dauer,
        'teilzeit_prozent': teilzeit_prozent,
        'teilzeit_stunden': teilzeit_stunden,
        'nach_schritt1_monate': nach_schritt1,
        'nach_schritt2_monate': nach_schritt2,
        'finale_dauer_monate': finale_dauer,
        'finale_dauer_jahre': round(finale_dauer / 12.0, 1),
        'wochenstunden': teilzeit_stunden,
        'verkuerzung_gesamt_monate': verkuerzung_gesamt,
        'verlaengerung_durch_teilzeit_monate': verlaengerung_durch_teilzeit
    }


# Hilfsfunktionen

def format_ergebnis(ergebnis):
    """Formatiert das Ergebnis für eine lesbare Ausgabe.
    
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


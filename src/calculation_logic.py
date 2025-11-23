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

# Verkürzungsgründe (in Monaten – feste Maximalwerte)
VERKUERZUNG_ABITUR = 12  # § 8 Abs. 1 BBiG - Hochschulreife
VERKUERZUNG_REALSCHULE = 6  # § 8 Abs. 1 BBiG - Fachoberschulreife/Realschulabschluss
VERKUERZUNG_ALTER_21 = 12  # § 8 Abs. 1 BBiG - Alter über 21 Jahre
# § 8 Abs. 1 BBiG - Berufliche Vorkenntnisse (bis zu 12 Monate → fester Wert 12)
VERKUERZUNG_VORKENNTNISSE = 12
# Familien- und Pflegeverantwortung (bis zu 12 Monate → fester Wert 12)
VERKUERZUNG_FAMILIEN_PFLEGE = 12

# Maximale Gesamtsumme aller Verkürzungen (Regel der zuständigen Stelle)
MAX_GESAMT_VERKUERZUNG_MONATE = 12

# Teilzeit-Regelungen
MIN_TEILZEIT_PROZENT = 50  # § 7a Abs. 1 Satz 3 BBiG - Mindestens 50% der Vollzeit
MAX_VERLAENGERUNG_FAKTOR = (
    1.5  # § 7a Abs. 2 Satz 1 BBiG - Höchstens 1,5-fache der AO-Dauer
)

# ============================================================================
# BERECHNUNGSFUNKTIONEN
# ============================================================================


def berechne_verkuerzung(basis_dauer_monate, verkuerzungsgruende):
    """
    Berechnet die Gesamtverkürzung der Ausbildungsdauer basierend auf
    verschiedenen Verkürzungsgründen gemäß § 8 BBiG.

    Diese Verkürzung wird VOR der Teilzeit-Verlängerung angewendet.
    Siehe Abschnitt 5.2.2 der Empfehlung.

    Args:
        basis_dauer_monate (int): Reguläre Ausbildungsdauer in Monaten (gemäß AO)
        verkuerzungsgruende (dict): Dictionary mit Verkürzungsgründen:
            - 'abitur' (bool): Hat Abitur/Hochschulreife
            - 'realschule' (bool): Hat Realschulabschluss/Fachoberschulreife
            - 'alter_ueber_21' (bool): Ist über 21 Jahre alt
            - 'familien_pflegeverantwortung' (bool): Hat Familien- oder
              Pflegeverantwortung
            - 'vorkenntnisse_monate' (int): Berufliche Vorkenntnisse,
              wird auf einen festen Wert von 12 Monaten abgebildet, sobald > 0

    Returns:
        int: Verkürzte Ausbildungsdauer in Monaten

    Beispiel:
        >>> berechne_verkuerzung(36, {'abitur': True, 'realschule': False,
        ...      'alter_ueber_21': False, 'vorkenntnisse_monate': 0})
        24  # 36 - 12 = 24 Monate
    """
    verkuerzung_gesamt = 0

    # Abitur: 12 Monate Verkürzung
    if verkuerzungsgruende.get("abitur", False):
        verkuerzung_gesamt += VERKUERZUNG_ABITUR

    # Realschulabschluss: 6 Monate Verkürzung
    if verkuerzungsgruende.get("realschule", False):
        verkuerzung_gesamt += VERKUERZUNG_REALSCHULE

    # Alter über 21: 12 Monate Verkürzung
    if verkuerzungsgruende.get("alter_ueber_21", False):
        verkuerzung_gesamt += VERKUERZUNG_ALTER_21

    # Familien- und Pflegeverantwortung: 12 Monate Verkürzung
    if verkuerzungsgruende.get("familien_pflegeverantwortung", False):
        verkuerzung_gesamt += VERKUERZUNG_FAMILIEN_PFLEGE

    # Berufliche Vorkenntnisse: bis zu 12 Monate → fester Wert 12, sobald vorhanden
    vorkenntnisse = verkuerzungsgruende.get("vorkenntnisse_monate", 0)
    if vorkenntnisse and vorkenntnisse > 0:
        verkuerzung_gesamt += VERKUERZUNG_VORKENNTNISSE

    # Gesamtverkürzung darf maximal 12 Monate betragen (Regel der zuständigen Stelle)
    verkuerzung_final = min(verkuerzung_gesamt, MAX_GESAMT_VERKUERZUNG_MONATE)

    # Verkürzte Dauer berechnen
    verkuerzte_dauer = basis_dauer_monate - verkuerzung_final

    # Sicherstellen, dass Dauer nicht negativ wird
    verkuerzte_dauer = max(verkuerzte_dauer, 0)

    return verkuerzte_dauer, verkuerzung_gesamt


def berechne_teilzeit_schritt1(verkuerzte_dauer_monate, teilzeit_prozent):
    """
    Schritt 1: Berechnet die automatische Verlängerung durch Teilzeit

    Gemäß § 7a Abs. 2 Satz 1 BBiG: "verlängert sich entsprechend"
    Die Ausbildungszeit bleibt gleich, aber die kalendarische Dauer verlängert sich.

    Formel: Verkürzte Dauer in Monaten / (Teilzeit-Prozent / 100)

    Beispiel aus der Empfehlung (Seite 2):
    - AO-Dauer: 36 Monate, Teilzeit 75%
    - Berechnung: 36 / 0,75 = 48 Monate

    Args:
        verkuerzte_dauer_monate (int): Verkürzte Ausbildungsdauer in Monaten
        teilzeit_prozent (int): Prozentsatz der Teilzeit (50-100)

    Returns:
        float: Verlängerte Ausbildungsdauer in Monaten (wird später gerundet)

    Beispiel:
        >>> berechne_teilzeit_schritt1(36, 75)
        48.0
        >>> berechne_teilzeit_schritt1(24, 50)
        48.0
    """
    # Automatische Verlängerung berechnen
    # Beispiel: 36 Monate bei 75% = 36 / 0.75 = 48 Monate
    verlaengerte_dauer = verkuerzte_dauer_monate / (teilzeit_prozent / 100.0)

    return verlaengerte_dauer


def obergrenze_anwenden_schritt2(
    verlaengerte_dauer_monate: float,
    original_ao_dauer_monate: int,
) -> int:
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
        verlaengerte_dauer_monate (float): Dauer nach automatischer Verlängerung
        original_ao_dauer_monate (int): Original-Ausbildungsdauer gemäß AO

    Returns:
        float: Begrenzte Ausbildungsdauer in Monaten

    Beispiel:
        >>> obergrenze_anwenden_schritt2(72, 36)
        54.0
        >>> obergrenze_anwenden_schritt2(48, 36)
        48.0
    """
    obergrenze = original_ao_dauer_monate * MAX_VERLAENGERUNG_FAKTOR

    # Rückgabe des kleineren Wertes (Obergrenze wirkt als Maximum)
    return min(verlaengerte_dauer_monate, obergrenze)


def rundung_anwenden_schritt3(dauer_monate: float) -> int:
    """
    Schritt 3: Rundet auf ganze Monate ab

    Gemäß § 7a Abs. 2 Satz 2 BBiG: "Ist eine Verkürzung der kalendermäßigen
    Ausbildungsdauer nicht ganzzahlig, ist auf ganze Monate abzurunden."

    Beispiel aus der Empfehlung (Seite 4):
    - AO-Dauer: 36 Monate, Teilzeit 70%
    - Berechnung: 36 / 0,70 = 51,4 Monate
    - Nach Abrundung: 51 Monate

    Args:
        dauer_monate (float): Ausbildungsdauer in Monaten (kann Nachkommastellen haben)

    Returns:
        int: Abgerundete Ausbildungsdauer in ganzen Monaten

    Beispiel:
        >>> rundung_anwenden_schritt3(51.4)
        51
        >>> rundung_anwenden_schritt3(48.0)
        48
    """
    import math

    return math.floor(dauer_monate)


def berechne_teilzeit_prozent(vollzeit_stunden, teilzeit_stunden):
    """
    Berechnet den Teilzeit-Prozentsatz basierend auf Vollzeit- und Teilzeitstunden

    Args:
        vollzeit_stunden (float): Wochenstunden bei Vollzeit
        teilzeit_stunden (float): Gewünschte Wochenstunden bei Teilzeit

    Returns:
        float: Teilzeit-Prozentsatz (50.0-100.0)

    Beispiel:
        >>> berechne_teilzeit_prozent(40, 30)
        75.0
        >>> berechne_teilzeit_prozent(40, 20)
        50.0
    """
    prozent = (teilzeit_stunden / vollzeit_stunden) * 100
    return prozent


def berechne_teilzeit_stunden(vollzeit_stunden, teilzeit_prozent):
    """
    Berechnet die Teilzeitstunden basierend auf Vollzeitstunden und Prozentsatz

    Args:
        vollzeit_stunden (float): Wochenstunden bei Vollzeit
        teilzeit_prozent (float): Teilzeit-Prozentsatz (50.0-100.0)

    Returns:
        float: Berechnete Teilzeitstunden

    Beispiel:
        >>> berechne_teilzeit_stunden(40, 75.0)
        30.0
        >>> berechne_teilzeit_stunden(40, 50.0)
        20.0
    """
    return vollzeit_stunden * (teilzeit_prozent / 100.0)


def berechne_gesamtdauer(
    basis_dauer_monate,
    vollzeit_stunden,
    teilzeit_eingabe,
    verkuerzungsgruende,
    eingabetyp="prozent",
):
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
        basis_dauer_monate (int): Reguläre Ausbildungsdauer in Monaten (gemäß AO)
        vollzeit_stunden (float): Wochenstunden bei Vollzeit
        teilzeit_eingabe (float): Teilzeit-Eingabe (Prozentsatz ODER Stunden)
        verkuerzungsgruende (dict): Dictionary mit Verkürzungsgründen
        eingabetyp (str): 'prozent' oder 'stunden' - Art der Teilzeit-Eingabe

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
        >>> ergebnis = berechne_gesamtdauer(
        ...     basis_dauer_monate=36,
        ...     vollzeit_stunden=40,
        ...     teilzeit_eingabe=75,
        ...     verkuerzungsgruende={'abitur': True, 'realschule': False,
        ...                          'alter_ueber_21': False,
        ...                          'vorkenntnisse_monate': 0},
        ...     eingabetyp='prozent'
        ... )

        >>> # Mit Stunden
        >>> ergebnis = berechne_gesamtdauer(
        ...     basis_dauer_monate=36,
        ...     vollzeit_stunden=40,
        ...     teilzeit_eingabe=30,
        ...     verkuerzungsgruende={'abitur': True, 'realschule': False,
        ...                          'alter_ueber_21': False,
        ...                          'vorkenntnisse_monate': 0},
        ...     eingabetyp='stunden'
        ... )
    """
    # Eingabevalidierung (User Story 24): Nur Zahlen erlaubt
    if not isinstance(basis_dauer_monate, (int, float)):
        raise TypeError("Ausbildungsdauer muss eine Zahl sein")
    if not isinstance(vollzeit_stunden, (int, float)):
        raise TypeError("Vollzeit-Stunden müssen eine Zahl sein")
    if not isinstance(teilzeit_eingabe, (int, float)):
        raise TypeError("Teilzeit-Wert muss eine Zahl sein")

    # Wert-Validierung: Gültige Bereiche gemäß HTML-Eingabefeldern (IHK: 24-42 Monate)
    if basis_dauer_monate < 24 or basis_dauer_monate > 42:
        raise ValueError(
            "Ausbildungsdauer muss zwischen 24 und 42 Monaten liegen (IHK-Ausbildungen)"
        )
    if vollzeit_stunden < 10 or vollzeit_stunden > 48:
        raise ValueError("Vollzeit-Stunden müssen zwischen 10 und 48 Stunden liegen")

    # Zusätzliche Validierung je nach eingabetyp
    if eingabetyp == "prozent":
        # Gemäß § 7a Abs. 1 Satz 3 BBiG: Mindestens 50% der Vollzeit
        if teilzeit_eingabe < 50 or teilzeit_eingabe > 100:
            raise ValueError(
                "Teilzeit-Anteil muss zwischen 50% und 100% liegen "
                "(§ 7a Abs. 1 Satz 3 BBiG)"
            )
    elif eingabetyp == "stunden":
        # Mindestens die Hälfte der Vollzeit-Stunden, maximal Vollzeit
        min_stunden = vollzeit_stunden / 2
        if teilzeit_eingabe < min_stunden:
            raise ValueError(
                f"Wochenstunden müssen mindestens {min_stunden} Stunden "
                f"betragen (Hälfte der regulären Wochenstunden, "
                f"§ 7a Abs. 1 Satz 3 BBiG)"
            )
        if teilzeit_eingabe > vollzeit_stunden:
            raise ValueError(
                f"Wochenstunden dürfen die regulären Wochenstunden "
                f"({vollzeit_stunden}) nicht überschreiten"
            )
    else:
        raise ValueError("eingabetyp muss 'prozent' oder 'stunden' sein")

    # Teilzeit-Eingabe verarbeiten (Prozentsatz oder Stunden)
    if eingabetyp == "stunden":
        # Stunden zu Prozentsatz umrechnen
        teilzeit_prozent = berechne_teilzeit_prozent(vollzeit_stunden, teilzeit_eingabe)
        teilzeit_stunden = teilzeit_eingabe
    else:  # eingabetyp == "prozent"
        # Prozentsatz zu Stunden umrechnen
        teilzeit_prozent = teilzeit_eingabe
        teilzeit_stunden = berechne_teilzeit_stunden(vollzeit_stunden, teilzeit_eingabe)

    # Schritt 0: Verkürzung anwenden (BEVOR Teilzeit berechnet wird)
    verkuerzte_dauer, verkuerzung_gesamt_ohne_begrenzung = \
        berechne_verkuerzung(
            basis_dauer_monate,
            verkuerzungsgruende
        )

    # Schritt 1: Automatische Verlängerung durch Teilzeit
    nach_schritt1 = berechne_teilzeit_schritt1(verkuerzte_dauer, teilzeit_prozent)

    # Schritt 2: Gesetzliche Obergrenze anwenden
    nach_schritt2 = obergrenze_anwenden_schritt2(nach_schritt1, basis_dauer_monate)

    # Schritt 3: Auf ganze Monate abrunden
    finale_dauer = rundung_anwenden_schritt3(nach_schritt2)

    # Sonderregel § 8 Abs. 3 BBiG:
    # Wenn die berechnete Ausbildungsdauer die Regelausbildungszeit
    # um höchstens 6 Monate überschreitet, ist die Regelausbildungszeit
    # als Ergebnis zu setzen (kein Nachteil für Auszubildende).
    regel_8_abs_3_angewendet = False
    if finale_dauer > basis_dauer_monate:
        differenz = finale_dauer - basis_dauer_monate
        if differenz <= 6:
            finale_dauer = basis_dauer_monate
            regel_8_abs_3_angewendet = True

    # Zusätzliche Informationen berechnen
    verkuerzung_gesamt = basis_dauer_monate - verkuerzte_dauer
    verlaengerung_durch_teilzeit = finale_dauer - verkuerzte_dauer

    # Ergebnis zusammenstellen
    return {
        "original_dauer_monate": basis_dauer_monate,
        "verkuerzte_dauer_monate": verkuerzte_dauer,
        "teilzeit_prozent": teilzeit_prozent,
        "teilzeit_stunden": teilzeit_stunden,
        "nach_schritt1_monate": nach_schritt1,
        "nach_schritt2_monate": nach_schritt2,
        "finale_dauer_monate": finale_dauer,
        "finale_dauer_jahre": round(finale_dauer / 12.0, 1),
        "wochenstunden": teilzeit_stunden,  # Gleiche wie teilzeit_stunden
        "verkuerzung_gesamt_monate": verkuerzung_gesamt,
        "verlaengerung_durch_teilzeit_monate": verlaengerung_durch_teilzeit,
        "verkuerzung_gesamt_ohne_begrenzung": verkuerzung_gesamt_ohne_begrenzung,
        "regel_8_abs_3_angewendet": regel_8_abs_3_angewendet,
    }


# Hilfsfunktionen


def formatiere_ergebnis(ergebnis):
    """
    Formatiert das Ergebnis der Berechnung für eine lesbare Ausgabe

    Args:
        ergebnis (dict): Ergebnis von berechne_gesamtdauer()

    Returns:
        str: Formatierte Ausgabe
    """
    ausgabe = []
    ausgabe.append("=" * 70)
    ausgabe.append("BERECHNUNGSERGEBNIS TEILZEITAUSBILDUNG")
    ausgabe.append("=" * 70)
    ausgabe.append("")
    ausgabe.append("EINGABEWERTE:")
    ausgabe.append(
        f"  • Reguläre Ausbildungsdauer (AO):  "
        f"{ergebnis['original_dauer_monate']} Monate"
    )
    ausgabe.append(
        f"  • Teilzeit-Prozentsatz:            "
        f"{ergebnis['teilzeit_prozent']:.1f}%"
    )
    ausgabe.append(
        f"  • Teilzeitstunden:                 "
        f"{ergebnis['teilzeit_stunden']:.1f} Stunden"
    )
    ausgabe.append("")
    ausgabe.append("BERECHNUNGSSCHRITTE:")
    ausgabe.append(
        f"  1. Nach Verkürzung:                "
        f"{ergebnis['verkuerzte_dauer_monate']} Monate"
    )
    ausgabe.append(
        f"     (Verkürzung gesamt: "
        f"{ergebnis['verkuerzung_gesamt_monate']} Monate)"
    )
    ausgabe.append(
        f"  2. Nach autom. Verlängerung:       "
        f"{ergebnis['nach_schritt1_monate']:.1f} Monate"
    )
    ausgabe.append(
        f"  3. Nach Obergrenze (max 1,5x):     "
        f"{ergebnis['nach_schritt2_monate']:.1f} Monate"
    )
    ausgabe.append(
        f"  4. Nach Abrundung:                 "
        f"{ergebnis['finale_dauer_monate']} Monate"
    )
    ausgabe.append("")
    ausgabe.append("ENDERGEBNIS:")
    ausgabe.append(
        f"  ► Finale Ausbildungsdauer:         "
        f"{ergebnis['finale_dauer_monate']} Monate"
    )
    ausgabe.append(
        f"                                     "
        f"({ergebnis['finale_dauer_jahre']} Jahre)"
    )
    ausgabe.append(
        f"  ► Verlängerung durch Teilzeit:     "
        f"{ergebnis['verlaengerung_durch_teilzeit_monate']} Monate"
    )
    ausgabe.append("=" * 70)

    return "\n".join(ausgabe)

/* script_Ergebnis_Übersicht.js – i18n-fähige Ergebnislogik */

// Kurz-Helfer
const $ = (selektor) => document.querySelector(selektor);
function setzeText(selektor, text) {
  const element = $(selektor);
  if (element) element.textContent = text;
}
function zeige(element) {
  if (element) element.hidden = false;
}
function verberge(element) {
  if (element) element.hidden = true;
}

// i18n Helfer (nutzt die globale API aus script_Sprache_Auswaehlen.js)
function uebersetzung(schluessel, fallback) {
  if (window.I18N && typeof window.I18N.t === "function") {
    return window.I18N.t(schluessel, fallback);
  }
  return fallback ?? schluessel;
}

function aktuelleSprache() {
  return (window.I18N && window.I18N.lang) || "de";
}


// Zustand merken, damit wir bei Sprachwechsel neu rendern können
let LETZTE_EINGABEN = null;
let LETZTE_BERECHNUNG = null;

/**
 * Sammelt alle Verkürzungsgründe und gibt sie als Objekt zurück,
 * das direkt an das Backend geschickt werden kann.
 */
function collectVerkuerzungsgruende() {
  const result = {
    abitur: false,
    realschule: false,
    alter_ueber_21: false,
    familien_pflegeverantwortung: false,
    vorkenntnisse_monate: 0
  };

  // 1) Alle Checkbox-Kacheln mit data-vk-field
  const checkboxInputs = document.querySelectorAll(
    '#vk-fieldset input[type="checkbox"][data-vk-field]'
  );

  checkboxInputs.forEach((input) => {
    if (!input.checked) return;

    const field = input.dataset.vkField;
    const months = Number(input.dataset.vkMonths || 0);

    if (field === "vorkenntnisse_monate") {
      // mehrere Kacheln könnten Monate addieren
      result.vorkenntnisse_monate += months;
    } else {
      // boolsche Flags
      result[field] = true;
    }
  });

  // 2) Schulabschluss-Select (Single-Choice)
  const schoolSelect = document.querySelector('select[data-vk-type="school-select"]');
  if (schoolSelect) {
    const selectedOption = schoolSelect.selectedOptions[0];
    if (selectedOption) {
      const fields = (selectedOption.dataset.vkSetFields || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      fields.forEach((f) => {
        if (f in result) {
          result[f] = true;
        } else {
          // falls Backend später neue Felder erwartet
          result[f] = true;
        }
      });
    }
  }

  return result;
}

/**
 * Holt die Berechnungsergebnisse vom Backend.
 *
 * Sammelt Formularwerte, sendet sie an den API-Endpunkt und normalisiert
 * das Ergebnis für die tabellarische Darstellung.
 */
async function holeZusammenfassung() {
  const basisMonateElement = document.getElementById("dauer");
  const wochenstundenElement = document.getElementById("stunden");
  const prozentElement = document.getElementById("teilzeitProzent");

  const basisMonate = Number(basisMonateElement?.value || 0);
  const wochenstunden = Number(wochenstundenElement?.value || 0);
  const teilzeitProzent = Number(prozentElement?.value || 0);

  const verkuerzungsgruende = collectVerkuerzungsgruende();

  const nutzdaten = {
    basis_dauer_monate: basisMonate,
    vollzeit_stunden: wochenstunden,
    teilzeit_eingabe: teilzeitProzent,
    eingabetyp: "prozent",
    verkuerzungsgruende
  };

  const antwort = await fetch("/api/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(nutzdaten)
  });

  if (!antwort.ok) {
    let nachricht = uebersetzung("errors.fetch", "Fehler beim Laden der Daten");
    try {
      const fehler = await antwort.json();
      nachricht = fehler?.error?.message || nachricht;
    } catch (error) {
      console.warn("Fehler beim Verarbeiten der Antwort:", error);
    }
    throw new Error(nachricht);
  }

  const daten = await antwort.json();
  const ergebnis = daten.result || {};

  const gesamtMonate = Number(ergebnis.finale_dauer_monate || 0);
  const verlaengerungMonate = Number(ergebnis.verlaengerung_durch_teilzeit_monate || 0);
  const gesamteVerkuerzungMonate = Number(ergebnis.verkuerzung_gesamt_monate || 0);
  const gesamteVerkuerzungMonateOhneBegrenzung = Number(ergebnis.verkuerzung_gesamt_ohne_begrenzung || 0);
  const neueBasis = Number(ergebnis.verkuerzte_dauer_monate || 0);
  const regel8Abs3Angewendet = Boolean(ergebnis.regel_8_abs_3_angewendet || false);

  // Anzeige-Liste der gewählten Verkürzungsgründe aus dem Objekt bauen
  const verkuerzungen = [];

  if (verkuerzungsgruende.abitur) {
    verkuerzungen.push({ key: "abitur", months: 12 });
  }
  if (verkuerzungsgruende.realschule) {
    verkuerzungen.push({ key: "realschule", months: 6 });
  }
  if (verkuerzungsgruende.alter_ueber_21) {
    verkuerzungen.push({ key: "alter_ueber_21", months: 12 });
  }
  if (verkuerzungsgruende.vorkenntnisse_monate && verkuerzungsgruende.vorkenntnisse_monate > 0) {
    verkuerzungen.push({
      key: "vorkenntnisse",
      months: verkuerzungsgruende.vorkenntnisse_monate
    });
  }
  if (verkuerzungsgruende.familien_pflegeverantwortung) {
    verkuerzungen.push({ key: "familien_pflegeverantwortung", months: 12 });
  }

  return {
    eingaben: {
      basisMonate,
      wochenstunden,
      teilzeitProzent,
      verkuerzungen
    },
    berechnung: {
      verlaengerungMonate,
      gesamteVerkuerzungMonate,
      gesamteVerkuerzungMonateOhneBegrenzung,
      neueBasis,
      gesamtMonate,
      gesamtJahre: Math.round((gesamtMonate / 12) * 10) / 10,
      regel8Abs3Angewendet
    }
  };
}

/**
 * Füllt die Übersichtstabelle der Eingaben (mit i18n).
 *
 * @param {Object} eingaben - Vorverarbeitete Eingabewerte aus holeZusammenfassung().
 * @param {Object} berechnung - Berechnungsergebnisse zur Darstellung der Verkürzungen.
 */
function fuelleEingabenliste(eingaben, berechnung) {
  const liste = $("#inputs-list");
  if (!liste) return;
  
  // Prüfe zuerst, ob wir überhaupt Daten haben
  // Wenn keine Daten vorhanden sind, nicht leeren (behalte bestehenden Inhalt)
  if (!eingaben || !berechnung) {
    return;
  }
  
  // Prüfe auch, ob die notwendigen Eigenschaften vorhanden sind
  if (typeof eingaben.basisMonate === 'undefined' || 
      typeof eingaben.wochenstunden === 'undefined' || 
      typeof eingaben.teilzeitProzent === 'undefined' ||
      typeof berechnung.gesamtMonate === 'undefined') {
    return;
  }
  
  // Jetzt können wir sicher leeren, da wir vollständige Daten haben
  liste.innerHTML = "";

  // Teilzeit-Stunden berechnen
  const teilzeitStunden = Math.round((eingaben.wochenstunden * eingaben.teilzeitProzent) / 100);

  const zeilen = [
    [
      uebersetzung("inputs.dauer.labelShort", "Ausbildung (Vollzeit)"),
      `${eingaben.basisMonate} M`
    ],
    [
      uebersetzung("inputs.stunden.labelShort", "Wochenstunden (Vollzeit)"),
      `${eingaben.wochenstunden} ${uebersetzung("units.hours.short", "h")}`
    ],
    [
      uebersetzung("inputs.teilzeit.labelShort", "Teilzeit"),
      `${eingaben.teilzeitProzent}% <-> ${teilzeitStunden} ${uebersetzung("units.hours.short", "h")}`
    ]
  ];

  for (const [schluessel, wert] of zeilen) {
    const wrapper = document.createElement("div");
    const dt = document.createElement("dt");
    dt.textContent = schluessel;
    const dd = document.createElement("dd");
    dd.textContent = wert;
    wrapper.append(dt, dd);
    liste.append(wrapper);
  }

  // Verkürzungen hinzufügen, wenn vorhanden
  const verkuerzungen = Array.isArray(eingaben.verkuerzungen)
    ? eingaben.verkuerzungen
    : [];
  
  if (verkuerzungen.length > 0 && berechnung) {
    const verkuerzungenWrapper = document.createElement("div");
    const verkuerzungenDt = document.createElement("dt");
    verkuerzungenDt.className = "verkuerzungen-label";
    verkuerzungenDt.textContent = uebersetzung("inputs.verkuerzungen.labelShort", "Verkürzungen");
    
    const verkuerzungenDd = document.createElement("dd");
    verkuerzungenDd.className = "verkuerzungen-content";
    
    // Liste der Verkürzungsgründe
    const verkuerzungenListe = document.createElement("ul");
    verkuerzungenListe.className = "verkuerzungen-list";

  verkuerzungen.forEach((verkuerzung) => {
    const li = document.createElement("li");
    // Label aus i18n je Key
    let beschriftungsSchluessel;
    switch (verkuerzung.key) {
      case "abitur":
          beschriftungsSchluessel = "vk.school.abitur";
        break;
      case "realschule":
          beschriftungsSchluessel = "vk.school.realschule";
        break;
      case "alter_ueber_21":
        beschriftungsSchluessel = "vk.alter21.label";
        break;
      case "vorkenntnisse":
        beschriftungsSchluessel = "vk.vork.label";
        break;
      case "familien_pflegeverantwortung":
        beschriftungsSchluessel = "vk.familie.label";
        break;
      default:
        beschriftungsSchluessel = "";
    }
    const beschriftung = beschriftungsSchluessel
      ? uebersetzung(beschriftungsSchluessel, verkuerzung.key)
      : verkuerzung.key || "";
      
      // Strukturiertes Format: Label und Wert in separaten Spans
      if (verkuerzung.months) {
        const labelSpan = document.createElement("span");
        labelSpan.className = "verkuerzung-label";
        labelSpan.textContent = `${beschriftung}:`;
        
        const valueSpan = document.createElement("span");
        valueSpan.className = "verkuerzung-value";
        // Einheitlich kurze Form "M" für alle Geräte
        valueSpan.textContent = `${verkuerzung.months} M`;
        
        li.appendChild(labelSpan);
        li.appendChild(valueSpan);
      } else {
        li.textContent = beschriftung;
      }
      verkuerzungenListe.appendChild(li);
    });
    
    verkuerzungenDd.appendChild(verkuerzungenListe);
    
    // Summe aller Verkürzungen (unbegrenzt)
    const summeAllerVerkuerzungen = document.createElement("div");
    summeAllerVerkuerzungen.className = "verkuerzungen-summe";
    const summeBeschriftung = uebersetzung("cuts.sumAll", "Summe aller Verkürzungen");
    
    const summeLabelSpan = document.createElement("span");
    summeLabelSpan.className = "verkuerzung-label";
    summeLabelSpan.textContent = `${summeBeschriftung}:`;
    
    const summeValueSpan = document.createElement("span");
    summeValueSpan.className = "verkuerzung-value";
    summeValueSpan.textContent = `${berechnung.gesamteVerkuerzungMonateOhneBegrenzung} M`;
    
    summeAllerVerkuerzungen.appendChild(summeLabelSpan);
    summeAllerVerkuerzungen.appendChild(summeValueSpan);
    verkuerzungenDd.appendChild(summeAllerVerkuerzungen);
    
    // Warnhinweis, falls nötig
    const warnhinweis = document.createElement("p");
    warnhinweis.className = "error-message verkuerzungen-warning";
    warnhinweis.id = "errorVerkuerzungenInListe";
    warnhinweis.style.display = "none";
    verkuerzungenDd.appendChild(warnhinweis);
    
    verkuerzungenWrapper.append(verkuerzungenDt, verkuerzungenDd);
    liste.append(verkuerzungenWrapper);
    
    // Zusätzliche Berechnungen hinzufügen
    const nachVerkuerzungBeschriftung = uebersetzung("inputs.afterShortening", "Ausbildungsdauer nach Verkürzung");
    const nachVerkuerzungWrapper = document.createElement("div");
    const nachVerkuerzungDt = document.createElement("dt");
    nachVerkuerzungDt.textContent = nachVerkuerzungBeschriftung;
    const nachVerkuerzungDd = document.createElement("dd");
    nachVerkuerzungDd.textContent = `${berechnung.neueBasis} M`;
    nachVerkuerzungWrapper.append(nachVerkuerzungDt, nachVerkuerzungDd);
    liste.append(nachVerkuerzungWrapper);
    
    const inTeilzeitBeschriftung = uebersetzung("inputs.inPartTime", "Ausbildungsdauer in Teilzeit");
    const inTeilzeitWrapper = document.createElement("div");
    const inTeilzeitDt = document.createElement("dt");
    inTeilzeitDt.textContent = inTeilzeitBeschriftung;
    const inTeilzeitDd = document.createElement("dd");
    inTeilzeitDd.className = "teilzeit-formula";
    
    // Strukturiertes Format: Formel in separaten Elementen für Mobile/Desktop
    const formulaContainer = document.createElement("div");
    formulaContainer.className = "teilzeit-formula-container";
    
    // Zeile 1: "24 M / 75%"
    const formulaLine1 = document.createElement("span");
    formulaLine1.className = "teilzeit-formula-line1";
    formulaLine1.textContent = `${berechnung.neueBasis} M / ${eingaben.teilzeitProzent}%`;
    
    // Zeile 2: "= 48 M"
    const formulaLine2 = document.createElement("span");
    formulaLine2.className = "teilzeit-formula-line2";
    formulaLine2.textContent = `= ${berechnung.gesamtMonate} M`;
    
    formulaContainer.appendChild(formulaLine1);
    formulaContainer.appendChild(formulaLine2);
    inTeilzeitDd.appendChild(formulaContainer);
    
    inTeilzeitWrapper.append(inTeilzeitDt, inTeilzeitDd);
    liste.append(inTeilzeitWrapper);
    
    // Warnhinweis prüfen und anzeigen
    if (berechnung.gesamteVerkuerzungMonateOhneBegrenzung > 12) {
      warnhinweis.textContent = uebersetzung("errors.invalidCut", "Hinweis: Ihre gewählten Verkürzungsgründe ergeben zusammen mehr als 12 Monate. Die Gesamtverkürzung wird daher auf maximal 12 Monate begrenzt, wie vorgegeben.");
      warnhinweis.style.display = "block";
    }
  }
  
  // Warnhinweis für § 8 Abs. 3 BBiG (immer anzeigen, wenn Regel angewendet wurde)
  if (berechnung && berechnung.regel8Abs3Angewendet) {
    const warnhinweis8Abs3 = document.createElement("p");
    warnhinweis8Abs3.className = "error-message verkuerzungen-warning";
    warnhinweis8Abs3.id = "errorRegel8Abs3";
    warnhinweis8Abs3.textContent = uebersetzung(
      "errors.regel8Abs3",
      "Hinweis: Nach § 8 Abs. 3 BBiG wurde die Ausbildungsdauer auf die Regelausbildungsdauer reduziert, da die Überschreitung maximal 6 Monate beträgt."
    );
    warnhinweis8Abs3.style.display = "block";
    liste.appendChild(warnhinweis8Abs3);
  }
  
  // Legende für Abkürzungen hinzufügen
  const legende = document.createElement("p");
  legende.className = "units-legend";
  legende.textContent = uebersetzung("inputs.unitsLegend", "Std = Stunden, M = Monate");
  liste.append(legende);
}

/**
 * Zeigt die Hauptergebnisse (mit i18n) an.
 *
 * @param {Object} eingaben - Eingaben zur Ableitung von Plausibilitätsprüfungen.
 * @param {Object} berechnung - Kernzahlen der Berechnung (Monate, Wochen, Stunden).
 */
function fuelleErgebnisse(eingaben, berechnung) {
  // Zahl + Einheit lokalisiert
  const monateWort = uebersetzung("units.months.full", "Monate");
  setzeText("#res-total-months", `${berechnung.gesamtMonate} ${monateWort}`);

  // Jahre-Anzeige
  const jahreElement = $("#res-total-years");
  if (jahreElement && berechnung.gesamtJahre) {
    const jahreWort = uebersetzung("units.years.full", "Jahre");
    setzeText("#res-total-years", `≈ ${berechnung.gesamtJahre} ${jahreWort}`);
  }

  // Validierungen mit i18n-Texten
  if (berechnung.gesamtMonate < eingaben.basisMonate - 12) {
    setzeText(
      "#errorTotalMonths",
      uebersetzung(
        "errors.tooShort",
        "Die Gesamtdauer darf maximal um 12 Monate verkürzt werden!"
      )
    );
  } else if (berechnung.gesamtMonate > eingaben.basisMonate * 1.5) {
    setzeText(
      "#errorTotalMonths",
      uebersetzung(
        "errors.tooLong",
        "Die Gesamtdauer darf maximal das 1,5-fache verlängert werden!"
      )
    );
  } else {
    setzeText("#errorTotalMonths", "");
  }

  // Verlängerungsanzeige: Basis → Pfeil mit Delta → Ziel
  const extensionWrapper = $("#res-extension-wrapper");
  if (extensionWrapper) {
    if (berechnung.verlaengerungMonate > 0) {
      zeige(extensionWrapper);
      const monateWort = uebersetzung("units.months.short", "Mon.");
      
      // Basis (verkürzte Dauer)
      setzeText("#res-extension-basis", `${berechnung.neueBasis} ${monateWort}`);
      
      // Finale Dauer
      setzeText("#res-extension-total", `${berechnung.gesamtMonate} ${monateWort}`);

      // Delta (Verlängerung) - nur als Zahl unter dem Pfeil
      setzeText("#res-extension-delta", `+${berechnung.verlaengerungMonate}`);
    } else {
      verberge(extensionWrapper);
    }
  }
}

/** Setzt das Datum in der Fußzeile (lokalisiert). */
function setzeDatumstempel() {
  const element = $("#stamp-date");
  if (!element) return;
  const sprache = aktuelleSprache();
  const format = new Intl.DateTimeFormat(
    sprache === "en" ? "en-US" : "de-DE",
    { dateStyle: "long" }
  );
  const beschriftung = sprache === "en" ? "As of" : "Stand";
  element.textContent = `${beschriftung}: ${format.format(new Date())}`;
}

/* ------------------------------
   Share / Reset – mit i18n
   ------------------------------ */

/**
 * Erstellt eine URL mit kodierten Berechnungsdaten als Parameter.
 */
function erstelleShareUrl(eingaben, berechnung) {
  const baseUrl = new URL(location.href);
  baseUrl.searchParams.delete('data'); // Alte Parameter entfernen
  
  // Daten in kompakter Form kodieren
  const shareData = {
    d: eingaben.basisMonate,
    s: eingaben.wochenstunden,
    t: eingaben.teilzeitProzent,
    v: eingaben.verkuerzungen.map(vk => ({ k: vk.key, m: vk.months })),
    r: {
      g: berechnung.gesamtMonate,
      n: berechnung.neueBasis,
      v: berechnung.gesamteVerkuerzungMonate,
      vo: berechnung.gesamteVerkuerzungMonateOhneBegrenzung,
      l: berechnung.verlaengerungMonate || 0,
      r8: berechnung.regel8Abs3Angewendet || false
    }
  };
  
  // Base64-kodieren für URL-Sicherheit
  try {
    const jsonString = JSON.stringify(shareData);
    const encoded = btoa(encodeURIComponent(jsonString));
    baseUrl.searchParams.set('data', encoded);
  } catch (error) {
    console.warn("Fehler beim Kodieren der Daten:", error);
    return baseUrl.toString();
  }
  
  return baseUrl.toString();
}

/**
 * Liest Berechnungsdaten aus URL-Parametern.
 */
function ladeDatenAusUrl() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get('data');
    
    if (!encodedData) {
      return null;
    }
    
    // Base64-dekodieren
    const jsonString = decodeURIComponent(atob(encodedData));
    const shareData = JSON.parse(jsonString);
    
    // Datenstruktur wiederherstellen
    return {
      eingaben: {
        basisMonate: shareData.d,
        wochenstunden: shareData.s,
        teilzeitProzent: shareData.t,
        verkuerzungen: shareData.v ? shareData.v.map(v => ({ key: v.k, months: v.m })) : []
      },
      berechnung: {
        gesamtMonate: shareData.r.g,
        neueBasis: shareData.r.n,
        gesamteVerkuerzungMonate: shareData.r.v,
        gesamteVerkuerzungMonateOhneBegrenzung: shareData.r.vo,
        verlaengerungMonate: shareData.r.l || 0, // Verlängerung durch Teilzeit
        gesamtJahre: Math.round((shareData.r.g / 12) * 10) / 10,
        regel8Abs3Angewendet: shareData.r.r8 || false
      }
    };
  } catch (error) {
    console.warn("Fehler beim Dekodieren der URL-Daten:", error);
    return null;
  }
}

/**
 * Teilt die Ergebnisübersicht über die Web Share API oder die Zwischenablage.
 * Die URL enthält kodierte Berechnungsdaten, damit die Ergebnisse beim Öffnen des Links sichtbar sind.
 */
async function teileLink() {
  // Prüfe, ob wir aktuelle Berechnungsdaten haben
  if (!LETZTE_EINGABEN || !LETZTE_BERECHNUNG) {
    const meldung = uebersetzung("share.noData", "Bitte berechnen Sie zuerst ein Ergebnis, bevor Sie den Link teilen.");
    alert(meldung);
    return;
  }
  
  const adresse = erstelleShareUrl(LETZTE_EINGABEN, LETZTE_BERECHNUNG);
  const titel = uebersetzung("share.title", "Teilzeitrechner – Ergebnis");
  const text = uebersetzung("share.text", "Hier ist meine Ergebnisübersicht.");
  const kopiert = uebersetzung("share.copied", "Link in die Zwischenablage kopiert.");
  const fehlerText = uebersetzung("share.error", "Fehler beim Teilen. Bitte kopieren Sie den Link manuell.");
  
  try {
    // Web Share API (funktioniert auf Mobile-Geräten)
    if (navigator.share) {
      try {
        await navigator.share({ 
          title: titel, 
          text: text, 
          url: adresse.toString() 
        });
        return; // Erfolgreich geteilt
      } catch (shareError) {
        // Benutzer hat geteilt abgebrochen - das ist OK, kein Fehler
        if (shareError.name === 'AbortError') {
          return;
        }
        // Anderer Fehler - weiter zu Fallback
        console.warn("Web Share API Fehler:", shareError);
      }
    }
    
    // Fallback: Zwischenablage (funktioniert über HTTPS)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(adresse.toString());
        alert(kopiert);
        return;
      } catch (clipboardError) {
        console.warn("Zwischenablage Fehler:", clipboardError);
      }
    }
    
    // Letzter Fallback: Textauswahl für manuelles Kopieren
    const textarea = document.createElement("textarea");
    textarea.value = adresse.toString();
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      alert(kopiert);
    } catch (execError) {
      console.warn("execCommand Fehler:", execError);
      alert(fehlerText + "\n\n" + adresse.toString());
    } finally {
      document.body.removeChild(textarea);
    }
  } catch (fehler) {
    console.error("Unerwarteter Fehler beim Teilen:", fehler);
    alert(fehlerText + "\n\n" + adresse.toString());
  }
}

/**
 * Setzt alle gespeicherten Formular- und Spracheinstellungen zurück.
 * Die zuletzt gewählte Sprache wird erneut gespeichert.
 */
function setzeDatenZurueck() {
  const meldung = uebersetzung(
    "reset.confirm",
    "Möchten Sie wirklich alle Daten zurücksetzen?"
  );
  if (!confirm(meldung)) return;

  // Sprache merken, bevor wir den Storage leeren
  const SPRACH_SCHLUESSEL = "lang";
  const gespeicherteSprache =
    localStorage.getItem(SPRACH_SCHLUESSEL) ||
    (window.I18N && window.I18N.lang) ||
    null;

  // Formularfelder zurücksetzen
  const dauerInput = document.getElementById("dauer");
  const stundenInput = document.getElementById("stunden");
  const teilzeitProzentInput = document.getElementById("teilzeitProzent");
  
  if (dauerInput) dauerInput.value = "36";
  if (stundenInput) stundenInput.value = "40";
  if (teilzeitProzentInput) teilzeitProzentInput.value = "75";
  
  // Checkboxes für Verkürzungsgründe zurücksetzen
  const checkboxes = document.querySelectorAll('input[type="checkbox"][data-vk-field]');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // Schulabschluss zurücksetzen
  const abiturCheckbox = document.getElementById("g-abitur");
  const realschuleCheckbox = document.getElementById("g-realschule");
  const schoolSelect = document.getElementById("vk-school-select");
  if (abiturCheckbox) abiturCheckbox.checked = false;
  if (realschuleCheckbox) realschuleCheckbox.checked = false;
  if (schoolSelect) schoolSelect.value = "none";
  
  // Vorkenntnisse-Monate zurücksetzen (falls vorhanden)
  const vorkenntnisseInput = document.querySelector('input[data-vk-field="vorkenntnisse_monate"]');
  if (vorkenntnisseInput && vorkenntnisseInput.type === "number") {
    vorkenntnisseInput.value = "";
  }

  // Gespeicherten Zustand löschen
  try {
    localStorage.removeItem("calculatorState");
  } catch (fehler) {
    console.warn("Konnte calculatorState nicht löschen:", fehler);
  }
  
  // Alles andere löschen (außer Sprache)
  try {
    const gespeicherteSprache = localStorage.getItem(SPRACH_SCHLUESSEL);
    localStorage.clear();
    if (gespeicherteSprache) {
      localStorage.setItem(SPRACH_SCHLUESSEL, gespeicherteSprache);
    }
  } catch (fehler) {
    console.warn("Konnte localStorage nicht löschen:", fehler);
  }
  try {
    sessionStorage.clear();
  } catch (fehler) {
    console.warn("Konnte sessionStorage nicht löschen:", fehler);
  }

  // Sprache wiederherstellen
  if (gespeicherteSprache) {
    try {
      localStorage.setItem(SPRACH_SCHLUESSEL, gespeicherteSprache);
    } catch (fehler) {
      console.warn("Konnte Sprache nicht wiederherstellen:", fehler);
    }
  }

  // Ergebnisse zurücksetzen
  setzeText("#res-total-months", "–");
  setzeText("#res-total-years", "–");
  const extensionWrapper = $("#res-extension-wrapper");
  if (extensionWrapper) verberge(extensionWrapper);
  const errorTotalMonths = $("#errorTotalMonths");
  if (errorTotalMonths) errorTotalMonths.textContent = "";
  
  // Eingabenliste leeren
  const inputsList = $("#inputs-list");
  if (inputsList) inputsList.innerHTML = "";
  
  // Ergebnis-Sektion verstecken
  const ergebnisContainer = document.getElementById("ergebnis-container");
  if (ergebnisContainer) {
    ergebnisContainer.hidden = true;
  }
  
  // Gespeicherte Daten zurücksetzen
  LETZTE_EINGABEN = null;
  LETZTE_BERECHNUNG = null;

  // Nach Bestätigung sanft zum Eingabebereich scrollen (gleiche Logik wie "Zum Rechner" Button)
  const eingabenSection = document.querySelector('section.card'); // Erste Eingabe-Section
  if (eingabenSection) {
    const sectionTop = eingabenSection.getBoundingClientRect().top + window.pageYOffset;
    const offset = 70; // Offset für Tooltip + Abstand oben (gleich wie bei "Zum Rechner" Button)
    window.scrollTo({
      top: sectionTop - offset,
      behavior: "smooth"
    });
  }
}

/* ------------------------------
   Initialisierung & Re-Render bei Sprachwechsel
   ------------------------------ */

/**
 * Speichert den aktuellen Zustand (Eingaben und Berechnung) in localStorage.
 */
function speichereZustand(eingaben, berechnung) {
  try {
    // Speichere auch die ursprünglichen Formularwerte für die Wiederherstellung
    const vorkenntnisseInput = document.querySelector('input[data-vk-field="vorkenntnisse_monate"]');
    const formularWerte = {
      dauer: document.getElementById("dauer")?.value || null,
      stunden: document.getElementById("stunden")?.value || null,
      teilzeitProzent: document.getElementById("teilzeitProzent")?.value || null,
      schoolSelect: document.querySelector('select[data-vk-type="school-select"]')?.value || null,
      vorkenntnisseMonate: vorkenntnisseInput?.value || null
    };
    
    const zustand = {
      eingaben,
      berechnung,
      formularWerte,
      timestamp: Date.now()
    };
    localStorage.setItem("calculatorState", JSON.stringify(zustand));
  } catch (fehler) {
    console.warn("Konnte Zustand nicht speichern:", fehler);
  }
}

/**
 * Lädt den gespeicherten Zustand aus localStorage.
 */
function ladeZustand() {
  try {
    const gespeichert = localStorage.getItem("calculatorState");
    if (!gespeichert) return null;
    
    const zustand = JSON.parse(gespeichert);
    // Prüfe, ob der Zustand nicht älter als 7 Tage ist
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 Tage in Millisekunden
    if (Date.now() - zustand.timestamp > maxAge) {
      localStorage.removeItem("calculatorState");
      return null;
    }
    
    return zustand;
  } catch (fehler) {
    console.warn("Konnte Zustand nicht laden:", fehler);
    return null;
  }
}

/**
 * Stellt die Formularwerte aus dem gespeicherten Zustand wieder her.
 */
function stelleFormularWiederHer(zustand) {
  if (!zustand) return;
  
  const formularWerte = zustand.formularWerte || {};
  const eingaben = zustand.eingaben;
  
  // Basis-Eingaben wiederherstellen
  const dauerElement = document.getElementById("dauer");
  const stundenElement = document.getElementById("stunden");
  const prozentElement = document.getElementById("teilzeitProzent");
  
  if (dauerElement && formularWerte.dauer) {
    dauerElement.value = formularWerte.dauer;
  }
  if (stundenElement && formularWerte.stunden) {
    stundenElement.value = formularWerte.stunden;
  }
  if (prozentElement && formularWerte.teilzeitProzent) {
    prozentElement.value = formularWerte.teilzeitProzent;
  }
  
  // Schulabschluss-Select wiederherstellen
  if (formularWerte.schoolSelect) {
    const schoolSelect = document.querySelector('select[data-vk-type="school-select"]');
    if (schoolSelect) {
      schoolSelect.value = formularWerte.schoolSelect;
    }
  }
  
  // Verkürzungsgründe wiederherstellen
  if (eingaben && eingaben.verkuerzungen && Array.isArray(eingaben.verkuerzungen)) {
    eingaben.verkuerzungen.forEach(vk => {
      if (vk.key === "abitur") {
        const checkbox = document.getElementById("g-abitur");
        if (checkbox) checkbox.checked = true;
      }
      if (vk.key === "realschule") {
        const checkbox = document.getElementById("g-realschule");
        if (checkbox) checkbox.checked = true;
      }
      if (vk.key === "alter_ueber_21") {
        const checkbox = document.querySelector('input[data-vk-field="alter_ueber_21"]');
        if (checkbox) checkbox.checked = true;
      }
      if (vk.key === "familien_pflegeverantwortung") {
        const checkbox = document.querySelector('input[data-vk-field="familien_pflegeverantwortung"]');
        if (checkbox) checkbox.checked = true;
      }
      if (vk.key === "vorkenntnisse" && vk.months > 0) {
        const checkbox = document.querySelector('input[data-vk-field="vorkenntnisse_monate"]');
        if (checkbox) checkbox.checked = true;
      }
    });
  }
}

/**
 * Initialisiert die Ergebnisansicht (nur Event-Listener, keine automatische Berechnung).
 * Die Ergebnisse werden erst beim Klick auf "Ergebnis anzeigen" geladen.
 * Beim Laden der Seite wird geprüft, ob ein gespeicherter Zustand vorhanden ist.
 */
function initialisiere() {
  $("#btn-share")?.addEventListener("click", teileLink);
  $("#btn-reset")?.addEventListener("click", setzeDatenZurueck);
  
  // Prüfe zuerst URL-Parameter (hat Priorität, da es ein geteilter Link sein könnte)
  const urlDaten = ladeDatenAusUrl();
  if (urlDaten && urlDaten.eingaben && urlDaten.berechnung) {
    // Formular wiederherstellen (nur Basis-Eingaben, da Verkürzungen aus URL kommen)
    const dauerElement = document.getElementById("dauer");
    const stundenElement = document.getElementById("stunden");
    const prozentElement = document.getElementById("teilzeitProzent");
    
    if (dauerElement) dauerElement.value = urlDaten.eingaben.basisMonate;
    if (stundenElement) stundenElement.value = urlDaten.eingaben.wochenstunden;
    if (prozentElement) prozentElement.value = urlDaten.eingaben.teilzeitProzent;
    
    // Verkürzungsgründe wiederherstellen
    if (urlDaten.eingaben.verkuerzungen && Array.isArray(urlDaten.eingaben.verkuerzungen)) {
      urlDaten.eingaben.verkuerzungen.forEach(vk => {
        if (vk.key === "abitur" || vk.key === "realschule" || vk.key === "hauptschule" || vk.key === "none") {
          const dropdown = document.getElementById("vk-school-select");
          if (dropdown) dropdown.value = vk.key;
        }
        if (vk.key === "alter_ueber_21") {
          const checkbox = document.querySelector('input[data-vk-field="alter_ueber_21"]');
          if (checkbox) checkbox.checked = true;
        }
        if (vk.key === "familien_pflegeverantwortung") {
          const checkbox = document.querySelector('input[data-vk-field="familien_pflegeverantwortung"]');
          if (checkbox) checkbox.checked = true;
        }
        if (vk.key === "vorkenntnisse" && vk.months > 0) {
          const checkbox = document.querySelector('input[data-vk-field="vorkenntnisse_monate"]');
          if (checkbox) checkbox.checked = true;
        }
      });
    }
    
    // Ergebnisse wiederherstellen
    LETZTE_EINGABEN = urlDaten.eingaben;
    LETZTE_BERECHNUNG = urlDaten.berechnung;
    
    // Ergebnis-Sektion anzeigen
    const ergebnisContainer = document.getElementById("ergebnis-container");
    if (ergebnisContainer) {
      ergebnisContainer.hidden = false;
    }
    
    // Ergebnisse anzeigen
    fuelleEingabenliste(urlDaten.eingaben, urlDaten.berechnung);
    fuelleErgebnisse(urlDaten.eingaben, urlDaten.berechnung);
    setzeDatumstempel();
    
    // URL bereinigen (Parameter entfernen, damit sie nicht beim Refresh bleiben)
    if (window.history && window.history.replaceState) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  } else {
    // Prüfe, ob ein gespeicherter Zustand vorhanden ist
    const gespeicherterZustand = ladeZustand();
    if (gespeicherterZustand && gespeicherterZustand.eingaben && gespeicherterZustand.berechnung) {
      // Formular wiederherstellen
      stelleFormularWiederHer(gespeicherterZustand);
      
      // Ergebnisse wiederherstellen
      LETZTE_EINGABEN = gespeicherterZustand.eingaben;
      LETZTE_BERECHNUNG = gespeicherterZustand.berechnung;
      
      // Ergebnis-Sektion anzeigen
      const ergebnisContainer = document.getElementById("ergebnis-container");
      if (ergebnisContainer) {
        ergebnisContainer.hidden = false;
      }
      
      // Ergebnisse anzeigen
      fuelleEingabenliste(gespeicherterZustand.eingaben, gespeicherterZustand.berechnung);
      fuelleErgebnisse(gespeicherterZustand.eingaben, gespeicherterZustand.berechnung);
      setzeDatumstempel();
    } else {
      // Ergebnis-Sektion initial verstecken
      const ergebnisContainer = document.getElementById("ergebnis-container");
      if (ergebnisContainer) {
        ergebnisContainer.hidden = true;
      }
    }
  }
}

// Erst-Init
document.addEventListener("DOMContentLoaded", initialisiere);

// Bei Sprachwechsel nur UI neu rendern (ohne neue API-Calls)
// Nur wenn Ergebnisse bereits angezeigt wurden
window.addEventListener("i18n:changed", () => {
  const ergebnisContainer = document.getElementById("ergebnis-container");
  if (!ergebnisContainer || ergebnisContainer.hidden) return;
  if (!LETZTE_EINGABEN || !LETZTE_BERECHNUNG) return;
  fuelleEingabenliste(LETZTE_EINGABEN, LETZTE_BERECHNUNG);
  fuelleErgebnisse(LETZTE_EINGABEN, LETZTE_BERECHNUNG);
  setzeDatumstempel();
});

// Bei Fenstergrößenänderung neu rendern (für Mobile/Desktop-Umschaltung)
// Nur bei Änderungen der Breite, nicht der Höhe (um Scroll-Events zu vermeiden)
let resizeTimeout;
let lastWindowWidth = window.innerWidth;
window.addEventListener("resize", () => {
  const currentWidth = window.innerWidth;
  // Nur neu rendern, wenn sich die Breite geändert hat (nicht die Höhe)
  if (currentWidth === lastWindowWidth) {
    return;
  }
  lastWindowWidth = currentWidth;
  
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const ergebnisContainer = document.getElementById("ergebnis-container");
    if (!ergebnisContainer || ergebnisContainer.hidden) return;
    if (!LETZTE_EINGABEN || !LETZTE_BERECHNUNG) return;
    fuelleEingabenliste(LETZTE_EINGABEN, LETZTE_BERECHNUNG);
  }, 250);
});

/**
 * Führt eine erneute Berechnung aus und aktualisiert die Ergebnisansicht.
 * Zeigt die Ergebnis-Sektion an, wenn sie noch versteckt ist.
 * Fehler werden im UI angezeigt.
 */
async function berechnen() {
  // Ergebnis-Sektion anzeigen
  const ergebnisContainer = document.getElementById("ergebnis-container");
  if (ergebnisContainer) {
    ergebnisContainer.hidden = false;
    // Sanftes Scrollen zur Ergebnis-Sektion
    ergebnisContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  
  try {
    const { eingaben, berechnung } = await holeZusammenfassung();
    LETZTE_EINGABEN = eingaben;
    LETZTE_BERECHNUNG = berechnung;
    
    // Zustand speichern
    speichereZustand(eingaben, berechnung);
    
    fuelleEingabenliste(eingaben, berechnung);
    fuelleErgebnisse(eingaben, berechnung);
    setzeDatumstempel();
  } catch (fehler) {
    console.error("Fehler beim Laden der Daten:", fehler);
    const meldung =
      fehler && fehler.message ? String(fehler.message) : "Unbekannter Fehler";
    setzeText("#res-total-months", "–");
    setzeText("#res-total-years", "–");
    const extensionWrapper = $("#res-extension-wrapper");
    if (extensionWrapper) verberge(extensionWrapper);
    const fehlerElement = document.getElementById("errorTotalMonths");
    if (fehlerElement) fehlerElement.textContent = meldung;
  }
}

// Berechnen-Button
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("berechnenBtn");
  if (btn) {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      berechnen();
    });
  }
});


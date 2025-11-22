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
      gesamtJahre: Math.round((gesamtMonate / 12) * 10) / 10
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
      `${eingaben.wochenstunden}h`
    ],
    [
      uebersetzung("inputs.teilzeit.labelShort", "Teilzeit"),
      `${eingaben.teilzeitProzent}% <-> ${teilzeitStunden}h`
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
      warnhinweis.textContent = uebersetzung("errors.invalidCut", "Hinweis: Ihre gewählten Verkürzungsgründe ergeben zusammen mehr als 12 Monate. Die Gesamtverkürzung wird daher auf maximal 12 Monate begrenzt, wie gesetzlich vorgesehen.");
      warnhinweis.style.display = "block";
    }
  }
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
 * Teilt die Ergebnisübersicht über die Web Share API oder die Zwischenablage.
 */
async function teileLink() {
  const adresse = new URL(location.href);
  const titel = uebersetzung("share.title", "Teilzeitrechner – Ergebnis");
  const text = uebersetzung("share.text", "Hier ist meine Ergebnisübersicht.");
  const kopiert = uebersetzung("share.copied", "Link in die Zwischenablage kopiert.");
  try {
    if (navigator.share) {
      await navigator.share({ title: titel, text: text, url: adresse.toString() });
    } else {
      await navigator.clipboard.writeText(adresse.toString());
      alert(kopiert);
    }
  } catch (fehler) {
    console.warn("Fehler beim Teilen:", fehler);
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

  // Alles löschen (Formulardaten etc.)
  try {
    localStorage.clear();
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

  // Neu laden
  location.reload();
}

/* ------------------------------
   Initialisierung & Re-Render bei Sprachwechsel
   ------------------------------ */

/**
 * Initialisiert die Ergebnisansicht und lädt einmalig die aktuellen Berechnungen.
 * Speichert die letzten Daten, damit sie bei Sprachwechseln wiederverwendet werden können.
 */
async function initialisiere() {
  $("#btn-share")?.addEventListener("click", teileLink);
  $("#btn-reset")?.addEventListener("click", setzeDatenZurueck);

  try {
    const { eingaben, berechnung } = await holeZusammenfassung();
    LETZTE_EINGABEN = eingaben;
    LETZTE_BERECHNUNG = berechnung;
    fuelleEingabenliste(eingaben, berechnung);
    fuelleErgebnisse(eingaben, berechnung);
    setzeDatumstempel();
  } catch (fehler) {
    console.error("Fehler beim Laden der Daten:", fehler);
    const meldung =
      fehler && fehler.message
        ? String(fehler.message)
        : uebersetzung("errors.unknown", "Unbekannter Fehler");
    setzeText("#res-total-months", "–");
    setzeText("#res-total-years", "–");
    const extensionWrapper = $("#res-extension-wrapper");
    if (extensionWrapper) verberge(extensionWrapper);
    const fehlerElement = document.getElementById("errorTotalMonths");
    if (fehlerElement) fehlerElement.textContent = meldung;
  }
}

// Erst-Init
document.addEventListener("DOMContentLoaded", initialisiere);

// Bei Sprachwechsel nur UI neu rendern (ohne neue API-Calls)
window.addEventListener("i18n:changed", () => {
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
    if (!LETZTE_EINGABEN || !LETZTE_BERECHNUNG) return;
    fuelleEingabenliste(LETZTE_EINGABEN, LETZTE_BERECHNUNG);
  }, 250);
});

/**
 * Führt eine erneute Berechnung aus und aktualisiert die Ergebnisansicht.
 * Fehler werden im UI angezeigt.
 */
async function berechnen() {
  try {
    const { eingaben, berechnung } = await holeZusammenfassung();
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


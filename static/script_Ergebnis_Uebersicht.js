/* script_Ergebnis_Übersicht.js – i18n-fähige Ergebnislogik */

document.addEventListener("DOMContentLoaded", () => {
  // nichts; initialisiere() wird unten registriert
});

// Kurz-Helfer
const $ = (selektor) => document.querySelector(selektor);
function setzeText(selektor, text) { const element = $(selektor); if (element) element.textContent = text; }
function zeige(element) { if (element) element.hidden = false; }
function verberge(element) { if (element) element.hidden = true; }

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

// Units/Labels aus i18n
function einheiten() {
  return {
    h: uebersetzung("units.hours.short", "h"),
    monate: uebersetzung("units.months.short", "Mon."),
    wochen: uebersetzung("units.weeks.short", "Wo.")
  };
}

// Zustand merken, damit wir bei Sprachwechsel neu rendern können
let LETZTE_EINGABEN = null;
let LETZTE_BERECHNUNG = null;
let fehlerGesamtmonate;

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

  const abitur = !!document.getElementById("g-abitur")?.checked;
  const realschule = !!document.getElementById("g-realschule")?.checked;
  const alter21 = !!document.getElementById("g-alter21")?.checked;
  const vork = !!document.getElementById("g-vork")?.checked;

  const basisMonate = Number(basisMonateElement?.value || 0);
  const wochenstunden = Number(wochenstundenElement?.value || 0);
  const teilzeitProzent = Number(prozentElement?.value || 0);

  const nutzdaten = {
    basis_dauer_monate: basisMonate,
    vollzeit_stunden: wochenstunden,
    teilzeit_eingabe: teilzeitProzent,
    eingabetyp: "prozent",
    verkuerzungsgruende: {
      abitur,
      realschule,
      alter_ueber_21: alter21,
      vorkenntnisse_monate: vork ? 6 : 0
    }
  };

  const antwort = await fetch("/api/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
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
  const neueBasis = Number(ergebnis.verkuerzte_dauer_monate || 0);
  const wochen = Math.round(gesamtMonate * 4.33);

  const arbeitStundenProWoche = Math.min(wochenstunden, Number(ergebnis.wochenstunden || 0));
  const schuleStundenProWoche = Math.max(0, wochenstunden - arbeitStundenProWoche);

  const verkuerzungen = [];
  if (abitur) verkuerzungen.push({ key: "abitur", months: 12 });
  if (realschule) verkuerzungen.push({ key: "realschule", months: 6 });
  if (alter21) verkuerzungen.push({ key: "alter_ueber_21", months: 12 });
  if (vork) verkuerzungen.push({ key: "vorkenntnisse", months: 6 });

  return {
    eingaben: {
      basisMonate,
      wochenstunden,
      teilzeitProzent,
      schuleStundenProWoche,
      arbeitStundenProWoche,
      verkuerzungen
    },
    berechnung: {
      verlaengerungMonate,
      gesamteVerkuerzungMonate,
      neueBasis,
      gesamtMonate,
      gesamtWochen: wochen
    }
  };
}

/**
 * Füllt die Übersichtstabelle der Eingaben (mit i18n).
 *
 * @param {Object} eingaben - Vorverarbeitete Eingabewerte aus holeZusammenfassung().
 */
function fuelleEingabenliste(eingaben) {
  const liste = $("#inputs-list");
  if (!liste) return;
  const einh = einheiten();
  liste.innerHTML = "";

  const zeilen = [
    [ uebersetzung("inputs.dauer.label", "Reguläre Ausbildungsdauer (Monate)"), `${eingaben.basisMonate}` ],
    [ uebersetzung("inputs.stunden.label", "Reguläre Wochenstunden (gesamt)"), `${eingaben.wochenstunden} ${einh.h}` ],
    [ uebersetzung("inputs.teilzeit.label", "Teilzeit-Anteil"), `${eingaben.teilzeitProzent}%` ],
    [ uebersetzung("res.kv.schoolPerWeek", "Ausbildung / Woche"), `${eingaben.schuleStundenProWoche} ${einh.h}` ],
    [ uebersetzung("res.kv.workPerWeek", "Arbeit / Woche"), `${eingaben.arbeitStundenProWoche} ${einh.h}` ]
  ];

  for (const [schluessel, wert] of zeilen) {
    const dt = document.createElement("dt");
    dt.textContent = schluessel;
    const dd = document.createElement("dd");
    dd.textContent = wert;
    liste.append(dt, dd);
  }
}

/**
 * Zeigt Verkürzungsgründe und Zusammenfassung (mit i18n).
 *
 * @param {Object} eingaben - Eingabe-Informationen inklusive ausgewählter Cuts.
 * @param {Object} berechnung - Berechnungsergebnisse zur Darstellung.
 */
function fuelleVerkuerzungen(eingaben, berechnung) {
  const bereich = $("#cuts-section");
  const liste = $("#cuts-list");
  const zusammenfassung = $("#cuts-summary");
  if (!bereich || !liste || !zusammenfassung) return;

  liste.innerHTML = "";
  const verkuerzungen = Array.isArray(eingaben.verkuerzungen) ? eingaben.verkuerzungen : [];
  if (!verkuerzungen.length) { verberge(bereich); return; }
  zeige(bereich);

  verkuerzungen.forEach((verkuerzung) => {
    const li = document.createElement("li");
    li.className = "tag";
    // Label aus i18n je Key
    let beschriftungsSchluessel;
    switch (verkuerzung.key) {
      case "abitur": beschriftungsSchluessel = "vk.abitur.label"; break;
      case "realschule": beschriftungsSchluessel = "vk.realschule.label"; break;
      case "alter_ueber_21": beschriftungsSchluessel = "vk.alter21.label"; break;
      case "vorkenntnisse": beschriftungsSchluessel = "vk.vork.label"; break;
      default: beschriftungsSchluessel = "";
    }
    const beschriftung = beschriftungsSchluessel ? uebersetzung(beschriftungsSchluessel, verkuerzung.key) : (verkuerzung.key || "");
    const monateWort = uebersetzung("units.months.short", "Mon.");
    li.textContent = verkuerzung.months ? `${beschriftung} (−${verkuerzung.months} ${monateWort})` : beschriftung;
    liste.appendChild(li);
  });

  const monateWortVoll = uebersetzung("units.months.full", "Monate");
  const gesamtBeschriftung = uebersetzung("cuts.total", "Gesamt");
  const neueBasisBeschriftung = uebersetzung("cuts.newBase", "Neue Basis");
  zusammenfassung.textContent = `${gesamtBeschriftung}: −${berechnung.gesamteVerkuerzungMonate} ${monateWortVoll} · ${neueBasisBeschriftung}: ${berechnung.neueBasis} ${monateWortVoll}`;
}

/**
 * Zeigt die Hauptergebnisse (mit i18n) an.
 *
 * @param {Object} eingaben - Eingaben zur Ableitung von Plausibilitätsprüfungen.
 * @param {Object} berechnung - Kernzahlen der Berechnung (Monate, Wochen, Stunden).
 */
function fuelleErgebnisse(eingaben, berechnung) {
  const einh = einheiten();

  // Zahl + Einheit lokalisiert
  const monateWort = uebersetzung("units.months.full", "Monate");
  setzeText("#res-total-months", `${berechnung.gesamtMonate} ${monateWort}`);

  // Validierungen mit i18n-Texten
  if (berechnung.gesamtMonate < eingaben.basisMonate - 12) {
    setzeText('#errorTotalMonths', uebersetzung("errors.tooShort", "Die Gesamtdauer darf maximal um 12 Monate verkürzt werden!"));
  } else if (berechnung.gesamtMonate > eingaben.basisMonate * 1.5) {
    setzeText('#errorTotalMonths', uebersetzung("errors.tooLong", "Die Gesamtdauer darf maximal das 1,5-fache verlängert werden!"));
  } else {
    setzeText('#errorTotalMonths', "");
  }

  // Verlängerungszeile
  const verlaengerungBeschriftung = uebersetzung("res.extension.plus", "+{n} Monate Verlängerung")
    .replace("{n}", berechnung.verlaengerungMonate);
  const keineVerlaengerung = uebersetzung("res.extension.none", "Keine Verlängerung");
  setzeText("#res-extension", berechnung.verlaengerungMonate > 0 ? verlaengerungBeschriftung : keineVerlaengerung);

  // Weitere Felder
  const wochenWort = uebersetzung("units.weeks.short", "Wo.");
  setzeText("#res-total-weeks", `${berechnung.gesamtWochen} ${wochenWort}`);
  setzeText("#res-school-per-week", `${eingaben.schuleStundenProWoche} ${einh.h}`);
  setzeText("#res-work-per-week", `${eingaben.arbeitStundenProWoche} ${einh.h}`);
}

/** Setzt das Datum in der Fußzeile (lokalisiert). */
function setzeDatumstempel() {
  const element = $("#stamp-date");
  if (!element) return;
  const sprache = aktuelleSprache();
  const format = new Intl.DateTimeFormat(sprache === "en" ? "en-US" : "de-DE", { dateStyle: "long" });
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
  const meldung = uebersetzung("reset.confirm", "Möchten Sie wirklich alle Daten zurücksetzen?");
  if (!confirm(meldung)) return;

  // Sprache merken, bevor wir den Storage leeren
  const SPRACH_SCHLUESSEL = "lang";
  const gespeicherteSprache =
    localStorage.getItem(SPRACH_SCHLUESSEL) ||
    (window.I18N && window.I18N.lang) ||
    null;

  // Alles löschen (Formulardaten etc.)
  try { localStorage.clear(); } catch (fehler) {
    console.warn("Konnte localStorage nicht löschen:", fehler);
  }
  try { sessionStorage.clear(); } catch (fehler) {
    console.warn("Konnte sessionStorage nicht löschen:", fehler);
  }

  // Sprache wiederherstellen
  if (gespeicherteSprache) {
    try { localStorage.setItem(SPRACH_SCHLUESSEL, gespeicherteSprache); } catch (fehler) {
      console.warn("Konnte Sprache nicht wiederherstellen:", fehler);
    }
  }

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
  fehlerGesamtmonate = document.getElementById('errorTotalMonths');

  $("#btn-share")?.addEventListener("click", teileLink);
  $("#btn-reset")?.addEventListener("click", setzeDatenZurueck);

  try {
    const { eingaben, berechnung } = await holeZusammenfassung();
    LETZTE_EINGABEN = eingaben;
    LETZTE_BERECHNUNG = berechnung;
    fuelleEingabenliste(eingaben);
    fuelleVerkuerzungen(eingaben, berechnung);
    fuelleErgebnisse(eingaben, berechnung);
    setzeDatumstempel();
  } catch (fehler) {
    console.error("Fehler beim Laden der Daten:", fehler);
    const meldung = (fehler && fehler.message) ? String(fehler.message) : uebersetzung("errors.unknown", "Unbekannter Fehler");
    setzeText('#res-total-months', '–');
    setzeText('#res-extension', '');
    setzeText('#res-total-weeks', '–');
    setzeText('#res-school-per-week', '–');
    setzeText('#res-work-per-week', '–');
    const fehlerElement = document.getElementById('errorTotalMonths');
    if (fehlerElement) fehlerElement.textContent = meldung;
  }
}

// Erst-Init
document.addEventListener("DOMContentLoaded", initialisiere);

// Bei Sprachwechsel nur UI neu rendern (ohne neue API-Calls)
window.addEventListener("i18n:changed", () => {
  if (!LETZTE_EINGABEN || !LETZTE_BERECHNUNG) return;
  fuelleEingabenliste(LETZTE_EINGABEN);
  fuelleVerkuerzungen(LETZTE_EINGABEN, LETZTE_BERECHNUNG);
  fuelleErgebnisse(LETZTE_EINGABEN, LETZTE_BERECHNUNG);
  setzeDatumstempel();
});

// Funktion für Berechnen-Button
/**
 * Führt eine erneute Berechnung aus und aktualisiert die Ergebnisansicht.
 * Fehler werden im UI angezeigt.
 */
async function berechnen() {
  // Daten laden und anzeigen
  try {
    const { eingaben, berechnung } = await holeZusammenfassung();
    fuelleEingabenliste(eingaben);
    fuelleVerkuerzungen(eingaben, berechnung);
    fuelleErgebnisse(eingaben, berechnung);
    setzeDatumstempel();
  } catch (fehler) {
    console.error("Fehler beim Laden der Daten:", fehler);
    const meldung = (fehler && fehler.message) ? String(fehler.message) : "Unbekannter Fehler";
    setzeText('#res-total-months', '–');
    setzeText('#res-extension', '');
    setzeText('#res-total-weeks', '–');
    setzeText('#res-school-per-week', '–');
    setzeText('#res-work-per-week', '–');
    const fehlerElement = document.getElementById('errorTotalMonths');
    if (fehlerElement) fehlerElement.textContent = meldung;
  }
}


// Berechnen-Button
document.getElementById("berechnenBtn").addEventListener("click", () => {
  berechnen();
});


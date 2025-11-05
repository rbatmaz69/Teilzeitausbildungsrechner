/* script_Ergebnis_Übersicht.js – Logik der Ergebnisseite
   Bereinigte Version: kein PDF-Button, enthält Zurücksetzen-Funktion
*/

document.addEventListener("DOMContentLoaded", () => {
    const errorTotalMonths = document.getElementById('errorTotalMonths');
})

// Hilfsfunktionen für Selektoren
const $ = (sel) => document.querySelector(sel);
function setText(sel, text) { const el = $(sel); if (el) el.textContent = text; }
function show(el) { if (el) el.hidden = false; }
function hide(el) { if (el) el.hidden = true; }

/**
 * Holt die Berechnungsergebnisse vom Flask-Backend basierend auf aktuellen UI-Eingaben
 * 
 * Diese Funktion ist Teil von User Story 31 und stellt die Verbindung zwischen
 * Frontend und Backend her. Sie ersetzt die vorherigen Dummy-Daten.
 * 
 * Ablauf:
 * 1. Liest alle Eingaben aus dem HTML-Formular
 * 2. Baut einen JSON-Request auf
 * 3. Sendet diesen an POST /api/calculate (Flask-Backend)
 * 4. Verarbeitet die Antwort und formatiert sie für die UI-Darstellung
 * 
 * @returns {Promise<Object>} Objekt mit inputs und calc für die UI-Darstellung
 * @throws {Error} Bei API-Fehlern oder Netzwerkproblemen
 */
async function getSummary() {
  // ============================================================
  // SCHRITT 1: Eingaben aus dem HTML-Formular lesen
  // ============================================================
  // Alle Eingabefelder werden anhand ihrer IDs gefunden
  // Die IDs entsprechen denen in templates/index.html
  
  const baseMonthsEl = document.getElementById("dauer");         // Reguläre Ausbildungsdauer
  const weeklyHoursEl = document.getElementById("stunden");      // Wochenstunden bei Vollzeit
  const percentEl = document.getElementById("teilzeitProzent");  // Teilzeit in Prozent

  // Verkürzungsgründe werden als Checkboxes im HTML gespeichert
  // !! wandelt den Checkbox-State in einen boolean um (true/false)
  // ?. ist optional chaining: gibt undefined, wenn Element nicht existiert
  const abitur = !!document.getElementById("g-abitur")?.checked;
  const realschule = !!document.getElementById("g-realschule")?.checked;
  const alter21 = !!document.getElementById("g-alter21")?.checked;
  const vork = !!document.getElementById("g-vork")?.checked;

  // Slider für berufliche Vorkenntnisse
  const vorkSlider = document.getElementById("vork-slider");

  // Werte aus den Eingabefeldern extrahieren und in Zahlen umwandeln
  // || 0 stellt sicher, dass wir immer eine Zahl haben (auch bei leerem Feld)
  const baseMonths = Number(baseMonthsEl?.value || 0);
  const weeklyHours = Number(weeklyHoursEl?.value || 0);
  const partTimePercent = Number(percentEl?.value || 0);

  // ============================================================
  // SCHRITT 2: API-Request-Payload aufbauen
  // ============================================================
  // Die Struktur muss exakt der erwarteten API-Schnittstelle entsprechen
  // (siehe src/app.py, api_calculate())
  const payload = {
    base_duration_months: baseMonths,
    vollzeit_stunden: weeklyHours,
    teilzeit_input: partTimePercent,
    input_type: "prozent",  // Aktuell immer Prozent; könnte später erweitert werden
    verkuerzungsgruende: {
      abitur,
      realschule,
      alter_ueber_21: alter21,
      vorkenntnisse_monate: vork ? Number(vorkSlider?.value || 0) : 0,
    },
  };

  // ============================================================
  // SCHRITT 3: API-Request an Flask-Backend senden
  // ============================================================
  const resp = await fetch("/api/calculate", {
    method: "POST",  // HTTP POST, da wir Daten senden
    headers: {
      "Content-Type": "application/json",  // Backend erwartet JSON
      "Accept": "application/json",        // Wir erwarten JSON-Antwort
    },
    body: JSON.stringify(payload),  // JavaScript-Objekt in JSON-String umwandeln
  });

  // ============================================================
  // SCHRITT 4: HTTP-Status-Code prüfen
  // ============================================================
  // resp.ok ist true bei Status-Codes 200-299
  // Bei 400/422/500 gibt es einen Fehler, den wir behandeln müssen
  if (!resp.ok) {
    let message = "Fehler beim Laden der Daten";
    
    // Versuche, die Fehlerantwort vom Backend zu extrahieren
    // Das Backend sendet strukturierte Fehlerantworten (siehe src/app.py)
    try {
      const err = await resp.json();
      // Backend sendet: { error: { code: "...", message: "..." } }
      message = err?.error?.message || message;
    } catch {
      // Falls JSON-Parsing fehlschlägt, verwende Standard-Fehlermeldung
      // (z.B. bei 500-Fehlern ohne JSON-Body)
    }
    
    // Fehler weiterwerfen, damit init() ihn behandeln kann
    throw new Error(message);
  }

  // ============================================================
  // SCHRITT 5: Erfolgreiche Antwort verarbeiten
  // ============================================================
  // Backend sendet: { result: { original_dauer_monate: ..., ... } }
  const data = await resp.json();
  const r = data.result || {};  // Fallback auf leeres Objekt, falls result fehlt

  // ============================================================
  // SCHRITT 6: API-Antwort in UI-Format umwandeln
  // ============================================================
  // Die API liefert technische Daten, die wir für die Anzeige umwandeln müssen
  
  // Hauptergebnis: Finale Ausbildungsdauer in Monaten
  const totalMonths = Number(r.finale_dauer_monate || 0);
  
  // Verlängerung durch Teilzeit (kann negativ sein, wenn Verkürzung überwiegt)
  const extensionMonths = Number(r.verlaengerung_durch_teilzeit_monate || 0);
  
  // Gesamte Verkürzung in Monaten
  const totalCutMonths = Number(r.verkuerzung_gesamt_monate || 0);
  
  // Verkürzte Basis-Dauer (nach Anwendung aller Verkürzungen, aber vor Teilzeit-Verlängerung)
  const newBase = Number(r.verkuerzte_dauer_monate || 0);
  
  // Wochen berechnen: Durchschnittlich 4.33 Wochen pro Monat (52 Wochen / 12 Monate)
  const weeks = Math.round(totalMonths * 4.33);
  
  // Wochenstunden für Arbeit/Schule aufteilen
  // Arbeit: Minimum zwischen Gesamtstunden und berechneten Teilzeitstunden
  const workHoursPerWeek = Math.min(weeklyHours, Number(r.wochenstunden || 0));
  // Schule: Rest (darf nicht negativ sein)
  const schoolHoursPerWeek = Math.max(0, weeklyHours - workHoursPerWeek);

  // Liste der aktiven Verkürzungsgründe für die UI-Anzeige
  const cuts = [];
  if (abitur) cuts.push({ key: "abitur", label: "Abitur / Hochschulreife", months: 12 });
  if (realschule) cuts.push({ key: "realschule", label: "Realschulabschluss", months: 6 });
  if (alter21) cuts.push({ key: "alter_ueber_21", label: "Alter über 21 Jahre", months: 12 });
  if (vork) cuts.push({ key: "vorkenntnisse", label: "Berufliche Vorkenntnisse", months: 6 });

  // ============================================================
  // SCHRITT 7: Strukturiertes Objekt für die UI zurückgeben
  // ============================================================
  // Dieses Format wird von fillInputsList(), fillCuts(), fillResults() verwendet
  return {
    inputs: {
      baseMonths,
      weeklyHours,
      partTimePercent,
      schoolHoursPerWeek,
      workHoursPerWeek,
      cuts,
    },
    calc: {
      extensionMonths,
      totalCutMonths,
      newBase,
      totalMonths,
      totalWeeks: weeks,
    },
  };
}

/* ------------------------------
   Hilfsfunktionen zur Darstellung
   ------------------------------ */

/** Füllt die Übersichtstabelle der Eingaben */
function fillInputsList(inputs) {
  const list = $("#inputs-list");
  list.innerHTML = "";

  const rows = [
     ["Reguläre Ausbildungsdauer (Monate)", `${inputs.baseMonths}`],
     ["Wöchentliche Stunden (insgesamt)", `${inputs.weeklyHours} Std`],
     ["Teilzeitanteil", `${inputs.partTimePercent}%`],
     ["Schule / Woche", `${inputs.schoolHoursPerWeek} Std`],
     ["Arbeit / Woche", `${inputs.workHoursPerWeek} Std`],
  ];

  for (const [k, v] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = k;
    const dd = document.createElement("dd");
    dd.textContent = v;
    list.append(dt, dd);
  }
}

/** Zeigt Verkürzungsgründe und Zusammenfassung */
function fillCuts(inputs, calc) {
  const wrap = $("#cuts-section");
  const ul = $("#cuts-list");
  const sum = $("#cuts-summary");
  ul.innerHTML = "";

  const cuts = Array.isArray(inputs.cuts) ? inputs.cuts : [];
  if (!cuts.length) { hide(wrap); return; }
  show(wrap);

  cuts.forEach((c) => {
    const li = document.createElement("li");
    li.className = "tag";
    li.textContent = c.label + (c.months ? ` (−${c.months} Mon.)` : "");
    ul.appendChild(li);
  });

  sum.textContent = `Gesamt: −${calc.totalCutMonths} Monate · Neue Basis: ${calc.newBase} Monate`;
}

/** Zeigt die Hauptergebnisse */
function fillResults(inputs, calc) {
  setText("#res-total-months", `${calc.totalMonths} Monate`);
  // Zeige eine Fehlermeldung, wenn die Gesamtdauer um mehr als 12 Monate verkürzt wird.
  if (calc.totalMonths < inputs.baseMonths - 12) {
    errorTotalMonths.textContent = 'Die Gesamtdauer darf maximal um 12 Monate verkürzt werden!';
  }
  // Zeige eine Fehlermeldung, wenn die Gesamtdauer um mehr als das 1,5-fache verlängert wird.
  else if (calc.totalMonths > inputs.baseMonths * 1.5) {
    errorTotalMonths.textContent = 'Die Gesamtdauer darf maximal das 1,5-fache verlängert werden!';
  } else {
    errorTotalMonths.textContent = '';
  }

  setText(
    "#res-extension",
    calc.extensionMonths > 0
      ? `+${calc.extensionMonths} Monate Verlängerung`
      : "Keine Verlängerung"
  );
  setText("#res-total-weeks", `${calc.totalWeeks} Wochen`);
  setText("#res-school-per-week", `${inputs.schoolHoursPerWeek} Std`);
  setText("#res-work-per-week", `${inputs.workHoursPerWeek} Std`);
}

/** Setzt das Datum in der Fußzeile */
function setDateStamp() {
  const el = $("#stamp-date");
  const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" });
  el.textContent = `Stand: ${fmt.format(new Date())}`;
}

/* ------------------------------
   Aktions-Buttons
   ------------------------------ */

/** Aktuelle Seiten-URL teilen (Web Share API + Zwischenablage-Fallback) */
async function shareLink() {
  const url = new URL(location.href);
  try {
    if (navigator.share) {
      await navigator.share({
        title: "Teilzeitrechner – Ergebnis",
        text: "Hier ist meine Ergebnisübersicht.",
        url: url.toString(),
      });
    } else {
      await navigator.clipboard.writeText(url.toString());
      alert("Link in die Zwischenablage kopiert.");
    }
  } catch {}
}

/** Alle gespeicherten Daten löschen und Seite neu laden */
function resetData() {
  if (confirm("Möchten Sie wirklich alle Daten zurücksetzen?")) {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
  }
}

/* ------------------------------
   Initialisierung
   ------------------------------ */
async function init() {
  // Event-Handler für Buttons
  $("#btn-share")?.addEventListener("click", shareLink);
  $("#btn-reset")?.addEventListener("click", resetData);

  // Daten laden und anzeigen
  try {
    const { inputs, calc } = await getSummary();
    fillInputsList(inputs);
    fillCuts(inputs, calc);
    fillResults(inputs, calc);
    setDateStamp();
  } catch (err) {
    console.error("Fehler beim Laden der Daten:", err);
    const msg = (err && err.message) ? String(err.message) : "Unbekannter Fehler";
    setText('#res-total-months', '–');
    setText('#res-extension', '');
    setText('#res-total-weeks', '–');
    setText('#res-school-per-week', '–');
    setText('#res-work-per-week', '–');
    const em = document.getElementById('errorTotalMonths');
    if (em) em.textContent = msg;
  }
}

document.addEventListener("DOMContentLoaded", init);

// Funktion für Berechnen-Button
async function berechnen() {
  // Daten laden und anzeigen
  try {
    const { inputs, calc } = await getSummary();
    fillInputsList(inputs);
    fillCuts(inputs, calc);
    fillResults(inputs, calc);
    setDateStamp();
  } catch (err) {
    console.error("Fehler beim Laden der Daten:", err);
    const msg = (err && err.message) ? String(err.message) : "Unbekannter Fehler";
    setText('#res-total-months', '–');
    setText('#res-extension', '');
    setText('#res-total-weeks', '–');
    setText('#res-school-per-week', '–');
    setText('#res-work-per-week', '–');
    const em = document.getElementById('errorTotalMonths');
    if (em) em.textContent = msg;
  }
}


// Berechnen-Button
document.getElementById("berechnenBtn").addEventListener("click", () => {
  berechnen();
});

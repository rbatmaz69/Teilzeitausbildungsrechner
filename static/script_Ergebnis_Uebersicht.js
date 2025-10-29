/* script_Ergebnis_Übersicht.js – Logik der Ergebnisseite
   Bereinigte Version: kein PDF-Button, enthält Zurücksetzen-Funktion
*/

// Hilfsfunktionen für Selektoren
const $ = (sel) => document.querySelector(sel);
function setText(sel, text) { const el = $(sel); if (el) el.textContent = text; }
function show(el) { if (el) el.hidden = false; }
function hide(el) { if (el) el.hidden = true; }

/**
 * Beispieldatenobjekt – wird verwendet, bis das Flask-Backend verbunden ist.
 * Später durch einen fetch()-Aufruf zu deinem Flask-Endpunkt ersetzen.
 */
async function getSummary() {
  return {
    inputs: {
      baseMonths: 36,
      weeklyHours: 40,
      partTimePercent: 75,
      schoolHoursPerWeek: 28,
      workHoursPerWeek: 12,
      cuts: [
        { key: "abitur", label: "Abitur / Hochschulreife", months: 12 },
        { key: "experience", label: "Berufserfahrung", months: 6 },
      ],
    },
    calc: {
      extensionMonths: 12,
      totalCutMonths: 18,
      newBase: 18,
      totalMonths: 30,
      totalWeeks: 130,
    },
  };

  // Später ersetzen durch:
  // const resp = await fetch("/api/v1/parttime/summary", { headers: { "Accept": "application/json" } });
  // if (!resp.ok) throw new Error("Fehler beim Laden der Daten");
  // return await resp.json();
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
  }
}

document.addEventListener("DOMContentLoaded", init);

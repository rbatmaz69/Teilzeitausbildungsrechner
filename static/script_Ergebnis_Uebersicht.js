/* script_Ergebnis_Übersicht.js – i18n-fähige Ergebnislogik */

document.addEventListener("DOMContentLoaded", () => {
  // nichts; init() wird unten registriert
});

// Kurz-Helpers
const $ = (sel) => document.querySelector(sel);
function setText(sel, text) { const el = $(sel); if (el) el.textContent = text; }
function show(el) { if (el) el.hidden = false; }
function hide(el) { if (el) el.hidden = true; }

// i18n Helper (nutzt die globale API aus script_Sprache_Auswaehlen.js)
function t(key, fallback) {
  if (window.I18N && typeof window.I18N.t === "function") {
    return window.I18N.t(key, fallback);
  }
  return fallback ?? key;
}
function currentLang() {
  return (window.I18N && window.I18N.lang) || "de";
}

// Units/Labels aus i18n
function units() {
  return {
    h: t("units.hours.short", "h"),
    months: t("units.months.short", "Mon."),
    weeks: t("units.weeks.short", "Wo.")
  };
}

// Zustand merken, damit wir bei Sprachwechsel neu rendern können
let LAST_INPUTS = null;
let LAST_CALC = null;
let errorTotalMonths = null;

/**
 * Holt die Berechnungsergebnisse vom Backend
 */
async function getSummary() {
  const baseMonthsEl = document.getElementById("dauer");
  const weeklyHoursEl = document.getElementById("stunden");
  const percentEl = document.getElementById("teilzeitProzent");

  const abitur = !!document.getElementById("g-abitur")?.checked;
  const realschule = !!document.getElementById("g-realschule")?.checked;
  const alter21 = !!document.getElementById("g-alter21")?.checked;
  const vork = !!document.getElementById("g-vork")?.checked;

  const baseMonths = Number(baseMonthsEl?.value || 0);
  const weeklyHours = Number(weeklyHoursEl?.value || 0);
  const partTimePercent = Number(percentEl?.value || 0);

  const payload = {
    base_duration_months: baseMonths,
    vollzeit_stunden: weeklyHours,
    teilzeit_input: partTimePercent,
    input_type: "prozent",
    verkuerzungsgruende: {
      abitur,
      realschule,
      alter_ueber_21: alter21,
      vorkenntnisse_monate: vork ? 6 : 0
    }
  };

  const resp = await fetch("/api/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    let message = t("errors.fetch", "Fehler beim Laden der Daten");
    try {
      const err = await resp.json();
      message = err?.error?.message || message;
    } catch {}
    throw new Error(message);
  }

  const data = await resp.json();
  const r = data.result || {};

  const totalMonths = Number(r.finale_dauer_monate || 0);
  const extensionMonths = Number(r.verlaengerung_durch_teilzeit_monate || 0);
  const totalCutMonths = Number(r.verkuerzung_gesamt_monate || 0);
  const newBase = Number(r.verkuerzte_dauer_monate || 0);
  const weeks = Math.round(totalMonths * 4.33);

  const workHoursPerWeek = Math.min(weeklyHours, Number(r.wochenstunden || 0));
  const schoolHoursPerWeek = Math.max(0, weeklyHours - workHoursPerWeek);

  const cuts = [];
  if (abitur) cuts.push({ key: "abitur", months: 12 });
  if (realschule) cuts.push({ key: "realschule", months: 6 });
  if (alter21) cuts.push({ key: "alter_ueber_21", months: 12 });
  if (vork) cuts.push({ key: "vorkenntnisse", months: 6 });

  return {
    inputs: {
      baseMonths,
      weeklyHours,
      partTimePercent,
      schoolHoursPerWeek,
      workHoursPerWeek,
      cuts
    },
    calc: {
      extensionMonths,
      totalCutMonths,
      newBase,
      totalMonths,
      totalWeeks: weeks
    }
  };
}

/** Füllt die Übersichtstabelle der Eingaben (mit i18n) */
function fillInputsList(inputs) {
  const list = $("#inputs-list");
  if (!list) return;
  const U = units();
  list.innerHTML = "";

  const rows = [
    [ t("inputs.dauer.label", "Reguläre Ausbildungsdauer (Monate)"), `${inputs.baseMonths}` ],
    [ t("inputs.stunden.label", "Reguläre Wochenstunden (gesamt)"), `${inputs.weeklyHours} ${U.h}` ],
    [ t("inputs.teilzeit.label", "Teilzeit-Anteil"), `${inputs.partTimePercent}%` ],
    [ t("res.kv.schoolPerWeek", "Ausbildung / Woche"), `${inputs.schoolHoursPerWeek} ${U.h}` ],
    [ t("res.kv.workPerWeek", "Arbeit / Woche"), `${inputs.workHoursPerWeek} ${U.h}` ]
  ];

  for (const [k, v] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = k;
    const dd = document.createElement("dd");
    dd.textContent = v;
    list.append(dt, dd);
  }
}

/** Zeigt Verkürzungsgründe und Zusammenfassung (mit i18n) */
function fillCuts(inputs, calc) {
  const wrap = $("#cuts-section");
  const ul = $("#cuts-list");
  const sum = $("#cuts-summary");
  if (!wrap || !ul || !sum) return;

  ul.innerHTML = "";
  const cuts = Array.isArray(inputs.cuts) ? inputs.cuts : [];
  if (!cuts.length) { hide(wrap); return; }
  show(wrap);

  cuts.forEach((c) => {
    const li = document.createElement("li");
    li.className = "tag";
    // Label aus i18n je Key
    let labelKey;
    switch (c.key) {
      case "abitur": labelKey = "vk.abitur.label"; break;
      case "realschule": labelKey = "vk.realschule.label"; break;
      case "alter_ueber_21": labelKey = "vk.alter21.label"; break;
      case "vorkenntnisse": labelKey = "vk.vork.label"; break;
      default: labelKey = "";
    }
    const label = labelKey ? t(labelKey, c.key) : (c.key || "");
    const monthsWord = t("units.months.short", "Mon.");
    li.textContent = c.months ? `${label} (−${c.months} ${monthsWord})` : label;
    ul.appendChild(li);
  });

  const monthsWordFull = t("units.months.full", "Monate");
  const totalLabel = t("cuts.total", "Gesamt");
  const newBaseLabel = t("cuts.newBase", "Neue Basis");
  sum.textContent = `${totalLabel}: −${calc.totalCutMonths} ${monthsWordFull} · ${newBaseLabel}: ${calc.newBase} ${monthsWordFull}`;
}

/** Zeigt die Hauptergebnisse (mit i18n) */
function fillResults(inputs, calc) {
  const U = units();

  // Zahl + Einheit lokalisiert
  const monthsWord = t("units.months.full", "Monate");
  setText("#res-total-months", `${calc.totalMonths} ${monthsWord}`);

  // Validierungen mit i18n-Texten
  if (calc.totalMonths < inputs.baseMonths - 12) {
    setText('#errorTotalMonths', t("errors.tooShort", "Die Gesamtdauer darf maximal um 12 Monate verkürzt werden!"));
  } else if (calc.totalMonths > inputs.baseMonths * 1.5) {
    setText('#errorTotalMonths', t("errors.tooLong", "Die Gesamtdauer darf maximal das 1,5-fache verlängert werden!"));
  } else {
    setText('#errorTotalMonths', "");
  }

  // Verlängerungszeile
  const extensionLabel = t("res.extension.plus", "+{n} Monate Verlängerung")
    .replace("{n}", calc.extensionMonths);
  const noExt = t("res.extension.none", "Keine Verlängerung");
  setText("#res-extension", calc.extensionMonths > 0 ? extensionLabel : noExt);

  // Weitere Felder
  const weeksWord = t("units.weeks.short", "Wo.");
  setText("#res-total-weeks", `${calc.totalWeeks} ${weeksWord}`);
  setText("#res-school-per-week", `${inputs.schoolHoursPerWeek} ${U.h}`);
  setText("#res-work-per-week", `${inputs.workHoursPerWeek} ${U.h}`);
}

/** Setzt das Datum in der Fußzeile (lokalisiert) */
function setDateStamp() {
  const el = $("#stamp-date");
  if (!el) return;
  const lang = currentLang();
  const fmt = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "de-DE", { dateStyle: "long" });
  const label = lang === "en" ? "As of" : "Stand";
  el.textContent = `${label}: ${fmt.format(new Date())}`;
}

/* ------------------------------
   Share / Reset – mit i18n
   ------------------------------ */

async function shareLink() {
  const url = new URL(location.href);
  const title = t("share.title", "Teilzeitrechner – Ergebnis");
  const text = t("share.text", "Hier ist meine Ergebnisübersicht.");
  const copied = t("share.copied", "Link in die Zwischenablage kopiert.");
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url: url.toString() });
    } else {
      await navigator.clipboard.writeText(url.toString());
      alert(copied);
    }
  } catch {}
}

function resetData() {
  const msg = t("reset.confirm", "Möchten Sie wirklich alle Daten zurücksetzen?");
  if (!confirm(msg)) return;

  // Sprache merken, bevor wir den Storage leeren
  const LANG_KEY = "lang";
  const savedLang =
    localStorage.getItem(LANG_KEY) ||
    (window.I18N && window.I18N.lang) ||
    null;

  // Alles löschen (Formulardaten etc.)
  try { localStorage.clear(); } catch {}
  try { sessionStorage.clear(); } catch {}

  // Sprache wiederherstellen
  if (savedLang) {
    try { localStorage.setItem(LANG_KEY, savedLang); } catch {}
  }

  // Neu laden
  location.reload();
}

/* ------------------------------
   Initialisierung & Re-Render bei Sprachwechsel
   ------------------------------ */

async function init() {
  errorTotalMonths = document.getElementById('errorTotalMonths');

  $("#btn-share")?.addEventListener("click", shareLink);
  $("#btn-reset")?.addEventListener("click", resetData);

  try {
    const { inputs, calc } = await getSummary();
    LAST_INPUTS = inputs;
    LAST_CALC = calc;
    fillInputsList(inputs);
    fillCuts(inputs, calc);
    fillResults(inputs, calc);
    setDateStamp();
  } catch (err) {
    console.error("Fehler beim Laden der Daten:", err);
    const msg = (err && err.message) ? String(err.message) : t("errors.unknown", "Unbekannter Fehler");
    setText('#res-total-months', '–');
    setText('#res-extension', '');
    setText('#res-total-weeks', '–');
    setText('#res-school-per-week', '–');
    setText('#res-work-per-week', '–');
    const em = document.getElementById('errorTotalMonths');
    if (em) em.textContent = msg;
  }
}

// Erst-Init
document.addEventListener("DOMContentLoaded", init);

// Bei Sprachwechsel nur UI neu rendern (ohne neue API-Calls)
window.addEventListener("i18n:changed", () => {
  if (!LAST_INPUTS || !LAST_CALC) return;
  fillInputsList(LAST_INPUTS);
  fillCuts(LAST_INPUTS, LAST_CALC);
  fillResults(LAST_INPUTS, LAST_CALC);
  setDateStamp();
});

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


/* app.js – Ergebnisausgabe ohne Platzhalterdaten
   Erwartet, dass getSummary() später die Backend-Daten liefert.
*/

/* ==============================
   Datentypen (JSDoc für IntelliSense)
   ============================== */
/**
 * @typedef {Object} Cut
 * @property {string} key
 * @property {string} label
 * @property {number} months
 */

/**
 * @typedef {Object} Inputs
 * @property {number} baseMonths
 * @property {number} weeklyHours
 * @property {number} partTimePercent
 * @property {number} schoolHoursPerWeek
 * @property {number} workHoursPerWeek
 * @property {Cut[]} cuts
 */

/**
 * @typedef {Object} Calc
 * @property {number} extensionMonths
 * @property {number} totalCutMonths
 * @property {number} newBase
 * @property {number} totalMonths
 * @property {number} totalWeeks
 */

/**
 * @typedef {Object} Summary
 * @property {Inputs} inputs
 * @property {Calc} calc
 */

/* ==============================
   Leere Backend-Methode (von dir zu implementieren)
   ============================== */
/**
 * Holt die Ergebnisdaten aus deinem Flask-Backend.
 * Muss ein Promise zurückgeben, das { inputs, calc } liefert.
 *
 * @returns {Promise<Summary>}
 */
async function getSummary() {
  // Default json Objekt bis Backend mit Flask eingebunden wurde
  return {
    inputs: {
      baseMonths: 36,
      weeklyHours: 40,
      partTimePercent: 75,
      schoolHoursPerWeek: 28,
      workHoursPerWeek: 12,
      cuts: [
        { key: "abitur", label: "Abitur / Fachabitur", months: 12 },
        { key: "vorkenntnisse", label: "Berufliche Vorkenntnisse", months: 6 }
      ]
    },
    calc: {
      extensionMonths: 12,
      totalCutMonths: 18,
      newBase: 18,
      totalMonths: 30,
      totalWeeks: 130
    }
  };
  // TODO: Hier deine Flask-Route anbinden, z. B.:
  // const resp = await fetch("/api/v1/teilzeit/summary", { headers: { "Accept": "application/json" }});
  // if (!resp.ok) throw new Error("Fehler beim Laden");
  // return /** @type {Summary} */ (await resp.json());

  // Aktuell absichtlich nicht implementiert:
  throw new Error("getSummary() ist noch nicht implementiert.");
}

/* ==============================
   DOM-Utils
   ============================== */
const $ = (sel) => document.querySelector(sel);
function setText(sel, text) { const el = $(sel); if (el) el.textContent = text; }
function show(el) { if (el) el.hidden = false; }
function hide(el) { if (el) el.hidden = true; }

/* ==============================
   UI-Befüllung
   ============================== */
function fillInputsList(inputs) {
  const list = $("#inputs-list");
  if (!list) return;
  list.innerHTML = "";

  const rows = [
    ["Reguläre Ausbildungsdauer (Monate)", `${inputs.baseMonths}`],
    ["Wochenstunden (gesamt)", `${inputs.weeklyHours} h`],
    ["Teilzeit-Anteil", `${inputs.partTimePercent}%`],
    ["Ausbildung / Woche", `${inputs.schoolHoursPerWeek} h`],
    ["Arbeit / Woche", `${inputs.workHoursPerWeek} h`],
  ];

  for (const [k, v] of rows) {
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    list.append(dt, dd);
  }
}

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
    li.textContent = c.label + (c.months ? ` (−${c.months} Mon.)` : "");
    ul.appendChild(li);
  });

  sum.textContent = `Gesamt: −${calc.totalCutMonths} Monate · Neue Basis: ${calc.newBase} Monate`;
}

function fillResults(inputs, calc) {
  setText("#res-total-months", `${calc.totalMonths} Monate`);
  setText("#res-extension", calc.extensionMonths > 0 ? `+${calc.extensionMonths} Monate Verlängerung` : "Keine Verlängerung");
  setText("#res-total-weeks", `${calc.totalWeeks} Wochen`);
  setText("#res-school-per-week", `${inputs.schoolHoursPerWeek} h`);
  setText("#res-work-per-week", `${inputs.workHoursPerWeek} h`);
}

function setDateStamp() {
  const el = $("#stamp-date");
  if (!el) return;
  const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" });
  el.textContent = `Stand: ${fmt.format(new Date())}`;
}

/* ==============================
   Aktionen
   ============================== */
async function shareLink() {
  const url = new URL(location.href);
  try {
    if (navigator.share) {
      await navigator.share({ title: "Teilzeitrechner – Ergebnis", text: "Hier ist meine Ergebnisübersicht.", url: url.toString() });
    } else {
      await navigator.clipboard.writeText(url.toString());
      alert("Link in die Zwischenablage kopiert.");
    }
  } catch {}
}
function goBack() {
  const target = localStorage.getItem("tzrBackHref") || document.referrer || "";
  if (target) location.href = target; else history.back();
}
function printPDF() { window.print(); }

/* ==============================
   Init
   ============================== */
async function init() {
  // Buttons
  const backBtn = $("#btn-back-mobile") || $("#btn-back");
  if (backBtn) backBtn.addEventListener("click", goBack);
  const shareBtn = $("#btn-share");
  if (shareBtn) shareBtn.addEventListener("click", shareLink);
  const printBtn = $("#btn-print");
  if (printBtn) printBtn.addEventListener("click", printPDF);

  try {
    const { inputs, calc } = await getSummary(); // <— einziges Datenentry
    fillInputsList(inputs);
    fillCuts(inputs, calc);
    fillResults(inputs, calc);
    setDateStamp();
  } catch (err) {
    console.error(err);
    // absichtliche Zurückhaltung: keine Fallback-Daten hier,
    // damit klar ist, dass die Backend-Anbindung fehlt
  }
}

document.addEventListener("DOMContentLoaded", init);

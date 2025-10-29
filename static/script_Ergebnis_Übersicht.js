/* script_Ergebnis_Übersicht.js – results page logic
   Clean version: no PDF button, includes reset functionality
*/

// Helper selector shortcuts
const $ = (sel) => document.querySelector(sel);
function setText(sel, text) { const el = $(sel); if (el) el.textContent = text; }
function show(el) { if (el) el.hidden = false; }
function hide(el) { if (el) el.hidden = true; }

/**
 * Example data object – used until the Flask backend is connected.
 * Replace this later with a fetch() call to your Flask endpoint.
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
        { key: "abitur", label: "A-Levels / High School Diploma", months: 12 },
        { key: "experience", label: "Previous Work Experience", months: 6 },
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

  // Later replace with:
  // const resp = await fetch("/api/v1/parttime/summary", { headers: { "Accept": "application/json" } });
  // if (!resp.ok) throw new Error("Error loading data");
  // return await resp.json();
}

/* ------------------------------
   Rendering helper functions
   ------------------------------ */

/** Fill the input overview table */
function fillInputsList(inputs) {
  const list = $("#inputs-list");
  list.innerHTML = "";

  const rows = [
    ["Regular Training Duration (months)", `${inputs.baseMonths}`],
    ["Weekly Hours (total)", `${inputs.weeklyHours} h`],
    ["Part-time Share", `${inputs.partTimePercent}%`],
    ["School / Week", `${inputs.schoolHoursPerWeek} h`],
    ["Work / Week", `${inputs.workHoursPerWeek} h`],
  ];

  for (const [k, v] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = k;
    const dd = document.createElement("dd");
    dd.textContent = v;
    list.append(dt, dd);
  }
}

/** Render shortening reasons and summary text */
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
    li.textContent = c.label + (c.months ? ` (−${c.months} mo.)` : "");
    ul.appendChild(li);
  });

  sum.textContent = `Total: −${calc.totalCutMonths} months · New Base: ${calc.newBase} months`;
}

/** Render the main result numbers */
function fillResults(inputs, calc) {
  setText("#res-total-months", `${calc.totalMonths} months`);
  setText(
    "#res-extension",
    calc.extensionMonths > 0
      ? `+${calc.extensionMonths} months extension`
      : "No extension"
  );
  setText("#res-total-weeks", `${calc.totalWeeks} weeks`);
  setText("#res-school-per-week", `${inputs.schoolHoursPerWeek} h`);
  setText("#res-work-per-week", `${inputs.workHoursPerWeek} h`);
}

/** Set the date in the footer */
function setDateStamp() {
  const el = $("#stamp-date");
  const fmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" });
  el.textContent = `As of: ${fmt.format(new Date())}`;
}

/* ------------------------------
   Action buttons
   ------------------------------ */

/** Share current page link (Web Share API + clipboard fallback) */
async function shareLink() {
  const url = new URL(location.href);
  try {
    if (navigator.share) {
      await navigator.share({
        title: "Part-Time Calculator – Result",
        text: "Here is my result overview.",
        url: url.toString(),
      });
    } else {
      await navigator.clipboard.writeText(url.toString());
      alert("Link copied to clipboard.");
    }
  } catch {}
}

/** Reset all stored data and reload the page */
function resetData() {
  if (confirm("Do you really want to reset all data?")) {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
  }
}

/* ------------------------------
   Initialization
   ------------------------------ */
async function init() {
  // Attach button event handlers
  $("#btn-share")?.addEventListener("click", shareLink);
  $("#btn-reset")?.addEventListener("click", resetData);

  // Load data and render
  try {
    const { inputs, calc } = await getSummary();
    fillInputsList(inputs);
    fillCuts(inputs, calc);
    fillResults(inputs, calc);
    setDateStamp();
  } catch (err) {
    console.error("Error loading data:", err);
  }
}

document.addEventListener("DOMContentLoaded", init);

// script.js
document.addEventListener("DOMContentLoaded", () => {
  // Elemente (IDs wie in deinem HTML)
  const dauerInput = document.getElementById("dauer");
  const wochenstundenInput = document.getElementById("stunden");
  const teilzeitProzentInput = document.getElementById("teilzeitProzent");
  const teilzeitProzentMin = 50;
  const teilzeitStundenInput = document.getElementById("teilzeitStunden");
  const buttons = document.querySelectorAll(".preset");
  const errorProzent = document.getElementById('errorProzent');
  const errorStunden = document.getElementById('errorStunden');


  // Sicherheitscheck
  if (!dauerInput || !wochenstundenInput || !teilzeitProzentInput || !teilzeitStundenInput) {
    console.error("Ein oder mehrere benötigte Elemente wurden nicht gefunden. Prüfe die IDs in HTML und JS.");
    return;
  }

  // Helpers: Parsing, Step-Rounding und Clamping
  function parseNum(input) {
    if (input.value === '' || input.value === null || input.value === undefined) return '';
    const n = Number(input.value);
    return Number.isNaN(n) ? '' : n;
  }

  function roundToStep(base, step, value) {
    if (!step || step <= 0) return value;
    const relative = value - (Number.isFinite(base) ? base : 0);
    const snapped = Math.round(relative / step) * step + (Number.isFinite(base) ? base : 0);
    return snapped;
  }

  function clampToMinMaxStep(input, opts = {}) {
    const { dynamicMin, dynamicMax, snapToStep = false, baseForStep } = opts;
    const raw = input.value;
    if (raw === '' || raw === null || raw === undefined) return; // leere Zwischenstände erlauben

    let val = Number(raw);
    if (Number.isNaN(val)) return;

    const attrMin = input.getAttribute('min');
    const attrMax = input.getAttribute('max');
    const attrStep = input.getAttribute('step');

    const minVal = Number.isFinite(dynamicMin) ? dynamicMin : (attrMin !== null ? Number(attrMin) : undefined);
    const maxVal = Number.isFinite(dynamicMax) ? dynamicMax : (attrMax !== null ? Number(attrMax) : undefined);
    const stepVal = attrStep !== null && attrStep !== 'any' ? Number(attrStep) : undefined;

    if (Number.isFinite(minVal) && val < minVal) val = minVal;
    if (Number.isFinite(maxVal) && val > maxVal) val = maxVal;

    if (snapToStep && Number.isFinite(stepVal) && stepVal > 0) {
      const base = Number.isFinite(baseForStep) ? baseForStep : (Number.isFinite(minVal) ? minVal : 0);
      val = roundToStep(base, stepVal, val);
      // Nach dem Snapping erneut begrenzen, falls Rundung über Grenzen ging
      if (Number.isFinite(minVal) && val < minVal) val = minVal;
      if (Number.isFinite(maxVal) && val > maxVal) val = maxVal;
    }

    // Wert zurückschreiben ohne unnötige Nachkommastellen
    input.value = Number.isInteger(val) ? String(val) : String(+val.toFixed(2));
  }

  // Wird ausgeführt, nachdem eine neue Ausbildungsdauer eingegeben wurde
  dauerInput.addEventListener("blur", () => {
    if (dauerInput.value < 0) {
      dauerInput.value = 0;
    }
  })
  
  // Wird ausgeführt, nachdem neue reguläre Wochenstunden eingegeben wurden
  wochenstundenInput.addEventListener("blur", () => {
    if (wochenstundenInput.value < 0) {
      wochenstundenInput.value = 0;
    }
    const gesamt = parseInt(wochenstundenInput.value);
    const prozent = parseInt(teilzeitProzentInput.value);
    if (!isNaN(gesamt) && !isNaN(prozent)) {
      teilzeitStundenInput.value = (gesamt * prozent / 100).toFixed(1);
    }
  })
  
  // Wird ausgeführt, nachdem ein neuer Prozentwert eingegeben wurde
  teilzeitProzentInput.addEventListener("blur", () => {
    checkMinAndMaxPercent();
    syncStunden();
  })
  
  // Wird ausgeführt, nachdem ein neuer Teilzeit-wochenstundenwert eingegeben wurde
  teilzeitStundenInput.addEventListener("blur", () => {
    checkMinAndMaxStunden();
    syncProzent();
  })

  // Live-Validierung beim Tippen (input)
  dauerInput.addEventListener('input', () => {
    // live kein hartes Clamping, erst bei blur
    if (dauerInput.value === '') return;
  });

  wochenstundenInput.addEventListener('input', () => {
    if (wochenstundenInput.value === '') return;
    // live: keine harte Korrektur; nur abhängige Anzeigen und Fehlertexte
    const gesamt = Number(wochenstundenInput.value);
    const dynMin = Number.isFinite(gesamt) ? gesamt / 2 : undefined;
    const dynMax = Number.isFinite(gesamt) ? gesamt : undefined;

    // min/max Attribute dynamisch anpassen, damit Browser-Grenzen sichtbar sind
    if (Number.isFinite(dynMin)) {
      teilzeitStundenInput.setAttribute('min', String(dynMin));
    }
    if (Number.isFinite(dynMax)) {
      teilzeitStundenInput.setAttribute('max', String(dynMax));
    }

    // Fehlertext Stunden nach neuem Rahmen aktualisieren
    if (teilzeitStundenInput.value !== '' && Number.isFinite(gesamt)) {
      const st = Number(teilzeitStundenInput.value);
      if (!Number.isNaN(st) && Number.isFinite(dynMin) && Number.isFinite(dynMax)) {
        if (st < dynMin) {
          errorStunden.textContent = 'Die Wochenstunden müssen mindestens die Hälfte der regulären Wochenstunden entsprechen';
        } else if (st > dynMax) {
          errorStunden.textContent = 'Die Wochenstunden dürfen die regulären Wochenstunden nicht überschreiten';
        } else {
          errorStunden.textContent = '';
        }
      }
    }

    // Nur synchronisieren, wenn Zahlen vorhanden
    const prozent = parseFloat(teilzeitProzentInput.value);
    if (!Number.isNaN(gesamt) && !Number.isNaN(prozent)) {
      teilzeitStundenInput.value = (gesamt * prozent / 100).toFixed(1);
    }
    if (!Number.isNaN(gesamt) && teilzeitStundenInput.value !== '') {
      const st = parseFloat(teilzeitStundenInput.value);
      if (!Number.isNaN(st) && gesamt > 0) {
        teilzeitProzentInput.value = ((st / gesamt) * 100).toFixed(1);
      }
    }
  });

  teilzeitProzentInput.addEventListener('input', () => {
    if (teilzeitProzentInput.value === '') { errorProzent.textContent = ''; clearActiveButtons(); return; }
    // live: keine harte Korrektur, nur Fehler anzeigen und ggf. synchronisieren wenn im Rahmen
    const v = Number(teilzeitProzentInput.value);
    if (!Number.isNaN(v)) {
      if (v < teilzeitProzentMin) {
        errorProzent.textContent = 'Der Teilzeit-Anteil muss mindestens 50% betragen';
      } else if (v > 100) {
        errorProzent.textContent = 'Der Teilzeit-Anteil darf 100% nicht überschreiten';
      } else {
        errorProzent.textContent = '';
        syncStunden();
      }
    }
    clearActiveButtons();
  });

  teilzeitStundenInput.addEventListener('input', () => {
    if (teilzeitStundenInput.value === '') { errorStunden.textContent = ''; clearActiveButtons(); return; }
    // live: keine harte Korrektur, nur Fehler anzeigen und ggf. synchronisieren wenn im Rahmen
    const gesamt = Number(wochenstundenInput.value);
    const st = Number(teilzeitStundenInput.value);
    if (!Number.isNaN(gesamt) && !Number.isNaN(st)) {
      const dynMin = gesamt / 2;
      const dynMax = gesamt;
      if (st > dynMax) {
        // zu hohe Eingabe sofort deckeln
        teilzeitStundenInput.value = String(dynMax);
        errorStunden.textContent = '';
        syncProzent();
      } else if (st < dynMin) {
        errorStunden.textContent = 'Die Wochenstunden müssen mindestens die Hälfte der regulären Wochenstunden entsprechen';
      } else {
        errorStunden.textContent = '';
        syncProzent();
      }
    }
    clearActiveButtons();
  });

  // Button-Klicks für Prozent/Stunden
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      clearActiveButtons();
      btn.classList.add("active");

      const type = btn.dataset.type;
      const value = parseFloat(btn.dataset.value);
      const gesamt = parseFloat(wochenstundenInput.value);

      if (type === "percent") {
        teilzeitProzentInput.value = value;
        if (!isNaN(gesamt)) teilzeitStundenInput.value = (gesamt * value / 100).toFixed(1);
      } else if (type === "hours") {
        teilzeitStundenInput.value = value;
        if (!isNaN(gesamt) && gesamt > 0) teilzeitProzentInput.value = ((value / gesamt) * 100).toFixed(1);
      }

      berechneDauer();
    });
  });

  // Syncronisiere die Wochenstunden mit dem Prozentwert
  function syncStunden() {
    const gesamt = parseFloat(wochenstundenInput.value);
    const prozent = parseFloat(teilzeitProzentInput.value);
    // Nur synchronisieren, wenn Prozent im gültigen Bereich liegt
    if (!isNaN(gesamt) && !isNaN(prozent) && prozent >= teilzeitProzentMin && prozent <= 100) {
      const stunden = (gesamt * prozent / 100);
      teilzeitStundenInput.value = stunden.toFixed(1);
    }
    clearActiveButtons();
  }
  
  // Syncronisiere den Prozentwert mit den Wochenstunden
  function syncProzent() {
    const gesamt = parseFloat(wochenstundenInput.value);
    const stunden = parseFloat(teilzeitStundenInput.value);
    if (!isNaN(gesamt) && !isNaN(stunden) && gesamt > 0) {
      // Nur synchronisieren, wenn Stunden im dynamisch gültigen Bereich liegen
      const dynMin = gesamt / 2;
      const dynMax = gesamt;
      if (stunden >= dynMin && stunden <= dynMax) {
        teilzeitProzentInput.value = ((stunden / gesamt) * 100).toFixed(1);
      }
    }
    clearActiveButtons();
  }
  
  // Verhindere, dass Werte unter oder über den Minimal- und Maximalwerten eingetragen werden
  function checkMinAndMaxPercent() {
    // Check min value
    if (teilzeitProzentInput.value !== '' && Number(teilzeitProzentInput.value) < teilzeitProzentMin) {
      teilzeitProzentInput.value = teilzeitProzentMin;
      errorProzent.textContent = 'Der Teilzeit-Anteil muss mindestens 50% betragen';
    } else {
      errorProzent.textContent = '';
    }
    // Check max value
    if (teilzeitProzentInput.value > 100) {
      teilzeitProzentInput.value = 100;
    }
  }
  
  // Verhindere, dass Werte unter oder über den Minimal- und Maximalwerten eingetragen werden
  function checkMinAndMaxStunden() {
    // Check min value
    if (teilzeitStundenInput.value < wochenstundenInput.value / 2) {
      teilzeitStundenInput.value = wochenstundenInput.value / 2;
      errorStunden.textContent = 'Die Wochenstunden müssen mindestens die Hälfte der regulären Wochenstunden entsprechen';
    } else {
      errorStunden.textContent = '';
    }
    // Check max value
    if (teilzeitStundenInput.value > wochenstundenInput.value) {
      teilzeitStundenInput.value = wochenstundenInput.value;
    }
  }
  
  // Aktive Buttons zurücksetzen
  function clearActiveButtons() {
    buttons.forEach(btn => btn.classList.remove("active"));
  }
});
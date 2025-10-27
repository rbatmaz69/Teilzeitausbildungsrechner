// script.js
document.addEventListener("DOMContentLoaded", () => {
  // Elemente (IDs wie in deinem HTML)
  const dauerInput = document.getElementById("dauer");
  const wochenstundenInput = document.getElementById("stunden");
  const teilzeitProzentInput = document.getElementById("teilzeitProzent");
  const teilzeitStundenInput = document.getElementById("teilzeitStunden");
  const buttons = document.querySelectorAll(".preset");

  // Sicherheitscheck: existieren alle Elemente?
  if (!dauerInput || !wochenstundenInput || !teilzeitProzentInput || !teilzeitStundenInput) {
    console.error("Ein oder mehrere benötigte Elemente wurden nicht gefunden. Prüfe die IDs in HTML und JS.");
    return;
  }

  // Prozent → Stunden
  teilzeitProzentInput.addEventListener("input", () => {
    const gesamt = parseFloat(wochenstundenInput.value);
    const prozent = parseFloat(teilzeitProzentInput.value);
    if (!isNaN(gesamt) && !isNaN(prozent)) {
      teilzeitStundenInput.value = (gesamt * prozent / 100).toFixed(1);
    }
    clearActiveButtons();
  });

  // Stunden → Prozent
  teilzeitStundenInput.addEventListener("input", () => {
    const gesamt = parseFloat(wochenstundenInput.value);
    const stunden = parseFloat(teilzeitStundenInput.value);
    if (!isNaN(gesamt) && !isNaN(stunden) && gesamt > 0) {
      teilzeitProzentInput.value = ((stunden / gesamt) * 100).toFixed(1);
    }
    clearActiveButtons();
  });

  // Wochenstunden geändert → Teilzeit neu berechnen
  wochenstundenInput.addEventListener("input", () => {
    const gesamt = parseFloat(wochenstundenInput.value);
    const prozent = parseFloat(teilzeitProzentInput.value);
    if (!isNaN(gesamt) && !isNaN(prozent)) {
      teilzeitStundenInput.value = (gesamt * prozent / 100).toFixed(1);
    }
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

  // Hilfsfunktion: aktive Buttons zurücksetzen
  function clearActiveButtons() {
    buttons.forEach(btn => btn.classList.remove("active"));
  }
});
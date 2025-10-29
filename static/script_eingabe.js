// script.js
document.addEventListener("DOMContentLoaded", () => {
  // Elemente (IDs wie in deinem HTML)
  const dauerInput = document.getElementById("dauer");
  const wochenstundenInput = document.getElementById("stunden");
  const teilzeitProzentInput = document.getElementById("teilzeitProzent");
  const teilzeitProzentMin = 50;
  const teilzeitStundenInput = document.getElementById("teilzeitStunden");
  const buttons = document.querySelectorAll(".preset");

  // Sicherheitscheck
  if (!dauerInput || !wochenstundenInput || !teilzeitProzentInput || !teilzeitStundenInput) {
    console.error("Ein oder mehrere benötigte Elemente wurden nicht gefunden. Prüfe die IDs in HTML und JS.");
    return;
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
    if (!isNaN(gesamt) && !isNaN(prozent)) {
      teilzeitStundenInput.value = (gesamt * prozent / 100).toFixed(1);
    }
    clearActiveButtons();
  }
  
  // Syncronisiere den Prozentwert mit den Wochenstunden
  function syncProzent() {
    const gesamt = parseFloat(wochenstundenInput.value);
    const stunden = parseFloat(teilzeitStundenInput.value);
    if (!isNaN(gesamt) && !isNaN(stunden) && gesamt > 0) {
      teilzeitProzentInput.value = ((stunden / gesamt) * 100).toFixed(1);
    }
    clearActiveButtons();
  }
  
  // Verhindere, dass Werte unter oder über den Minimal- und Maximalwerten eingetragen werden
  function checkMinAndMaxPercent() {
    // Check min value
    if (teilzeitProzentInput.value !== '' && Number(teilzeitProzentInput.value) < teilzeitProzentMin) {
        teilzeitProzentInput.value = teilzeitProzentMin;
    }
    // Check max value
    if (teilzeitProzentInput.value > 100) {
      teilzeitProzentInput.value = 100;
    }
  }
  
  // Verhindere, dass Werte unter oder über den Minimal- und Maximalwerten eingetragen werden
  function checkMinAndMaxStunden() {
    // Check min value
    if (teilzeitStundenInput < wochenstundenInput / 2) {
        teilzeitStundenInput.value = wochenstundenInput / 2;
    }
    // Check max value
    if (teilzeitStundenInput > wochenstundenInput) {
        teilzeitStundenInput.value = wochenstundenInput;
    }
  }
  
  // Aktive Buttons zurücksetzen
  function clearActiveButtons() {
    buttons.forEach(btn => btn.classList.remove("active"));
  }
});

/**
 * Initialisiert alle Formularelemente und synchronisiert Prozent- und Stunden-Eingaben.
 *
 * Alle Listener sorgen dafür, dass Eingaben valide bleiben und UI-Buttons korrekt
 * reagieren. Die Funktion wird automatisch nach dem Laden des DOMs ausgeführt.
 */
document.addEventListener("DOMContentLoaded", () => {

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

  // Wird ausgeführt, nachdem eine neue Ausbildungsdauer eingegeben wurde
  dauerInput.addEventListener("blur", () => {
    const ausbildungsdauer = parseInt(dauerInput.value);

    // Mindest- und Maximalwerte für die reguläre Ausbildungsdauer
    if (isNaN(ausbildungsdauer) || ausbildungsdauer < 12) {
      dauerInput.value = 12;
    } else if (ausbildungsdauer > 60) {
      dauerInput.value = 60;
    }
  })
  
  // Wird ausgeführt, nachdem neue reguläre Wochenstunden eingegeben wurden
  wochenstundenInput.addEventListener("blur", () => {
    const wochenstunden = parseInt(wochenstundenInput.value);

    // Mindest- und Maximalwerte für die regulären Wochenstunden
    if (isNaN(wochenstunden) || wochenstunden < 10) {
      wochenstundenInput.value = 10;
    } else if (wochenstunden > 48) {
      wochenstundenInput.value = 48;
    }

    // Synchronisiere die Teilzeit-Wochenstunden basierend auf dem Prozentwert
    const prozent = parseInt(teilzeitProzentInput.value);
    if (!isNaN(wochenstunden) && !isNaN(prozent)) {
      teilzeitStundenInput.value = (wochenstundenInput.value * prozent / 100).toFixed(1);
    }

    // Deaktiviere Stunden-Buttons, die über den regulären Wochenstunden liegen
    buttons.forEach(btn => {
      if (btn.dataset.type === "hours") {
        const btnValue = parseFloat(btn.dataset.value);
        if (btnValue > wochenstundenInput.value) {
          btn.disabled = true;
          btn.style.visibility = "hidden";
          btn.classList.remove("active");
        } else {
          btn.disabled = false;
          btn.style.visibility = "visible";
        }
      }
    });
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
      const wochenStunden = parseFloat(wochenstundenInput.value);

      if (type === "percent") {
        teilzeitProzentInput.value = value;
        if (!isNaN(wochenStunden)) teilzeitStundenInput.value = (wochenStunden * value / 100).toFixed(1);
      } else if (type === "hours") {
        teilzeitStundenInput.value = value;
        if (!isNaN(wochenStunden) && wochenStunden > 0) teilzeitProzentInput.value = ((value / wochenStunden) * 100).toFixed(1);
      }
    });
  });

  /**
   * Synchronisiert die Wochenstunden mit dem Teilzeit-Prozentwert.
   * Stellt sicher, dass bei geänderten Prozentwerten die abgeleiteten Stunden
   * automatisch aktualisiert werden.
   */
  function syncStunden() {
    const gesamt = parseFloat(wochenstundenInput.value);
    const prozent = parseFloat(teilzeitProzentInput.value);
    if (!isNaN(gesamt) && !isNaN(prozent)) {
      teilzeitStundenInput.value = (gesamt * prozent / 100).toFixed(1);
    }
    clearActiveButtons();
  }
  
  /**
   * Synchronisiert den Prozentwert mit den Wochenstunden.
   * Wird verwendet, wenn die Wochenstunden direkt eingegeben oder über Presets gesetzt werden.
   */
  function syncProzent() {
    const gesamt = parseFloat(wochenstundenInput.value);
    const stunden = parseFloat(teilzeitStundenInput.value);
    if (!isNaN(gesamt) && !isNaN(stunden) && gesamt > 0) {
      teilzeitProzentInput.value = ((stunden / gesamt) * 100).toFixed(1);
    }
    clearActiveButtons();
  }
  
  /**
   * Validiert den Teilzeit-Prozentwert und erzwingt die gesetzlichen Grenzen von 50-100%.
   * Rückmeldungen werden in der UI angezeigt.
   */
  function checkMinAndMaxPercent() {
    const teilzeitProzent = parseFloat(teilzeitProzentInput.value);
    
    // Überprüfung, ob die Eingabe eine gültige Zahl ist
    if (isNaN(teilzeitProzent)) {
      teilzeitProzentInput.value = teilzeitProzentMin;
      errorProzent.textContent = 'Bitte geben Sie eine gültige Zahl für den Teilzeit-Anteil ein';
    }

    // Check min value
    else if (teilzeitProzent < teilzeitProzentMin) {
      teilzeitProzentInput.value = teilzeitProzentMin;
      errorProzent.textContent = 'Der Teilzeit-Anteil muss mindestens 50% betragen';
    }

    // Check max value
    else if (teilzeitProzent > 100) {
      teilzeitProzentInput.value = 100;
      errorProzent.textContent = 'Der Teilzeit-Anteil darf 100% nicht überschreiten';
    }

    else {
      errorProzent.textContent = '';
    }
  }
  
  /**
   * Validiert die Teilzeit-Wochenstunden und hält sie im erlaubten Bereich
   * zwischen der Hälfte und der vollen Wochenarbeitszeit.
   */
  function checkMinAndMaxStunden() {
    const wochenstunden = parseFloat(wochenstundenInput.value);
    const teilzeitStunden = parseFloat(teilzeitStundenInput.value);

    // Überprüfung, ob die Eingabe eine gültige Zahl ist
    if (isNaN(teilzeitStunden)) {
      teilzeitStundenInput.value = wochenstundenInput.value / 2;
      errorStunden.textContent = 'Bitte geben Sie eine gültige Zahl für die Teilzeit-Wochenstunden ein';
    }

    // Check min value
    else if (teilzeitStunden < wochenstunden / 2) {
      teilzeitStundenInput.value = wochenstundenInput.value / 2;
      errorStunden.textContent = 'Die Wochenstunden müssen mindestens die Hälfte der regulären Wochenstunden entsprechen';
    }

    // Check max value
    else if (teilzeitStunden > wochenstunden) {
      teilzeitStundenInput.value = wochenstundenInput.value;
      errorStunden.textContent = 'Die Wochenstunden dürfen die regulären Wochenstunden nicht überschreiten';
    }

    else {
      errorStunden.textContent = '';
    }
  }
  
  /** Entfernt den aktiven Zustand aller Preset-Buttons. */
  function clearActiveButtons() {
    buttons.forEach(btn => btn.classList.remove("active"));
  }
});

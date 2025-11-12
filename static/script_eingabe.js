/**
 * Initialisiert alle Formularelemente und synchronisiert Prozent- und Stunden-Eingaben.
 *
 * Alle Listener sorgen dafür, dass Eingaben valide bleiben und UI-Buttons korrekt
 * reagieren. Die Funktion wird automatisch nach dem Laden des DOMs ausgeführt.
 */
document.addEventListener("DOMContentLoaded", () => {

  const dauerEingabe = document.getElementById("dauer");
  const wochenstundenEingabe = document.getElementById("stunden");
  const teilzeitProzentEingabe = document.getElementById("teilzeitProzent");
  const teilzeitProzentMinimum = 50;
  const teilzeitStundenEingabe = document.getElementById("teilzeitStunden");
  const buttons = document.querySelectorAll(".preset");
  const fehlerProzent = document.getElementById('errorProzent');
  const fehlerStunden = document.getElementById('errorStunden');

  // Sicherheitscheck
  if (!dauerEingabe || !wochenstundenEingabe || !teilzeitProzentEingabe || !teilzeitStundenEingabe) {
    console.error("Ein oder mehrere benötigte Elemente wurden nicht gefunden. Prüfe die IDs in HTML und JS.");
    return;
  }

  // Wird ausgeführt, nachdem eine neue Ausbildungsdauer eingegeben wurde
  dauerEingabe.addEventListener("blur", () => {
    const ausbildungsdauer = parseInt(dauerEingabe.value);

    // Mindest- und Maximalwerte für die reguläre Ausbildungsdauer
    if (isNaN(ausbildungsdauer) || ausbildungsdauer < 12) {
      dauerEingabe.value = 12;
    } else if (ausbildungsdauer > 60) {
      dauerEingabe.value = 60;
    }
  })
  
  // Wird ausgeführt, nachdem neue reguläre Wochenstunden eingegeben wurden
  wochenstundenEingabe.addEventListener("blur", () => {
    const wochenstunden = parseInt(wochenstundenEingabe.value);

    // Mindest- und Maximalwerte für die regulären Wochenstunden
    if (isNaN(wochenstunden) || wochenstunden < 10) {
      wochenstundenEingabe.value = 10;
    } else if (wochenstunden > 48) {
      wochenstundenEingabe.value = 48;
    }

    // Synchronisiere die Teilzeit-Wochenstunden basierend auf dem Prozentwert
    const prozent = parseInt(teilzeitProzentEingabe.value);
    if (!isNaN(wochenstunden) && !isNaN(prozent)) {
      teilzeitStundenEingabe.value = (wochenstundenEingabe.value * prozent / 100).toFixed(1);
    }

    // Deaktiviere Stunden-Buttons, die über den regulären Wochenstunden liegen
    buttons.forEach(btn => {
      if (btn.dataset.type === "hours") {
        const schaltflaecheWert = parseFloat(btn.dataset.value);
        if (schaltflaecheWert > wochenstundenEingabe.value) {
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
  teilzeitProzentEingabe.addEventListener("blur", () => {
    pruefeMindestUndMaximalProzent();
    synchronisiereStunden();
  })
  
  // Wird ausgeführt, nachdem ein neuer Teilzeit-wochenstundenwert eingegeben wurde
  teilzeitStundenEingabe.addEventListener("blur", () => {
    pruefeMindestUndMaximalStunden();
    synchronisiereProzent();
  })

  // Button-Klicks für Prozent/Stunden
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      loescheAktiveSchaltflaechen();
      btn.classList.add("active");

      const typ = btn.dataset.type;
      const wert = parseFloat(btn.dataset.value);
      const wochenStunden = parseFloat(wochenstundenEingabe.value);

      if (typ === "percent") {
        teilzeitProzentEingabe.value = wert;
        if (!isNaN(wochenStunden)) teilzeitStundenEingabe.value = (wochenStunden * wert / 100).toFixed(1);
      } else if (typ === "hours") {
        teilzeitStundenEingabe.value = wert;
        if (!isNaN(wochenStunden) && wochenStunden > 0) teilzeitProzentEingabe.value = ((wert / wochenStunden) * 100).toFixed(1);
      }
    });
  });

  /**
   * Synchronisiert die Wochenstunden mit dem Teilzeit-Prozentwert.
   * Stellt sicher, dass bei geänderten Prozentwerten die abgeleiteten Stunden
   * automatisch aktualisiert werden.
   */
  function synchronisiereStunden() {
    const gesamt = parseFloat(wochenstundenEingabe.value);
    const prozent = parseFloat(teilzeitProzentEingabe.value);
    if (!isNaN(gesamt) && !isNaN(prozent)) {
      teilzeitStundenEingabe.value = (gesamt * prozent / 100).toFixed(1);
    }
    loescheAktiveSchaltflaechen();
  }
  
  /**
   * Synchronisiert den Prozentwert mit den Wochenstunden.
   * Wird verwendet, wenn die Wochenstunden direkt eingegeben oder über Presets gesetzt werden.
   */
  function synchronisiereProzent() {
    const gesamt = parseFloat(wochenstundenEingabe.value);
    const stunden = parseFloat(teilzeitStundenEingabe.value);
    if (!isNaN(gesamt) && !isNaN(stunden) && gesamt > 0) {
      teilzeitProzentEingabe.value = ((stunden / gesamt) * 100).toFixed(1);
    }
    loescheAktiveSchaltflaechen();
  }
  
  /**
   * Validiert den Teilzeit-Prozentwert und erzwingt die gesetzlichen Grenzen von 50-100%.
   * Rückmeldungen werden in der UI angezeigt.
   */
  function pruefeMindestUndMaximalProzent() {
    const teilzeitProzent = parseFloat(teilzeitProzentEingabe.value);
    
    // Überprüfung, ob die Eingabe eine gültige Zahl ist
    if (isNaN(teilzeitProzent)) {
      teilzeitProzentEingabe.value = teilzeitProzentMinimum;
      fehlerProzent.textContent = 'Bitte geben Sie eine gültige Zahl für den Teilzeit-Anteil ein';
    }

    // Check min value
    else if (teilzeitProzent < teilzeitProzentMinimum) {
      teilzeitProzentEingabe.value = teilzeitProzentMinimum;
      fehlerProzent.textContent = 'Der Teilzeit-Anteil muss mindestens 50% betragen';
    }

    // Check max value
    else if (teilzeitProzent > 100) {
      teilzeitProzentEingabe.value = 100;
      fehlerProzent.textContent = 'Der Teilzeit-Anteil darf 100% nicht überschreiten';
    }

    else {
      fehlerProzent.textContent = '';
    }
  }
  
  /**
   * Validiert die Teilzeit-Wochenstunden und hält sie im erlaubten Bereich
   * zwischen der Hälfte und der vollen Wochenarbeitszeit.
   */
  function pruefeMindestUndMaximalStunden() {
    const wochenstunden = parseFloat(wochenstundenEingabe.value);
    const teilzeitStunden = parseFloat(teilzeitStundenEingabe.value);

    // Überprüfung, ob die Eingabe eine gültige Zahl ist
    if (isNaN(teilzeitStunden)) {
      teilzeitStundenEingabe.value = wochenstundenEingabe.value / 2;
      fehlerStunden.textContent = 'Bitte geben Sie eine gültige Zahl für die Teilzeit-Wochenstunden ein';
    }

    // Check min value
    else if (teilzeitStunden < wochenstunden / 2) {
      teilzeitStundenEingabe.value = wochenstundenEingabe.value / 2;
      fehlerStunden.textContent = 'Die Wochenstunden müssen mindestens die Hälfte der regulären Wochenstunden entsprechen';
    }

    // Check max value
    else if (teilzeitStunden > wochenstunden) {
      teilzeitStundenEingabe.value = wochenstundenEingabe.value;
      fehlerStunden.textContent = 'Die Wochenstunden dürfen die regulären Wochenstunden nicht überschreiten';
    }

    else {
      fehlerStunden.textContent = '';
    }
  }
  
  /** Entfernt den aktiven Zustand aller Preset-Buttons. */
  function loescheAktiveSchaltflaechen() {
    buttons.forEach(btn => btn.classList.remove("active"));
  }
});

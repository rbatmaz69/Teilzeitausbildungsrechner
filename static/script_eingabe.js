/**
 * Initialisiert alle Formularelemente und synchronisiert Prozent- und Stunden-Eingaben.
 *
 * Alle Listener sorgen dafür, dass Eingaben valide bleiben und UI-Buttons korrekt
 * reagieren. Die Funktion wird automatisch nach dem Laden des DOMs ausgeführt.
 */

// i18n Helfer (nutzt die globale API aus script_Sprache_Auswaehlen.js)
function uebersetzung(schluessel, fallback) {
  if (window.I18N && typeof window.I18N.t === "function") {
    return window.I18N.t(schluessel, fallback);
  }
  return fallback ?? schluessel;
}

document.addEventListener("DOMContentLoaded", () => {

  const dauerEingabe = document.getElementById("dauer");
  const wochenstundenEingabe = document.getElementById("stunden");
  const teilzeitProzentEingabe = document.getElementById("teilzeitProzent");
  const teilzeitProzentMinimum = 50;
  const teilzeitStundenEingabe = document.getElementById("teilzeitStunden");
  const buttons = document.querySelectorAll(".preset");
  const fehlerProzent = document.getElementById('errorProzent');
  const fehlerStunden = document.getElementById('errorStunden');
  
  // Speichere den aktuellen Fehlerschlüssel für beide Felder
  let aktuellerFehlerProzent = null;
  let aktuellerFehlerStunden = null;

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
  
  // Wird ausgeführt, nachdem ein neuer Prozentwert eingegeben wurde (Echtzeit bei Pfeilen)
  teilzeitProzentEingabe.addEventListener("input", () => {
    synchronisiereStunden();
  })
  
  // Wird ausgeführt, nachdem ein neuer Prozentwert verlassen wurde (Validierung)
  teilzeitProzentEingabe.addEventListener("blur", () => {
    pruefeMindestUndMaximalProzent();
    synchronisiereStunden();
  })
  
  // Wird ausgeführt, nachdem ein neuer Teilzeit-wochenstundenwert eingegeben wurde (Echtzeit bei Pfeilen)
  teilzeitStundenEingabe.addEventListener("input", () => {
    synchronisiereProzent();
  })
  
  // Wird ausgeführt, nachdem ein neuer Teilzeit-wochenstundenwert verlassen wurde (Validierung)
  teilzeitStundenEingabe.addEventListener("blur", () => {
    pruefeMindestUndMaximalStunden();
    synchronisiereProzent();
  })

  // Button-Klicks für Prozent/Stunden
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const typ = btn.dataset.type;
      const wert = parseFloat(btn.dataset.value);
      const wochenStunden = parseFloat(wochenstundenEingabe.value);

      if (typ === "percent") {
        // Validierung: Prozent-Button nur setzen, wenn Wert ≤ 100%
        if (wert <= 100) {
          loescheAktiveSchaltflaechen();
          btn.classList.add("active");
          teilzeitProzentEingabe.value = wert;
          if (!isNaN(wochenStunden)) {
            teilzeitStundenEingabe.value = (wochenStunden * wert / 100).toFixed(1);
          }
          // Fehler zurücksetzen
          fehlerProzent.textContent = '';
          fehlerStunden.textContent = '';
          aktuellerFehlerProzent = null;
          aktuellerFehlerStunden = null;
        }
      } else if (typ === "hours") {
        // Validierung: Stunden-Button nur setzen, wenn Wert ≤ reguläre Wochenstunden
        if (!isNaN(wochenStunden) && wochenStunden > 0 && wert <= wochenStunden) {
          loescheAktiveSchaltflaechen();
          btn.classList.add("active");
          teilzeitStundenEingabe.value = wert;
          teilzeitProzentEingabe.value = ((wert / wochenStunden) * 100).toFixed(1);
          // Fehler zurücksetzen
          fehlerProzent.textContent = '';
          fehlerStunden.textContent = '';
          aktuellerFehlerProzent = null;
          aktuellerFehlerStunden = null;
        } else if (!isNaN(wochenStunden) && wert > wochenStunden) {
          // Wenn Wert über regulären Wochenstunden liegt, Fehler anzeigen und nicht setzen
          aktuellerFehlerStunden = "errors.hoursMax";
          fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, "Die Wochenstunden dürfen die regulären Wochenstunden nicht überschreiten");
        }
      }
    });
  });

  /**
   * Synchronisiert die Wochenstunden mit dem Teilzeit-Prozentwert.
   * Stellt sicher, dass bei geänderten Prozentwerten die abgeleiteten Stunden
   * automatisch aktualisiert werden.
   * Validierung: Stunden dürfen nicht über reguläre Wochenstunden liegen.
   */
  function synchronisiereStunden() {
    const gesamt = parseFloat(wochenstundenEingabe.value);
    const prozent = parseFloat(teilzeitProzentEingabe.value);
    if (!isNaN(gesamt) && !isNaN(prozent)) {
      let berechneteStunden = (gesamt * prozent / 100);
      
      // Validierung: Stunden dürfen nicht über reguläre Wochenstunden liegen
      if (berechneteStunden > gesamt) {
        berechneteStunden = gesamt;
        // Prozent entsprechend anpassen (auf 100%)
        teilzeitProzentEingabe.value = 100;
        aktuellerFehlerProzent = "errors.percentMax";
        aktuellerFehlerStunden = "errors.hoursMax";
        fehlerProzent.textContent = uebersetzung(aktuellerFehlerProzent, "Der Teilzeit-Anteil darf 100% nicht überschreiten");
        fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, "Die Wochenstunden dürfen die regulären Wochenstunden nicht überschreiten");
      } else {
        fehlerProzent.textContent = '';
        fehlerStunden.textContent = '';
        aktuellerFehlerProzent = null;
        aktuellerFehlerStunden = null;
      }
      
      teilzeitStundenEingabe.value = berechneteStunden.toFixed(1);
    }
    loescheAktiveSchaltflaechen();
  }
  
  /**
   * Synchronisiert den Prozentwert mit den Wochenstunden.
   * Wird verwendet, wenn die Wochenstunden direkt eingegeben oder über Presets gesetzt werden.
   * Validierung: Prozent darf nicht über 100% liegen.
   */
  function synchronisiereProzent() {
    const gesamt = parseFloat(wochenstundenEingabe.value);
    const stunden = parseFloat(teilzeitStundenEingabe.value);
    if (!isNaN(gesamt) && !isNaN(stunden) && gesamt > 0) {
      let berechneterProzent = (stunden / gesamt) * 100;
      
      // Validierung: Prozent darf nicht über 100% liegen
      if (berechneterProzent > 100) {
        berechneterProzent = 100;
        // Stunden entsprechend anpassen (auf maximale reguläre Wochenstunden)
        teilzeitStundenEingabe.value = gesamt.toFixed(1);
        aktuellerFehlerProzent = "errors.percentMax";
        aktuellerFehlerStunden = "errors.hoursMax";
        fehlerProzent.textContent = uebersetzung(aktuellerFehlerProzent, "Der Teilzeit-Anteil darf 100% nicht überschreiten");
        fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, "Die Wochenstunden dürfen die regulären Wochenstunden nicht überschreiten");
      } else {
        fehlerProzent.textContent = '';
        fehlerStunden.textContent = '';
        aktuellerFehlerProzent = null;
        aktuellerFehlerStunden = null;
      }
      
      teilzeitProzentEingabe.value = berechneterProzent.toFixed(1);
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
      aktuellerFehlerProzent = "errors.invalidPercent";
      fehlerProzent.textContent = uebersetzung(aktuellerFehlerProzent, "Bitte geben Sie eine gültige Zahl für den Teilzeit-Anteil ein");
    }

    // Prüfung des Mindestwerts
    else if (teilzeitProzent < teilzeitProzentMinimum) {
      teilzeitProzentEingabe.value = teilzeitProzentMinimum;
      aktuellerFehlerProzent = "errors.percentMin";
      fehlerProzent.textContent = uebersetzung(aktuellerFehlerProzent, "Der Teilzeit-Anteil muss mindestens 50% betragen");
    }

    // Prüfung des Maximalwerts
    else if (teilzeitProzent > 100) {
      teilzeitProzentEingabe.value = 100;
      aktuellerFehlerProzent = "errors.percentMax";
      fehlerProzent.textContent = uebersetzung(aktuellerFehlerProzent, "Der Teilzeit-Anteil darf 100% nicht überschreiten");
    }

    else {
      fehlerProzent.textContent = '';
      aktuellerFehlerProzent = null;
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
      aktuellerFehlerStunden = "errors.invalidHours";
      fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, "Bitte geben Sie eine gültige Zahl für die Teilzeit-Wochenstunden ein");
    }

    // Prüfung des Mindestwerts
    else if (teilzeitStunden < wochenstunden / 2) {
      teilzeitStundenEingabe.value = wochenstundenEingabe.value / 2;
      aktuellerFehlerStunden = "errors.hoursMin";
      fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, "Die Wochenstunden müssen mindestens die Hälfte der regulären Wochenstunden entsprechen");
    }

    // Prüfung des Maximalwerts
    else if (teilzeitStunden > wochenstunden) {
      teilzeitStundenEingabe.value = wochenstundenEingabe.value;
      aktuellerFehlerStunden = "errors.hoursMax";
      fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, "Die Wochenstunden dürfen die regulären Wochenstunden nicht überschreiten");
    }

    else {
      fehlerStunden.textContent = '';
      aktuellerFehlerStunden = null;
    }
  }
  
  /** Entfernt den aktiven Zustand aller Preset-Buttons. */
  function loescheAktiveSchaltflaechen() {
    buttons.forEach(btn => btn.classList.remove("active"));
  }

  /**
   * Aktualisiert Fehlermeldungen bei Sprachwechsel.
   * Prüft ob Fehlermeldungen aktuell angezeigt werden und aktualisiert sie mit Übersetzungen.
   */
  function aktualisiereFehlermeldungen() {
    // Aktualisiere Prozent-Fehlermeldungen
    if (aktuellerFehlerProzent) {
      const fallbackMap = {
        "errors.invalidPercent": "Bitte geben Sie eine gültige Zahl für den Teilzeit-Anteil ein",
        "errors.percentMin": "Der Teilzeit-Anteil muss mindestens 50% betragen",
        "errors.percentMax": "Der Teilzeit-Anteil darf 100% nicht überschreiten"
      };
      fehlerProzent.textContent = uebersetzung(aktuellerFehlerProzent, fallbackMap[aktuellerFehlerProzent] || "");
    }

    // Aktualisiere Stunden-Fehlermeldungen
    if (aktuellerFehlerStunden) {
      const fallbackMap = {
        "errors.invalidHours": "Bitte geben Sie eine gültige Zahl für die Teilzeit-Wochenstunden ein",
        "errors.hoursMin": "Die Wochenstunden müssen mindestens die Hälfte der regulären Wochenstunden entsprechen",
        "errors.hoursMax": "Die Wochenstunden dürfen die regulären Wochenstunden nicht überschreiten"
      };
      fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, fallbackMap[aktuellerFehlerStunden] || "");
    }
  }

  // Bei Sprachwechsel Fehlermeldungen aktualisieren
  window.addEventListener("i18n:changed", aktualisiereFehlermeldungen);
});

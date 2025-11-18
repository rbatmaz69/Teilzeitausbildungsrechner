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
  const fehlerDauer = document.getElementById('errorDauer');
  const fehlerRegularStunden = document.getElementById('errorRegularStunden');
  
  // Speichere den aktuellen Fehlerschlüssel für alle Felder
  let aktuellerFehlerProzent = null;
  let aktuellerFehlerStunden = null;
  let aktuellerFehlerDauer = null;
  let aktuellerFehlerRegularStunden = null;
  
  // Speichere die aktive Button-Referenz (welcher Wert ist fest)
  let aktiverButtonTyp = null; // "percent" oder "hours"
  let aktiverButtonWert = null; // Der feste Wert

  /**
   * Formatiert eine Zahl und entfernt .0 bei ganzen Zahlen
   * @param {number} zahl - Die zu formatierende Zahl
   * @param {number} dezimalstellen - Anzahl Dezimalstellen (Standard: 1)
   * @returns {string} Formatierte Zahl als String
   */
  function formatiereZahl(zahl, dezimalstellen = 1) {
    const gerundet = Number(zahl.toFixed(dezimalstellen));
    return gerundet % 1 === 0 ? gerundet.toFixed(0) : gerundet.toFixed(dezimalstellen);
  }

  // Sicherheitscheck
  if (!dauerEingabe || !wochenstundenEingabe || !teilzeitProzentEingabe || !teilzeitStundenEingabe) {
    console.error("Ein oder mehrere benötigte Elemente wurden nicht gefunden. Prüfe die IDs in HTML und JS.");
    return;
  }

  // ========== ZEICHEN-FILTERUNG FÜR ALLE NUMERISCHEN EINGABEN ==========
  const numericInputs = [dauerEingabe, wochenstundenEingabe, teilzeitProzentEingabe, teilzeitStundenEingabe];
  
  numericInputs.forEach(inp => {
    // Blockiere unerwünschte Zeichen bei Tastatur-Eingabe
    inp.addEventListener('keydown', (ev) => {
      const verboteneZeichen = ['e', 'E', '+', '-'];
      if (verboteneZeichen.includes(ev.key)) {
        ev.preventDefault();
      }
    });
    
    // Bereinige Copy-Paste und andere Eingaben
    inp.addEventListener('input', (ev) => {
      let wert = inp.value.replace(',', '.'); // Komma zu Punkt konvertieren
      wert = wert.replace(/[^0-9.]/g, ''); // Nur Ziffern und Punkt erlauben
      
      // Nur ein Dezimalpunkt erlauben
      const teile = wert.split('.');
      if (teile.length > 2) {
        wert = teile[0] + '.' + teile.slice(1).join('');
      }
      
      inp.value = wert;
    });
  });

  // Wird ausgeführt, nachdem eine neue Ausbildungsdauer eingegeben wurde
  dauerEingabe.addEventListener("blur", () => {
    const ausbildungsdauer = parseInt(dauerEingabe.value);

    // Mindest- und Maximalwerte für die reguläre Ausbildungsdauer
    if (isNaN(ausbildungsdauer) || ausbildungsdauer < 12) {
      dauerEingabe.value = 12;
      dauerEingabe.classList.add('error');
      aktuellerFehlerDauer = "errors.durationMin";
      if (fehlerDauer) fehlerDauer.textContent = uebersetzung(aktuellerFehlerDauer, "Mindestens 12 Monate erforderlich");
    } else if (ausbildungsdauer > 60) {
      dauerEingabe.value = 60;
      dauerEingabe.classList.add('error');
      aktuellerFehlerDauer = "errors.durationMax";
      if (fehlerDauer) fehlerDauer.textContent = uebersetzung(aktuellerFehlerDauer, "Maximal 60 Monate erlaubt");
    } else {
      dauerEingabe.classList.remove('error');
      aktuellerFehlerDauer = null;
      if (fehlerDauer) fehlerDauer.textContent = '';
    }
  })
  
  // Entferne Fehler bei erneutem Tippen und prüfe Max sofort
  dauerEingabe.addEventListener("input", () => {
    // Fehler entfernen wenn User wieder tippt
    if (aktuellerFehlerDauer) {
      dauerEingabe.classList.remove('error');
      aktuellerFehlerDauer = null;
      if (fehlerDauer) fehlerDauer.textContent = '';
    }
    
    // Max-Validierung sofort beim Tippen
    const ausbildungsdauer = parseFloat(dauerEingabe.value);
    if (!isNaN(ausbildungsdauer) && ausbildungsdauer > 60) {
      dauerEingabe.value = 60;
      dauerEingabe.classList.add('error');
      aktuellerFehlerDauer = "errors.durationMax";
      if (fehlerDauer) fehlerDauer.textContent = uebersetzung(aktuellerFehlerDauer, "Maximal 60 Monate erlaubt");
    }
  })
  
  // Wird ausgeführt, nachdem neue reguläre Wochenstunden eingegeben wurden
  wochenstundenEingabe.addEventListener("blur", () => {
    const wochenstunden = parseInt(wochenstundenEingabe.value);

    // Mindest- und Maximalwerte für die regulären Wochenstunden
    if (isNaN(wochenstunden) || wochenstunden < 10) {
      wochenstundenEingabe.value = 10;
      wochenstundenEingabe.classList.add('error');
      aktuellerFehlerRegularStunden = "errors.regularHoursMin";
      if (fehlerRegularStunden) fehlerRegularStunden.textContent = uebersetzung(aktuellerFehlerRegularStunden, "Mindestens 10 Wochenstunden erforderlich");
    } else if (wochenstunden > 48) {
      wochenstundenEingabe.value = 48;
      wochenstundenEingabe.classList.add('error');
      aktuellerFehlerRegularStunden = "errors.regularHoursMax";
      if (fehlerRegularStunden) fehlerRegularStunden.textContent = uebersetzung(aktuellerFehlerRegularStunden, "Maximal 48 Wochenstunden erlaubt");
    } else {
      wochenstundenEingabe.classList.remove('error');
      aktuellerFehlerRegularStunden = null;
      if (fehlerRegularStunden) fehlerRegularStunden.textContent = '';
    }

    // Synchronisiere basierend auf aktivem Button
    const wochenStunden = parseFloat(wochenstundenEingabe.value);
    if (!isNaN(wochenStunden) && wochenStunden > 0) {
      if (aktiverButtonTyp === "hours" && aktiverButtonWert !== null) {
        // Stunden-Button ist aktiv → Stunden bleiben fest, Prozent passt sich an
        let neueStunden = aktiverButtonWert;
        if (neueStunden > wochenStunden) {
          // Ungültig → Clamp auf Maximum
          neueStunden = wochenStunden;
          aktiverButtonWert = neueStunden; // Neue Referenz
        }
        teilzeitStundenEingabe.value = formatiereZahl(neueStunden);
        teilzeitProzentEingabe.value = formatiereZahl((neueStunden / wochenStunden) * 100);
      } else if (aktiverButtonTyp === "percent" && aktiverButtonWert !== null) {
        // Prozent-Button ist aktiv → Prozent bleibt fest, Stunden passen sich an
        teilzeitProzentEingabe.value = formatiereZahl(aktiverButtonWert);
        teilzeitStundenEingabe.value = formatiereZahl(wochenStunden * aktiverButtonWert / 100);
      } else {
        // Kein Button aktiv → Prozent bleibt, Stunden passen sich an (altes Verhalten)
        const prozent = parseFloat(teilzeitProzentEingabe.value);
        if (!isNaN(prozent)) {
          teilzeitStundenEingabe.value = formatiereZahl(wochenStunden * prozent / 100);
        }
      }
    }

    // Deaktiviere Stunden-Buttons, die über den regulären Wochenstunden liegen
    buttons.forEach(btn => {
      if (btn.dataset.type === "hours") {
        const schaltflaecheWert = parseFloat(btn.dataset.value);
        if (schaltflaecheWert > wochenstundenEingabe.value) {
          btn.disabled = true;
          btn.style.visibility = "hidden";
          // Wenn dieser Button aktiv war, deaktiviere ihn
          if (btn.classList.contains("active")) {
            btn.classList.remove("active");
            // Button-Wert wurde geclampt, neue Referenz ist der geclampte Wert
            if (aktiverButtonTyp === "hours") {
              aktiverButtonWert = parseFloat(teilzeitStundenEingabe.value);
            }
          }
        } else {
          btn.disabled = false;
          btn.style.visibility = "visible";
        }
      }
    });
  })
  
  // Bei manueller Eingabe der Wochenstunden: Fehler löschen und Max sofort prüfen
  wochenstundenEingabe.addEventListener("input", () => {
    // Fehler entfernen wenn User wieder tippt
    if (aktuellerFehlerRegularStunden) {
      wochenstundenEingabe.classList.remove('error');
      aktuellerFehlerRegularStunden = null;
      if (fehlerRegularStunden) fehlerRegularStunden.textContent = '';
    }
    
    // Max-Validierung sofort beim Tippen
    const wochenstunden = parseFloat(wochenstundenEingabe.value);
    if (!isNaN(wochenstunden) && wochenstunden > 48) {
      wochenstundenEingabe.value = 48;
      wochenstundenEingabe.classList.add('error');
      aktuellerFehlerRegularStunden = "errors.regularHoursMax";
      if (fehlerRegularStunden) fehlerRegularStunden.textContent = uebersetzung(aktuellerFehlerRegularStunden, "Maximal 48 Wochenstunden erlaubt");
    }
  })
  
  // Wird ausgeführt, nachdem ein neuer Prozentwert eingegeben wurde (Echtzeit bei Pfeilen)
  teilzeitProzentEingabe.addEventListener("input", () => {
    // Manuelle Eingabe → Referenz löschen
    aktiverButtonTyp = null;
    aktiverButtonWert = null;
    loescheAktiveSchaltflaechen();
    // Entferne Min-Fehler beim erneuten Tippen (User könnte gerade mehr eingeben)
    if (aktuellerFehlerProzent === "errors.percentMin" || aktuellerFehlerProzent === "errors.invalidPercent") {
      teilzeitProzentEingabe.classList.remove('error');
      aktuellerFehlerProzent = null;
      fehlerProzent.textContent = '';
    }
    synchronisiereStunden();
  })
  
  // Wird ausgeführt, nachdem ein neuer Prozentwert verlassen wurde (Validierung)
  teilzeitProzentEingabe.addEventListener("blur", () => {
    pruefeMindestUndMaximalProzent();
    synchronisiereStunden();
  })
  
  // Wird ausgeführt, nachdem ein neuer Teilzeit-wochenstundenwert eingegeben wurde (Echtzeit bei Pfeilen)
  teilzeitStundenEingabe.addEventListener("input", () => {
    // Manuelle Eingabe → Referenz löschen
    aktiverButtonTyp = null;
    aktiverButtonWert = null;
    loescheAktiveSchaltflaechen();
    // Entferne Min-Fehler beim erneuten Tippen (User könnte gerade mehr eingeben)
    if (aktuellerFehlerStunden === "errors.hoursMin" || aktuellerFehlerStunden === "errors.invalidHours") {
      teilzeitStundenEingabe.classList.remove('error');
      aktuellerFehlerStunden = null;
      fehlerStunden.textContent = '';
    }
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
          // Speichere Button-Referenz
          aktiverButtonTyp = "percent";
          aktiverButtonWert = wert;
          teilzeitProzentEingabe.value = formatiereZahl(wert);
          if (!isNaN(wochenStunden)) {
            teilzeitStundenEingabe.value = formatiereZahl(wochenStunden * wert / 100);
          }
          // Fehler zurücksetzen
          fehlerProzent.textContent = '';
          fehlerStunden.textContent = '';
          aktuellerFehlerProzent = null;
          aktuellerFehlerStunden = null;
          // Visuelle Fehlerindikation entfernen
          teilzeitProzentEingabe.classList.remove('error');
          teilzeitStundenEingabe.classList.remove('error');
        }
      } else if (typ === "hours") {
        // Validierung: Stunden-Button nur setzen, wenn Wert ≤ reguläre Wochenstunden
        if (!isNaN(wochenStunden) && wochenStunden > 0 && wert <= wochenStunden) {
          loescheAktiveSchaltflaechen();
          btn.classList.add("active");
          // Speichere Button-Referenz
          aktiverButtonTyp = "hours";
          aktiverButtonWert = wert;
          teilzeitStundenEingabe.value = formatiereZahl(wert);
          teilzeitProzentEingabe.value = formatiereZahl((wert / wochenStunden) * 100);
          // Fehler zurücksetzen
          fehlerProzent.textContent = '';
          fehlerStunden.textContent = '';
          aktuellerFehlerProzent = null;
          aktuellerFehlerStunden = null;
          // Visuelle Fehlerindikation entfernen
          teilzeitProzentEingabe.classList.remove('error');
          teilzeitStundenEingabe.classList.remove('error');
        } else if (!isNaN(wochenStunden) && wert > wochenStunden) {
          // Wenn Wert über regulären Wochenstunden liegt, Fehler anzeigen und nicht setzen
          aktuellerFehlerStunden = "errors.hoursMax";
          fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, "Die Wochenstunden dürfen die regulären Wochenstunden nicht überschreiten");
          teilzeitStundenEingabe.classList.add('error');
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
        // Nur Prozent-Fehler anzeigen (User hat in Prozent-Feld getippt)
        aktuellerFehlerProzent = "errors.percentMax";
        fehlerProzent.textContent = uebersetzung(aktuellerFehlerProzent, "Der Teilzeit-Anteil darf 100% nicht überschreiten");
        teilzeitProzentEingabe.classList.add('error');
        // Stunden-Fehler löschen falls vorhanden
        aktuellerFehlerStunden = null;
        fehlerStunden.textContent = '';
        teilzeitStundenEingabe.classList.remove('error');
      } else {
        // Nur Max-Fehler löschen, nicht Min-Fehler (die von pruefeMindestUndMaximal kommen)
        if (aktuellerFehlerProzent === "errors.percentMax") {
          fehlerProzent.textContent = '';
          aktuellerFehlerProzent = null;
          teilzeitProzentEingabe.classList.remove('error');
        }
        if (aktuellerFehlerStunden === "errors.hoursMax") {
          fehlerStunden.textContent = '';
          aktuellerFehlerStunden = null;
          teilzeitStundenEingabe.classList.remove('error');
        }
      }
      
      teilzeitStundenEingabe.value = formatiereZahl(berechneteStunden);
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
        teilzeitStundenEingabe.value = formatiereZahl(gesamt);
        // Nur Stunden-Fehler anzeigen (User hat in Stunden-Feld getippt)
        aktuellerFehlerStunden = "errors.hoursMax";
        fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, "Die Wochenstunden dürfen die regulären Wochenstunden nicht überschreiten");
        teilzeitStundenEingabe.classList.add('error');
        // Prozent-Fehler löschen falls vorhanden
        aktuellerFehlerProzent = null;
        fehlerProzent.textContent = '';
        teilzeitProzentEingabe.classList.remove('error');
      } else {
        // Nur Max-Fehler löschen, nicht Min-Fehler (die von pruefeMindestUndMaximal kommen)
        if (aktuellerFehlerProzent === "errors.percentMax") {
          fehlerProzent.textContent = '';
          aktuellerFehlerProzent = null;
          teilzeitProzentEingabe.classList.remove('error');
        }
        if (aktuellerFehlerStunden === "errors.hoursMax") {
          fehlerStunden.textContent = '';
          aktuellerFehlerStunden = null;
          teilzeitStundenEingabe.classList.remove('error');
        }
      }
      
      teilzeitProzentEingabe.value = formatiereZahl(berechneterProzent);
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
      teilzeitProzentEingabe.classList.add('error');
    }

    // Prüfung des Mindestwerts
    else if (teilzeitProzent < teilzeitProzentMinimum) {
      teilzeitProzentEingabe.value = teilzeitProzentMinimum;
      aktuellerFehlerProzent = "errors.percentMin";
      fehlerProzent.textContent = uebersetzung(aktuellerFehlerProzent, "Der Teilzeit-Anteil muss mindestens 50% betragen");
      teilzeitProzentEingabe.classList.add('error');
    }

    // Prüfung des Maximalwerts
    else if (teilzeitProzent > 100) {
      teilzeitProzentEingabe.value = 100;
      aktuellerFehlerProzent = "errors.percentMax";
      fehlerProzent.textContent = uebersetzung(aktuellerFehlerProzent, "Der Teilzeit-Anteil darf 100% nicht überschreiten");
      teilzeitProzentEingabe.classList.add('error');
    }

    else {
      fehlerProzent.textContent = '';
      aktuellerFehlerProzent = null;
      teilzeitProzentEingabe.classList.remove('error');
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
      teilzeitStundenEingabe.classList.add('error');
    }

    // Prüfung des Mindestwerts
    else if (teilzeitStunden < wochenstunden / 2) {
      teilzeitStundenEingabe.value = wochenstundenEingabe.value / 2;
      aktuellerFehlerStunden = "errors.hoursMin";
      fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, "Die Wochenstunden müssen mindestens die Hälfte der regulären Wochenstunden entsprechen");
      teilzeitStundenEingabe.classList.add('error');
    }

    // Prüfung des Maximalwerts
    else if (teilzeitStunden > wochenstunden) {
      teilzeitStundenEingabe.value = wochenstundenEingabe.value;
      aktuellerFehlerStunden = "errors.hoursMax";
      fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, "Die Wochenstunden dürfen die regulären Wochenstunden nicht überschreiten");
      teilzeitStundenEingabe.classList.add('error');
    }

    else {
      fehlerStunden.textContent = '';
      aktuellerFehlerStunden = null;
      teilzeitStundenEingabe.classList.remove('error');
    }
  }
  
  /** Entfernt den aktiven Zustand aller Preset-Buttons. */
  function loescheAktiveSchaltflaechen() {
    buttons.forEach(btn => btn.classList.remove("active"));
    // Referenz löschen
    aktiverButtonTyp = null;
    aktiverButtonWert = null;
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

    // Aktualisiere Dauer-Fehlermeldungen
    if (aktuellerFehlerDauer && fehlerDauer) {
      const fallbackMap = {
        "errors.durationMin": "Mindestens 12 Monate erforderlich",
        "errors.durationMax": "Maximal 60 Monate erlaubt"
      };
      fehlerDauer.textContent = uebersetzung(aktuellerFehlerDauer, fallbackMap[aktuellerFehlerDauer] || "");
    }

    // Aktualisiere reguläre Wochenstunden-Fehlermeldungen
    if (aktuellerFehlerRegularStunden && fehlerRegularStunden) {
      const fallbackMap = {
        "errors.regularHoursMin": "Mindestens 10 Wochenstunden erforderlich",
        "errors.regularHoursMax": "Maximal 48 Wochenstunden erlaubt"
      };
      fehlerRegularStunden.textContent = uebersetzung(aktuellerFehlerRegularStunden, fallbackMap[aktuellerFehlerRegularStunden] || "");
    }
  }

  // Bei Sprachwechsel Fehlermeldungen aktualisieren
  window.addEventListener("i18n:changed", aktualisiereFehlermeldungen);
});

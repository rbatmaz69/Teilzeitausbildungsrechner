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
  
  // Timer-IDs für Fade-out (um alte Timer abzubrechen)
  const timerIdProzent = { hauptTimer: null, fadeTimer: null };
  const timerIdStunden = { hauptTimer: null, fadeTimer: null };
  const timerIdDauer = { hauptTimer: null, fadeTimer: null };
  const timerIdRegularStunden = { hauptTimer: null, fadeTimer: null };
  
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

  /**
   * Entfernt Fehler-Styling und Nachricht mit sanftem Fade-out nach 4 Sekunden
   * @param {HTMLElement} inputElement - Das Input-Feld mit .error Klasse
   * @param {HTMLElement} errorElement - Das Fehlertext-Element
   * @param {Function} resetCallback - Callback zum Zurücksetzen der Fehlervariable
   */
  function entferneFehlerMitFadeout(inputElement, errorElement, resetCallback, timerIdRef) {
    // Breche alten Timer ab, falls vorhanden
    if (timerIdRef && timerIdRef.hauptTimer) {
      clearTimeout(timerIdRef.hauptTimer);
    }
    if (timerIdRef && timerIdRef.fadeTimer) {
      clearTimeout(timerIdRef.fadeTimer);
    }
    
    // Starte neuen Timer
    const hauptTimer = setTimeout(() => {
      inputElement.style.transition = 'border-color 0.5s ease, box-shadow 0.5s ease';
      if (errorElement) errorElement.style.transition = 'opacity 0.5s ease';
      if (errorElement) errorElement.style.opacity = '0';
      const fadeTimer = setTimeout(() => {
        inputElement.classList.remove('error');
        inputElement.style.transition = '';
        if (resetCallback) resetCallback();
        if (errorElement) {
          errorElement.textContent = '';
          errorElement.style.opacity = '';
          errorElement.style.transition = '';
        }
        // Timer-IDs zurücksetzen
        if (timerIdRef) {
          timerIdRef.hauptTimer = null;
          timerIdRef.fadeTimer = null;
        }
      }, 500);
      if (timerIdRef) timerIdRef.fadeTimer = fadeTimer;
    }, 4000);
    if (timerIdRef) timerIdRef.hauptTimer = hauptTimer;
  }

  /**
   * Entfernt Min-Fehler sofort beim erneuten Tippen (User könnte gerade mehr eingeben)
   * @param {string} aktuellerFehler - Der aktuelle Fehlercode (z.B. "errors.percentMin")
   * @param {HTMLElement} inputElement - Das Input-Feld
   * @param {HTMLElement} errorElement - Das Fehlertext-Element
   * @param {Function} resetCallback - Callback zum Zurücksetzen der Fehlervariable
   * @returns {boolean} True wenn Fehler entfernt wurde
   */
  function entferneMinFehlerBeimTippen(aktuellerFehler, inputElement, errorElement, resetCallback) {
    const minFehlerTypen = ["errors.percentMin", "errors.invalidPercent", "errors.hoursMin", "errors.invalidHours"];
    if (minFehlerTypen.includes(aktuellerFehler)) {
      inputElement.classList.remove('error');
      if (resetCallback) resetCallback();
      if (errorElement) errorElement.textContent = '';
      return true;
    }
    return false;
  }

  /**
   * Validiert Stunden-Buttons basierend auf regulären Wochenstunden.
   * Buttons werden ausgegraut (disabled) wenn sie über Maximum oder unter 50% liegen.
   */
  function validiereSichtbareButtons() {
    const wochenstunden = parseFloat(wochenstundenEingabe.value);
    if (isNaN(wochenstunden) || wochenstunden <= 0) return;
    
    buttons.forEach(btn => {
      if (btn.dataset.type === "hours") {
        const schaltflaecheWert = parseFloat(btn.dataset.value);
        const minStunden = wochenstunden / 2; // 50% Minimum
        // Ungültig wenn über Maximum ODER unter 50%
        if (schaltflaecheWert > wochenstunden || schaltflaecheWert < minStunden) {
          btn.disabled = true;
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
        }
      }
    });
  }

  /**
   * Synchronisiert Button-Markierung mit aktuellen Feld-Werten.
   * Aktiviert Button wenn manueller Wert einem Button-Wert entspricht.
   */
  function synchronisiereButtonMarkierung() {
    const wochenStunden = parseFloat(wochenstundenEingabe.value);
    const teilzeitProzent = parseFloat(teilzeitProzentEingabe.value);
    const teilzeitStunden = parseFloat(teilzeitStundenEingabe.value);
    
    if (isNaN(wochenStunden) || isNaN(teilzeitProzent) || isNaN(teilzeitStunden)) return;
    
    let buttonGefunden = false;
    
    buttons.forEach(btn => {
      const typ = btn.dataset.type;
      const wert = parseFloat(btn.dataset.value);
      
      if (typ === "percent" && Math.abs(teilzeitProzent - wert) < 0.01) {
        // Prozent-Wert stimmt mit Button überein
        btn.classList.add("active");
        aktiverButtonTyp = "percent";
        aktiverButtonWert = wert;
        buttonGefunden = true;
      } else if (typ === "hours" && Math.abs(teilzeitStunden - wert) < 0.01) {
        // Stunden-Wert stimmt mit Button überein
        btn.classList.add("active");
        aktiverButtonTyp = "hours";
        aktiverButtonWert = wert;
        buttonGefunden = true;
      } else {
        btn.classList.remove("active");
      }
    });
    
    // Wenn kein Button passt, Referenz löschen
    if (!buttonGefunden) {
      aktiverButtonTyp = null;
      aktiverButtonWert = null;
    }
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
    inp.addEventListener('input', () => {
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

  // Wird ausgeführt, nachdem eine neue Ausbildungsdauer eingegeben wurde (blur für manuelle Eingabe)
  dauerEingabe.addEventListener("blur", () => {
    const ausbildungsdauer = parseInt(dauerEingabe.value);

    // Mindest- und Maximalwerte für die reguläre Ausbildungsdauer
    if (isNaN(ausbildungsdauer) || ausbildungsdauer < 12) {
      dauerEingabe.value = 12;
      dauerEingabe.classList.add('error');
      aktuellerFehlerDauer = "errors.durationMin";
      if (fehlerDauer) fehlerDauer.textContent = uebersetzung(aktuellerFehlerDauer, "Der Wert muss mindestens 12 Monate betragen");
      entferneFehlerMitFadeout(dauerEingabe, fehlerDauer, () => aktuellerFehlerDauer = null, timerIdDauer);
    } else if (ausbildungsdauer > 60) {
      dauerEingabe.value = 60;
      dauerEingabe.classList.add('error');
      aktuellerFehlerDauer = "errors.durationMax";
      if (fehlerDauer) fehlerDauer.textContent = uebersetzung(aktuellerFehlerDauer, "Der Wert darf maximal 60 Monate betragen");
      entferneFehlerMitFadeout(dauerEingabe, fehlerDauer, () => aktuellerFehlerDauer = null, timerIdDauer);
    } else {
      dauerEingabe.classList.remove('error');
      aktuellerFehlerDauer = null;
      if (fehlerDauer) fehlerDauer.textContent = '';
    }
  })
  
  // Validiere Max-Limit sofort (für alle Eingaben), Min-Limit nur bei Spinner
  dauerEingabe.addEventListener("input", (event) => {
    const ausbildungsdauer = parseFloat(dauerEingabe.value);
    const istSpinner = event.inputType === '' || event.inputType === undefined;
    
    // Max-Validierung: IMMER sofort korrigieren (auch bei manueller Eingabe)
    if (!isNaN(ausbildungsdauer) && ausbildungsdauer > 60) {
      dauerEingabe.value = 60;
      dauerEingabe.classList.add('error');
      aktuellerFehlerDauer = "errors.durationMax";
      if (fehlerDauer) fehlerDauer.textContent = uebersetzung(aktuellerFehlerDauer, "Der Wert darf maximal 60 Monate betragen");
      entferneFehlerMitFadeout(dauerEingabe, fehlerDauer, () => aktuellerFehlerDauer = null, timerIdDauer);
    }
    // Min-Validierung: NUR bei Spinner sofort korrigieren
    else if (istSpinner && !isNaN(ausbildungsdauer) && ausbildungsdauer < 12 && ausbildungsdauer > 0) {
      dauerEingabe.value = 12;
      dauerEingabe.classList.add('error');
      aktuellerFehlerDauer = "errors.durationMin";
      if (fehlerDauer) fehlerDauer.textContent = uebersetzung(aktuellerFehlerDauer, "Der Wert muss mindestens 12 Monate betragen");
      entferneFehlerMitFadeout(dauerEingabe, fehlerDauer, () => aktuellerFehlerDauer = null, timerIdDauer);
    }
  })
  
  // Wird ausgeführt, nachdem neue reguläre Wochenstunden eingegeben wurden (blur für manuelle Eingabe)
  wochenstundenEingabe.addEventListener("blur", () => {
    const wochenstunden = parseInt(wochenstundenEingabe.value);

    // Mindest- und Maximalwerte für die regulären Wochenstunden
    if (isNaN(wochenstunden) || wochenstunden < 10) {
      wochenstundenEingabe.value = 10;
      wochenstundenEingabe.classList.add('error');
      aktuellerFehlerRegularStunden = "errors.regularHoursMin";
      if (fehlerRegularStunden) fehlerRegularStunden.textContent = uebersetzung(aktuellerFehlerRegularStunden, "Der Wert muss mindestens 10 Stunden betragen");
      entferneFehlerMitFadeout(wochenstundenEingabe, fehlerRegularStunden, () => aktuellerFehlerRegularStunden = null, timerIdRegularStunden);
    } else if (wochenstunden > 48) {
      wochenstundenEingabe.value = 48;
      wochenstundenEingabe.classList.add('error');
      aktuellerFehlerRegularStunden = "errors.regularHoursMax";
      if (fehlerRegularStunden) fehlerRegularStunden.textContent = uebersetzung(aktuellerFehlerRegularStunden, "Der Wert darf maximal 48 Stunden betragen");
      entferneFehlerMitFadeout(wochenstundenEingabe, fehlerRegularStunden, () => aktuellerFehlerRegularStunden = null, timerIdRegularStunden);
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
        const minStunden = wochenStunden / 2; // 50% Minimum
        if (neueStunden > wochenStunden) {
          // Ungültig → Clamp auf Maximum
          neueStunden = wochenStunden;
          aktiverButtonWert = neueStunden; // Neue Referenz
        } else if (neueStunden < minStunden) {
          // Ungültig → Clamp auf Minimum (50%)
          neueStunden = minStunden;
          aktiverButtonWert = neueStunden; // Neue Referenz
          // Button-Referenz löschen, da korrigiert wurde
          aktiverButtonTyp = null;
          aktiverButtonWert = null;
          loescheAktiveSchaltflaechen();
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
          let neueStunden = wochenStunden * prozent / 100;
          // Prüfe ob durch Erhöhung der Wochenstunden Teilzeit-Stunden unter 50% fallen
          if (prozent < teilzeitProzentMinimum) {
            // Korrigiere auf 50%
            neueStunden = wochenStunden * teilzeitProzentMinimum / 100;
            teilzeitProzentEingabe.value = formatiereZahl(teilzeitProzentMinimum);
            aktuellerFehlerStunden = "errors.hoursMin";
            fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, "Wert wurde auf Minimum korrigiert (mindestens 50% erforderlich)");
            teilzeitStundenEingabe.classList.add('error');
            entferneFehlerMitFadeout(teilzeitStundenEingabe, fehlerStunden, () => aktuellerFehlerStunden = null, timerIdStunden);
          }
          teilzeitStundenEingabe.value = formatiereZahl(neueStunden);
        }
      }
    }

    // Validiere sichtbare Buttons basierend auf regulären Wochenstunden
    validiereSichtbareButtons();
  })
  
  // Validiere Min+Max sofort bei Tippen/Spinner
  wochenstundenEingabe.addEventListener("input", (event) => {
    const wochenstunden = parseFloat(wochenstundenEingabe.value);
    const istSpinner = event.inputType === '' || event.inputType === undefined;
    
    // Max-Validierung: IMMER sofort korrigieren (auch bei manueller Eingabe)
    if (!isNaN(wochenstunden) && wochenstunden > 48) {
      wochenstundenEingabe.value = 48;
      wochenstundenEingabe.classList.add('error');
      aktuellerFehlerRegularStunden = "errors.regularHoursMax";
      if (fehlerRegularStunden) fehlerRegularStunden.textContent = uebersetzung(aktuellerFehlerRegularStunden, "Der Wert darf maximal 48 Stunden betragen");
      entferneFehlerMitFadeout(wochenstundenEingabe, fehlerRegularStunden, () => aktuellerFehlerRegularStunden = null, timerIdRegularStunden);
    }
    // Min-Validierung: NUR bei Spinner sofort korrigieren
    else if (istSpinner && !isNaN(wochenstunden) && wochenstunden < 10 && wochenstunden > 0) {
      wochenstundenEingabe.value = 10;
      wochenstundenEingabe.classList.add('error');
      aktuellerFehlerRegularStunden = "errors.regularHoursMin";
      if (fehlerRegularStunden) fehlerRegularStunden.textContent = uebersetzung(aktuellerFehlerRegularStunden, "Der Wert muss mindestens 10 Stunden betragen");
      entferneFehlerMitFadeout(wochenstundenEingabe, fehlerRegularStunden, () => aktuellerFehlerRegularStunden = null, timerIdRegularStunden);
    }
  })
  
  // Wird ausgeführt, nachdem ein neuer Prozentwert eingegeben wurde (Echtzeit bei Pfeilen)
  teilzeitProzentEingabe.addEventListener("input", (event) => {
    const istSpinner = event.inputType === '' || event.inputType === undefined;
    const prozent = parseFloat(teilzeitProzentEingabe.value);
    
    // Manuelle Eingabe → Referenz löschen
    aktiverButtonTyp = null;
    aktiverButtonWert = null;
    
    // Min-Validierung bei Spinner
    if (istSpinner && !isNaN(prozent) && prozent < teilzeitProzentMinimum && prozent > 0) {
      teilzeitProzentEingabe.value = teilzeitProzentMinimum;
      teilzeitProzentEingabe.classList.add('error');
      aktuellerFehlerProzent = "errors.percentMin";
      fehlerProzent.textContent = uebersetzung(aktuellerFehlerProzent, "Der Wert muss mindestens 50% betragen");
      entferneFehlerMitFadeout(teilzeitProzentEingabe, fehlerProzent, () => aktuellerFehlerProzent = null, timerIdProzent);
    }
    // Bei manueller Eingabe: Entferne Min-Fehler beim Tippen (User könnte gerade mehr eingeben)
    else if (!istSpinner) {
      entferneMinFehlerBeimTippen(aktuellerFehlerProzent, teilzeitProzentEingabe, fehlerProzent, () => aktuellerFehlerProzent = null);
    }
    
    synchronisiereStunden();
    synchronisiereButtonMarkierung(); // Buttons auch bei Spinner-Nutzung markieren
  })
  
  // Wird ausgeführt, nachdem ein neuer Prozentwert verlassen wurde (Validierung)
  teilzeitProzentEingabe.addEventListener("blur", () => {
    pruefeMindestUndMaximalProzent();
    synchronisiereStunden();
    synchronisiereButtonMarkierung();
  })
  
  // Wird ausgeführt, nachdem ein neuer Teilzeit-wochenstundenwert eingegeben wurde (Echtzeit bei Pfeilen)
  teilzeitStundenEingabe.addEventListener("input", (event) => {
    const istSpinner = event.inputType === '' || event.inputType === undefined;
    const stunden = parseFloat(teilzeitStundenEingabe.value);
    const gesamt = parseFloat(wochenstundenEingabe.value);
    
    // Manuelle Eingabe → Referenz löschen
    aktiverButtonTyp = null;
    aktiverButtonWert = null;
    
    // Min-Validierung NUR bei Spinner
    if (istSpinner && !isNaN(stunden) && !isNaN(gesamt) && gesamt > 0) {
      const berechneterProzent = (stunden / gesamt) * 100;
      if (berechneterProzent < teilzeitProzentMinimum && stunden > 0) {
        const minStunden = (gesamt * teilzeitProzentMinimum / 100);
        teilzeitStundenEingabe.value = formatiereZahl(minStunden);
        aktuellerFehlerStunden = "errors.hoursMin";
        fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, "Der Wert muss mindestens 50% der regulären Wochenstunden betragen");
        teilzeitStundenEingabe.classList.add('error');
        entferneFehlerMitFadeout(teilzeitStundenEingabe, fehlerStunden, () => aktuellerFehlerStunden = null, timerIdStunden);
      }
    }
    // Bei manueller Eingabe: Entferne Min-Fehler beim Tippen (User könnte gerade mehr eingeben)
    else if (!istSpinner) {
      entferneMinFehlerBeimTippen(aktuellerFehlerStunden, teilzeitStundenEingabe, fehlerStunden, () => aktuellerFehlerStunden = null);
    }
    
    synchronisiereProzent();
    synchronisiereButtonMarkierung(); // Buttons auch bei Spinner-Nutzung markieren
  })
  
  // Wird ausgeführt, nachdem ein neuer Teilzeit-wochenstundenwert verlassen wurde (Validierung)
  teilzeitStundenEingabe.addEventListener("blur", () => {
    pruefeMindestUndMaximalStunden();
    synchronisiereProzent();
    synchronisiereButtonMarkierung();
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
          // Markiere auch den entsprechenden anderen Button (Stunden/Prozent)
          synchronisiereButtonMarkierung();
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
          // Markiere auch den entsprechenden anderen Button (Stunden/Prozent)
          synchronisiereButtonMarkierung();
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
      
      // Max-Validierung: Stunden dürfen nicht über reguläre Wochenstunden liegen
      if (berechneteStunden > gesamt) {
        berechneteStunden = gesamt;
        // Prozent entsprechend anpassen (auf 100%)
        teilzeitProzentEingabe.value = 100;
        // Nur Prozent-Fehler anzeigen (User hat in Prozent-Feld getippt)
        aktuellerFehlerProzent = "errors.percentMax";
        fehlerProzent.textContent = uebersetzung(aktuellerFehlerProzent, "Der Teilzeit-Anteil darf 100% nicht überschreiten");
        teilzeitProzentEingabe.classList.add('error');
        entferneFehlerMitFadeout(teilzeitProzentEingabe, fehlerProzent, () => aktuellerFehlerProzent = null, timerIdProzent);
        // Stunden-Fehler löschen falls vorhanden
        aktuellerFehlerStunden = null;
        fehlerStunden.textContent = '';
        teilzeitStundenEingabe.classList.remove('error');
      }
      // Max bei 100%: Prüfe ob Spinner am Limit
      else if (prozent > 100) {
        teilzeitProzentEingabe.value = 100;
        teilzeitProzentEingabe.classList.add('error');
        aktuellerFehlerProzent = "errors.percentMax";
        fehlerProzent.textContent = uebersetzung(aktuellerFehlerProzent, "Der Wert darf maximal 100% betragen");
        entferneFehlerMitFadeout(teilzeitProzentEingabe, fehlerProzent, () => aktuellerFehlerProzent = null, timerIdProzent);
      }
      else {
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
      
      // Max-Validierung: Prozent darf nicht über 100% liegen
      if (berechneterProzent > 100) {
        berechneterProzent = 100;
        // Stunden entsprechend anpassen (auf maximale reguläre Wochenstunden)
        teilzeitStundenEingabe.value = formatiereZahl(gesamt);
        // Nur Stunden-Fehler anzeigen (User hat in Stunden-Feld getippt)
        aktuellerFehlerStunden = "errors.hoursMax";
        fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, "Der Wert darf maximal " + formatiereZahl(gesamt) + " Stunden betragen");
        teilzeitStundenEingabe.classList.add('error');
        // Prozent-Fehler löschen falls vorhanden
        aktuellerFehlerProzent = null;
        fehlerProzent.textContent = '';
        teilzeitProzentEingabe.classList.remove('error');
      }
      else {
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
      fehlerProzent.textContent = uebersetzung(aktuellerFehlerProzent, "Wert wurde auf 50% korrigiert (ungültige Eingabe)");
      teilzeitProzentEingabe.classList.add('error');
      entferneFehlerMitFadeout(teilzeitProzentEingabe, fehlerProzent, () => aktuellerFehlerProzent = null, timerIdProzent);
    }

    // Prüfung des Mindestwerts
    else if (teilzeitProzent < teilzeitProzentMinimum) {
      teilzeitProzentEingabe.value = teilzeitProzentMinimum;
      aktuellerFehlerProzent = "errors.percentMin";
      fehlerProzent.textContent = uebersetzung(aktuellerFehlerProzent, "Der Wert muss mindestens 50% betragen");
      teilzeitProzentEingabe.classList.add('error');
      entferneFehlerMitFadeout(teilzeitProzentEingabe, fehlerProzent, () => aktuellerFehlerProzent = null, timerIdProzent);
    }

    // Prüfung des Maximalwerts
    else if (teilzeitProzent > 100) {
      teilzeitProzentEingabe.value = 100;
      aktuellerFehlerProzent = "errors.percentMax";
      fehlerProzent.textContent = uebersetzung(aktuellerFehlerProzent, "Der Wert darf maximal 100% betragen");
      teilzeitProzentEingabe.classList.add('error');
      entferneFehlerMitFadeout(teilzeitProzentEingabe, fehlerProzent, () => aktuellerFehlerProzent = null, timerIdProzent);
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

    // Frühe Validierung: Abbruch wenn reguläre Wochenstunden ungültig sind
    if (isNaN(wochenstunden) || wochenstunden <= 0) {
      return;
    }

    const minStunden = wochenstunden / 2;

    // Überprüfung, ob die Eingabe eine gültige Zahl ist
    if (isNaN(teilzeitStunden)) {
      teilzeitStundenEingabe.value = formatiereZahl(minStunden);
      aktuellerFehlerStunden = "errors.invalidHours";
      fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, "Wert wurde auf Minimum korrigiert (ungültige Eingabe)");
      teilzeitStundenEingabe.classList.add('error');
      entferneFehlerMitFadeout(teilzeitStundenEingabe, fehlerStunden, () => aktuellerFehlerStunden = null, timerIdStunden);
    }

    // Prüfung des Mindestwerts
    else if (teilzeitStunden < minStunden) {
      teilzeitStundenEingabe.value = formatiereZahl(minStunden);
      aktuellerFehlerStunden = "errors.hoursMin";
      fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, "Der Wert muss mindestens 50% der regulären Wochenstunden betragen");
      teilzeitStundenEingabe.classList.add('error');
      entferneFehlerMitFadeout(teilzeitStundenEingabe, fehlerStunden, () => aktuellerFehlerStunden = null, timerIdStunden);
    }

    // Prüfung des Maximalwerts
    else if (teilzeitStunden > wochenstunden) {
      teilzeitStundenEingabe.value = formatiereZahl(wochenstunden);
      aktuellerFehlerStunden = "errors.hoursMax";
      fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, "Der Wert darf maximal " + formatiereZahl(wochenstunden) + " Stunden betragen");
      teilzeitStundenEingabe.classList.add('error');
      entferneFehlerMitFadeout(teilzeitStundenEingabe, fehlerStunden, () => aktuellerFehlerStunden = null, timerIdStunden);
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
        "errors.invalidPercent": "Wert wurde auf 50% korrigiert (ungültige Eingabe)",
        "errors.percentMin": "Der Wert muss mindestens 50% betragen",
        "errors.percentMax": "Der Wert darf maximal 100% betragen"
      };
      fehlerProzent.textContent = uebersetzung(aktuellerFehlerProzent, fallbackMap[aktuellerFehlerProzent] || "");
    }

    // Aktualisiere Stunden-Fehlermeldungen
    if (aktuellerFehlerStunden) {
      const wochenstunden = parseFloat(wochenstundenEingabe.value);
      const fallbackMap = {
        "errors.invalidHours": "Wert wurde auf Minimum korrigiert (ungültige Eingabe)",
        "errors.hoursMin": "Der Wert muss mindestens 50% der regulären Wochenstunden betragen",
        "errors.hoursMax": "Der Wert darf maximal " + formatiereZahl(wochenstunden) + " Stunden betragen"
      };
      fehlerStunden.textContent = uebersetzung(aktuellerFehlerStunden, fallbackMap[aktuellerFehlerStunden] || "");
    }

    // Aktualisiere Dauer-Fehlermeldungen
    if (aktuellerFehlerDauer && fehlerDauer) {
      const fallbackMap = {
        "errors.durationMin": "Der Wert muss mindestens 12 Monate betragen",
        "errors.durationMax": "Der Wert darf maximal 60 Monate betragen"
      };
      fehlerDauer.textContent = uebersetzung(aktuellerFehlerDauer, fallbackMap[aktuellerFehlerDauer] || "");
    }

    // Aktualisiere reguläre Wochenstunden-Fehlermeldungen
    if (aktuellerFehlerRegularStunden && fehlerRegularStunden) {
      const fallbackMap = {
        "errors.regularHoursMin": "Der Wert muss mindestens 10 Stunden betragen",
        "errors.regularHoursMax": "Der Wert darf maximal 48 Stunden betragen"
      };
      fehlerRegularStunden.textContent = uebersetzung(aktuellerFehlerRegularStunden, fallbackMap[aktuellerFehlerRegularStunden] || "");
    }
  }

  // Bei Sprachwechsel Fehlermeldungen aktualisieren
  window.addEventListener("i18n:changed", aktualisiereFehlermeldungen);

  // Initiale Validierung und Button-Markierung beim Seitenstart
  validiereSichtbareButtons();
  synchronisiereButtonMarkierung();

  // Scroll-Funktion für "Jetzt berechnen" Button
  const btnStartCalculate = document.getElementById("btn-start-calculate");
  const eingabenSection = document.querySelector('section.card'); // Erste Eingabe-Section
  
  if (btnStartCalculate && eingabenSection) {
    btnStartCalculate.addEventListener("click", () => {
      // Scroll zu Section mit Offset, damit Tooltip sichtbar bleibt
      const sectionTop = eingabenSection.getBoundingClientRect().top + window.pageYOffset;
      const offset = 100; // Offset für Tooltip + Abstand oben
      window.scrollTo({
        top: sectionTop - offset,
        behavior: "smooth"
      });
    });
  }

  // Verhindere, dass Klicks auf Info-Icons das Input-Feld fokussieren
  // und positioniere Tooltips zentral
  document.querySelectorAll('.info-icon').forEach(icon => {
    // Speichere die berechnete Position, damit sie konsistent bleibt
    let gespeichertePosition = null;
    // Flag, um zu verhindern, dass die Positionierung mehrfach ausgeführt wird
    let positionierungLaeuft = false;
    // Flag, um zu verhindern, dass der Toggle mehrfach ausgeführt wird
    let toggleLaeuft = false;
    
    // Funktion zur intelligenten Tooltip-Positionierung
    function positioniereTooltipZentral() {
      // Verhindere mehrfache Ausführung
      if (positionierungLaeuft) {
        return;
      }
      positionierungLaeuft = true;
      const iconRect = icon.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const margin = 20; // Mindestabstand zum Rand
      
      // Icon-Position berechnen (relativ zum Viewport)
      const iconCenterX = iconRect.left + iconRect.width / 2;
      const iconLeft = iconRect.left;
      
      // Standard-Tooltip-Breite
      const preferredWidth = 280;
      const minWidth = 180;
      
      // Maximale verfügbare Breite (gesamter Viewport minus Margins)
      const maxAvailableWidth = viewportWidth - margin * 2;
      
      // Bestimme die tatsächliche Tooltip-Breite
      let tooltipWidth = Math.min(preferredWidth, maxAvailableWidth);
      tooltipWidth = Math.max(minWidth, tooltipWidth);
      
      const tooltipHalfWidth = tooltipWidth / 2;
      
      // SCHRITT 1: Prüfe, ob die zentrierte Position vollständig sichtbar wäre
      // Zentrierte Position: Tooltip-Mitte = Icon-Mitte (mit transform: translateX(-50%))
      const centeredTooltipLeftEdge = iconCenterX - tooltipHalfWidth;
      const centeredTooltipRightEdge = iconCenterX + tooltipHalfWidth;
      
      const wouldOverflowLeft = centeredTooltipLeftEdge < margin;
      const wouldOverflowRight = centeredTooltipRightEdge > viewportWidth - margin;
      
      // SCHRITT 2: Standardmäßig zentriert, nur verschieben wenn wirklich nötig
      let positionConfig = null;
      
      if (!wouldOverflowLeft && !wouldOverflowRight) {
        // Tooltip ist vollständig sichtbar → zentrierte Position (Standard-CSS)
        positionConfig = {
          left: null, // Entfernen = Standard-CSS
          transform: null, // Entfernen = Standard-CSS
          maxWidth: tooltipWidth
        };
      } else if (wouldOverflowLeft && !wouldOverflowRight) {
        // Tooltip würde links über den Rand hinausgehen → verschiebe nach RECHTS
        // Der Tooltip soll bei margin (20px vom linken Viewport-Rand) beginnen
        // tooltipLeftRelative ist die Position relativ zum linken Rand des Icons
        // Berechne die absolute Position des Tooltip-Links (im Viewport)
        const tooltipLeftAbsolute = margin;
        // Berechne die relative Position vom Icon
        let tooltipLeftRelative = tooltipLeftAbsolute - iconLeft;
        // Sicherstellen, dass tooltipLeftRelative nicht negativ wird
        // Wenn das Icon sehr weit links ist, beginnt der Tooltip rechts vom Icon
        if (tooltipLeftRelative < 0) {
          tooltipLeftRelative = 0;
          // Wenn der Tooltip rechts vom Icon beginnt, müssen wir die Breite anpassen
          const maxWidthFromIcon = viewportWidth - iconLeft - margin;
          if (maxWidthFromIcon < tooltipWidth) {
            tooltipWidth = Math.max(minWidth, maxWidthFromIcon);
          }
        }
        // Finale Prüfung: Stelle sicher, dass der Tooltip vollständig sichtbar ist
        const finalTooltipRight = iconLeft + tooltipLeftRelative + tooltipWidth;
        if (finalTooltipRight > viewportWidth - margin) {
          // Tooltip würde rechts über den Rand hinausgehen → reduziere Breite
          tooltipWidth = (viewportWidth - margin) - (iconLeft + tooltipLeftRelative);
          tooltipWidth = Math.max(minWidth, tooltipWidth);
        }
        positionConfig = {
          left: tooltipLeftRelative,
          transform: 'none',
          maxWidth: tooltipWidth
        };
      } else if (wouldOverflowRight && !wouldOverflowLeft) {
        // Tooltip würde rechts über den Rand hinausgehen → verschiebe nach LINKS
        const tooltipRightEdge = viewportWidth - margin;
        let tooltipLeftEdge = tooltipRightEdge - tooltipWidth;
        // Sicherstellen, dass linker Rand nicht über margin hinausgeht
        if (tooltipLeftEdge < margin) {
          tooltipLeftEdge = margin;
          tooltipWidth = viewportWidth - margin * 2;
          tooltipWidth = Math.max(minWidth, tooltipWidth);
        }
        const tooltipLeftRelative = tooltipLeftEdge - iconLeft;
        positionConfig = {
          left: tooltipLeftRelative,
          transform: 'none',
          maxWidth: tooltipWidth
        };
      } else if (wouldOverflowLeft && wouldOverflowRight) {
        // Tooltip würde auf beiden Seiten über den Rand hinausgehen → reduziere Breite
        tooltipWidth = viewportWidth - margin * 2;
        tooltipWidth = Math.max(minWidth, tooltipWidth);
        const tooltipLeftRelative = margin - iconLeft;
        positionConfig = {
          left: tooltipLeftRelative,
          transform: 'none',
          maxWidth: tooltipWidth
        };
      }
      
      // Speichere die Position für spätere Verwendung
      gespeichertePosition = positionConfig;
      
      // Wende die Positionierung an
      if (positionConfig.left === null) {
        icon.style.removeProperty('--tooltip-left');
      } else {
        icon.style.setProperty('--tooltip-left', `${positionConfig.left}px`);
      }
      
      if (positionConfig.transform === null) {
        icon.style.removeProperty('--tooltip-transform');
      } else {
        icon.style.setProperty('--tooltip-transform', positionConfig.transform);
      }
      
      icon.style.setProperty('--tooltip-max-width', `${positionConfig.maxWidth}px`);
      
      // Flag zurücksetzen nach kurzer Verzögerung
      setTimeout(() => {
        positionierungLaeuft = false;
      }, 100);
    }
    
    // Funktion zum Anwenden der gespeicherten Position
    function wendeGespeichertePositionAn() {
      if (gespeichertePosition) {
        if (gespeichertePosition.left === null) {
          icon.style.removeProperty('--tooltip-left');
        } else {
          icon.style.setProperty('--tooltip-left', `${gespeichertePosition.left}px`);
        }
        
        if (gespeichertePosition.transform === null) {
          icon.style.removeProperty('--tooltip-transform');
        } else {
          icon.style.setProperty('--tooltip-transform', gespeichertePosition.transform);
        }
        
        icon.style.setProperty('--tooltip-max-width', `${gespeichertePosition.maxWidth}px`);
      }
    }
    
    // Positionierung beim Klick/Touch - sofort und korrekt
    // Auf mobilen Geräten: Verwende nur touchstart, um doppelte Events zu vermeiden
    const isTouchDevice = 'ontouchstart' in window;
    let lastTouchTime = 0;
    let lastTouchTarget = null;
    
    // Funktion zum Toggle des Tooltips
    function toggleTooltip(event) {
      // Verhindere mehrfache Ausführung
      if (toggleLaeuft) {
        return;
      }
      toggleLaeuft = true;
      
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      const wasActive = icon.classList.contains('active');
      
      if (!wasActive) {
        // Tooltip wird geöffnet
        // Entferne zuerst alle Custom-Positionierung, damit Standard-CSS greift
        icon.style.removeProperty('--tooltip-left');
        icon.style.removeProperty('--tooltip-transform');
        icon.style.removeProperty('--tooltip-max-width');
        
        // Jetzt erst die active-Klasse setzen, damit der Tooltip angezeigt wird
        icon.classList.add('active');
        
        // Positioniere IMMER neu, um sicherzustellen, dass die Position korrekt ist
        // Die Positionierung wird synchron ausgeführt, um Race Conditions zu vermeiden
        positioniereTooltipZentral();
      } else {
        // Tooltip wird geschlossen
        // Entferne zuerst die active-Klasse, damit der Tooltip sofort unsichtbar wird
        icon.classList.remove('active');
        // Warte auf das Ende der Opacity-Transition, bevor CSS-Variablen entfernt werden
        // Das verhindert Ghosting-Effekte
        setTimeout(() => {
          if (!icon.classList.contains('active')) {
            icon.style.removeProperty('--tooltip-left');
            icon.style.removeProperty('--tooltip-transform');
            icon.style.removeProperty('--tooltip-max-width');
          }
        }, 250); // Nach der Opacity-Transition (200ms + kleine Puffer)
        // Positionierung bleibt gespeichert, wird beim nächsten Öffnen wiederverwendet
      }
      
      // Schließe andere Tooltips
      document.querySelectorAll('.info-icon').forEach(otherIcon => {
        if (otherIcon !== icon) {
          otherIcon.classList.remove('active');
          // Warte auf das Ende der Opacity-Transition, bevor CSS-Variablen entfernt werden
          setTimeout(() => {
            if (!otherIcon.classList.contains('active')) {
              otherIcon.style.removeProperty('--tooltip-left');
              otherIcon.style.removeProperty('--tooltip-transform');
              otherIcon.style.removeProperty('--tooltip-max-width');
            }
          }, 250);
        }
      });
      
      // Flag nach kurzer Verzögerung zurücksetzen
      setTimeout(() => {
        toggleLaeuft = false;
      }, 300);
    }
    
    // Auf Touch-Geräten: Verwende nur touchstart
    if (isTouchDevice) {
      icon.addEventListener('touchstart', (event) => {
        const now = Date.now();
        // Verhindere doppelte Auslösung innerhalb von 500ms
        if (now - lastTouchTime < 500 && lastTouchTarget === event.target) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        lastTouchTime = now;
        lastTouchTarget = event.target;
        toggleTooltip(event);
      }, { passive: false });
      
      // Verhindere, dass click-Event auf Touch-Geräten ausgelöst wird
      icon.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
      }, true); // useCapture = true, damit es vor anderen click-Events ausgeführt wird
      
      // Verhindere auch touchend, um sicherzustellen, dass keine doppelten Events ausgelöst werden
      icon.addEventListener('touchend', (event) => {
        event.preventDefault();
        event.stopPropagation();
      }, { passive: false });
    } else {
      // Auf Desktop: Verwende click
      icon.addEventListener('click', toggleTooltip);
    }
    
    // Positioniere Tooltip auch beim Hover (für Desktop)
    // WICHTIG: Nur positionieren, wenn Tooltip nicht bereits durch Klick geöffnet wurde
    // ABER: Auf Touch-Geräten deaktivieren, um Konflikte mit click-Event zu vermeiden
    icon.addEventListener('mouseenter', () => {
      // Nur positionieren, wenn Tooltip nicht bereits aktiv ist (durch Klick)
      // UND wenn es kein Touch-Event ist (um Konflikte zu vermeiden)
      if (!icon.classList.contains('active') && !('ontouchstart' in window)) {
        // Berechne Positionierung für Hover (wird gespeichert)
        positioniereTooltipZentral();
      }
    });
    
    // Positioniere Tooltip auch bei Resize (nur wenn aktiv)
    // Bei Resize sollte Positionierung neu berechnet werden
    window.addEventListener('resize', () => {
      if (icon.classList.contains('active')) {
        // Positionierung muss bei Resize neu berechnet werden
        gespeichertePosition = null; // Zurücksetzen, damit neu berechnet wird
        // Entferne alle Custom-Positionierung, damit Standard-CSS greift
        icon.style.removeProperty('--tooltip-left');
        icon.style.removeProperty('--tooltip-transform');
        icon.style.removeProperty('--tooltip-max-width');
        // Positioniere neu
        positioniereTooltipZentral();
      }
    });
  });

  // Schließe Tooltips beim Klick außerhalb
  // WICHTIG: useCapture = false, damit das click-Event auf dem Icon zuerst ausgeführt wird
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.info-icon')) {
      document.querySelectorAll('.info-icon').forEach(icon => {
        icon.classList.remove('active');
        // Warte auf das Ende der Opacity-Transition, bevor CSS-Variablen entfernt werden
        setTimeout(() => {
          if (!icon.classList.contains('active')) {
            icon.style.removeProperty('--tooltip-left');
            icon.style.removeProperty('--tooltip-transform');
            icon.style.removeProperty('--tooltip-max-width');
          }
        }, 250);
      });
    }
  }, false); // useCapture = false, damit click-Event auf Icon zuerst ausgeführt wird
});

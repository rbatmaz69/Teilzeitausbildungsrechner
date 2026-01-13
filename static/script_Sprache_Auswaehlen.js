// ../static/script_Sprache_Auswaehlen.js
(() => {
  const STANDARD_SPRACHE = "de";
  const UNTERSTUETZT = ["de", "en", "uk", "tr", "ar", "fr", "ru", "pl", "ro"];

  // Sitzungspersistenz: sessionStorage überlebt Reloads im selben Tab.
  // Optional kann zusätzlich localStorage genutzt werden (überlebt Tab schließen).
  const PERSISTIERE_IN_LOCALSTORAGE = true;

  // Sprachdateien liegen in /static/Sprachdateien/
  const I18N_PFAD = "/static/Sprachdateien";

  const zustand = {
    sprache: null,
    woerterbuch: null
  };

  /** Synchronisiert die beiden Select-Sprachumschalter (Mobile + Desktop) auf die aktive Sprache. */
  const synchronisiereSelectUmschalter = () => {
    const langSwitcher = document.getElementById("lang-switcher");
    if (langSwitcher && zustand.sprache) langSwitcher.value = zustand.sprache;

    const langSwitcherDesktop = document.getElementById("lang-switcher-desktop");
    if (langSwitcherDesktop && zustand.sprache) langSwitcherDesktop.value = zustand.sprache;
  };

  /**
   * Leichte Sprache ist für alle Sprachen verfügbar (de, en, tr, uk).
   * Aktiv, wenn <html data-easy-language="true"> gesetzt ist.
   */
  const istLeichteSpracheAktiv = () => {
    try {
      return document.documentElement.getAttribute("data-easy-language") === "true";
    } catch {
      return false;
    }
  };

  /**
   * Liest die zuletzt vom Nutzer gewählte Sprache.
   * Priorität: sessionStorage (laufende Sitzung) → optional localStorage (über Sitzungen hinweg).
   * @returns {string|null} ISO-Sprachcode oder null, falls keiner gespeichert ist.
   */
  const holeGespeicherteSprache = () => {
    try {
      return sessionStorage.getItem("lang") || localStorage.getItem("lang");
    } catch {
      return null;
    }
  };

  /**
   * Persistiert die gewählte Sprache (immer in sessionStorage; optional zusätzlich in localStorage).
   * @param {string} sprache ISO-Sprachcode (z.B. "de" oder "en").
   */
  const speichereSprache = (sprache) => {
    try {
      sessionStorage.setItem("lang", sprache);
      if (PERSISTIERE_IN_LOCALSTORAGE) localStorage.setItem("lang", sprache);
    } catch {
      // ignore
    }
  };

  /**
   * Führt einen sicheren Zugriff auf verschachtelte Schlüssel in einem Objekt aus.
   * @param {Object} objekt Wörterbuch mit Übersetzungen.
   * @param {string} pfad Punkt-getrennter Pfad (z.B. "inputs.dauer.label").
   * @returns {any} Gefundener Wert oder null.
   */
  const aufloesung = (objekt, pfad) =>
    pfad.split(".").reduce((o, schluessel) => (o && o[schluessel] !== undefined ? o[schluessel] : null), objekt);

  /**
   * Löst i18n-Schlüssel auf. Bei aktiver "Leichter Sprache" wird zuerst *_easy versucht.
   */
  const aufloesungMitLeichterSprache = (objekt, pfad) => {
    if (istLeichteSpracheAktiv()) {
      const wertEasy = aufloesung(objekt, `${pfad}_easy`);
      if (wertEasy != null) return wertEasy;
    }
    return aufloesung(objekt, pfad);
  };

  /**
   * Setzt die globalen `lang`- und `dir`-Attribute auf dem `<html>`-Element.
   * @param {string} sprache ISO-Sprachcode.
   */
  const setzeHtmlSprachRichtung = (sprache) => {
    document.documentElement.setAttribute("lang", sprache);
    const rtlSprachen = ["ar", "he", "fa", "ur"];
    document.documentElement.setAttribute("dir", rtlSprachen.includes(sprache) ? "rtl" : "ltr");
  };

  /**
   * Lädt die JSON-Übersetzungsdatei für eine Sprache.
   * @param {string} sprache ISO-Sprachcode.
   * @returns {Promise<Object>} JSON-Dictionary mit Übersetzungen.
   */
  const ladeWoerterbuch = async (sprache) => {
    const sichereSprache = UNTERSTUETZT.includes(sprache) ? sprache : STANDARD_SPRACHE;
    const adresse = `${I18N_PFAD}/messages.${sichereSprache}.json`;

    const antwort = await fetch(adresse, { cache: "no-store" });
    if (!antwort.ok) throw new Error(`i18n: Could not load ${adresse} (${antwort.status})`);
    return antwort.json();
  };

  /**
   * Schreibt den übersetzten Wert in ein DOM-Element.
   * @param {HTMLElement} element Ziel-Element.
  * @param {string} wert Übersetzter Text oder HTML.
   */
  const wendeTextAn = (element, wert) => {
    if (element.dataset.i18nHtml === "true" || /<[^>]*>/.test(wert)) {
      element.innerHTML = wert;
    } else {
      element.textContent = wert;
    }
  };

  /**
   * Wendet alle Übersetzungen auf Elemente mit data-i18n-Attributen an.
   * @param {Object} woerterbuch Wörterbuch mit Übersetzungen.
   */
  const wendeUebersetzungenAn = (woerterbuch) => {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const schluessel = element.dataset.i18n;
      const wert = aufloesungMitLeichterSprache(woerterbuch, schluessel);
      if (wert == null) return;

      if (Array.isArray(wert)) {
        wendeTextAn(element, wert.map((eintrag) => `<li>${eintrag}</li>`).join(""));
      } else {
        wendeTextAn(element, String(wert));
      }
    });

    document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
      const zuordnungen = element.dataset.i18nAttr.split(",").map((zeichenkette) => zeichenkette.trim());
      zuordnungen.forEach((zuordnung) => {
        const [attribut, schluessel] = zuordnung.split(":").map((zeichenkette) => zeichenkette.trim());
        const wert = aufloesungMitLeichterSprache(woerterbuch, schluessel);
        if (wert != null) element.setAttribute(attribut, String(wert));
      });
    });

    // Setze data-label-open für Elemente mit data-i18n-open
    document.querySelectorAll("[data-i18n-open]").forEach((element) => {
      const schluessel = element.dataset.i18nOpen;
      const wert = aufloesungMitLeichterSprache(woerterbuch, schluessel);
      if (wert != null) element.setAttribute("data-label-open", String(wert));
    });

    // Select-Umschalter (Mobile + Desktop) auf aktuelle Sprache setzen
    synchronisiereSelectUmschalter();
  };

  /** Registriert eine globale I18N-Hilfs-API auf `window`. */
  const registriereGlobaleAPI = () => {
    window.I18N = {
      get lang() { return zustand.sprache; },
      get dict() { return zustand.woerterbuch; },
      t(schluessel, ersatzwert) {
        const wert = aufloesungMitLeichterSprache(zustand.woerterbuch, schluessel);
        return wert != null ? (Array.isArray(wert) ? wert : String(wert)) : (ersatzwert ?? schluessel);
      }
    };
  };

  /** Sendet ein benutzerdefiniertes Event, wenn sich die Sprache ändert. */
  const sendeSprachGeaendertEvent = () => {
    // Konvertiere Dezimaltrenner in numerischen Eingabefeldern
    const numericInputs = document.querySelectorAll('#stunden, #teilzeitProzent, #teilzeitStunden');
    const decimalSep = zustand.sprache === 'de' ? ',' : '.';
    const altSep = decimalSep === ',' ? '.' : ',';
    
    numericInputs.forEach(inp => {
      if (inp.value) {
        inp.value = inp.value.replace(new RegExp(`\\${altSep}`, 'g'), decimalSep);
      }
    });
    
    window.dispatchEvent(new CustomEvent("i18n:changed", {
      detail: { lang: zustand.sprache }
    }));
  };

  /**
   * Lädt Übersetzungen und aktualisiert UI sowie globale APIs.
   * @param {string} sprache ISO-Sprachcode.
   */
  const ladeUndWendeAn = async (sprache) => {
    zustand.sprache = UNTERSTUETZT.includes(sprache) ? sprache : STANDARD_SPRACHE;
    setzeHtmlSprachRichtung(zustand.sprache);

    try {
      zustand.woerterbuch = await ladeWoerterbuch(zustand.sprache);
      wendeUebersetzungenAn(zustand.woerterbuch);
      registriereGlobaleAPI();
      sendeSprachGeaendertEvent();
    } catch (fehler) {
      console.error(fehler);
    }
  };

  document.addEventListener("DOMContentLoaded", async () => {
    // Beim ersten Besuch: Deutsch. Danach: gespeicherte Sprache verwenden.
    const gespeicherteSprache = holeGespeicherteSprache();
    const startSprache =
      gespeicherteSprache && UNTERSTUETZT.includes(gespeicherteSprache) ? gespeicherteSprache : STANDARD_SPRACHE;

    await ladeUndWendeAn(startSprache);
    speichereSprache(startSprache);

    // Desktop-Sprachumschalter wird rein per CSS im Layout-Flow positioniert.

    // Reagiere auf Language-Select-Änderungen (Mobile)
    const langSwitcher = document.getElementById("lang-switcher");
    if (langSwitcher) {
      langSwitcher.addEventListener("change", async (event) => {
        const neueSprache = event.target.value;
        if (!neueSprache || !UNTERSTUETZT.includes(neueSprache)) return;
        
        speichereSprache(neueSprache);
        await ladeUndWendeAn(neueSprache);
        synchronisiereSelectUmschalter();
      });
    }

    // Reagiere auf Language-Select-Änderungen (Desktop)
    const langSwitcherDesktop = document.getElementById("lang-switcher-desktop");
    if (langSwitcherDesktop) {
      langSwitcherDesktop.addEventListener("change", async (event) => {
        const neueSprache = event.target.value;
        if (!neueSprache || !UNTERSTUETZT.includes(neueSprache)) return;
        
        speichereSprache(neueSprache);
        await ladeUndWendeAn(neueSprache);
        synchronisiereSelectUmschalter();
      });
    }

    // Reagiere auf Umschalten der "Leichten Sprache" (ohne Reload)
    window.addEventListener("easyLanguage:changed", () => {
      if (!zustand.woerterbuch) return;
      wendeUebersetzungenAn(zustand.woerterbuch);
      registriereGlobaleAPI();
    });
  });
})();

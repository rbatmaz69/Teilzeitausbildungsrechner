// ../static/script_Sprache_Auswaehlen.js
(() => {
  const STANDARD_SPRACHE = "de";
  const UNTERSTUETZT = ["de", "en"];

  // Sprachdateien liegen in /static/Sprachdateien/
  const I18N_PFAD = "/static/Sprachdateien";

  const zustand = {
    sprache: null,
    woerterbuch: null
  };

  /**
   * Liest die zuletzt vom Nutzer gewählte Sprache aus dem LocalStorage aus.
   * @returns {string|null} ISO-Sprachcode oder null, falls keiner gespeichert ist.
   */
  const holeGespeicherteSprache = () => localStorage.getItem("lang");
  /**
   * Persistiert die gewählte Sprache im LocalStorage.
   * @param {string} sprache ISO-Sprachcode (z.B. "de" oder "en").
   */
  const speichereSprache = (sprache) => localStorage.setItem("lang", sprache);

  /**
   * Führt einen sicheren Zugriff auf verschachtelte Schlüssel in einem Objekt aus.
   * @param {Object} objekt Wörterbuch mit Übersetzungen.
   * @param {string} pfad Punkt-getrennter Pfad (z.B. "inputs.dauer.label").
   * @returns {any} Gefundener Wert oder null.
   */
  const aufloesung = (objekt, pfad) =>
    pfad.split(".").reduce((o, schluessel) => (o && o[schluessel] !== undefined ? o[schluessel] : null), objekt);

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
      const wert = aufloesung(woerterbuch, schluessel);
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
        const wert = aufloesung(woerterbuch, schluessel);
        if (wert != null) element.setAttribute(attribut, String(wert));
      });
    });

    // Synchronisiere beide Sprachumschalter (Mobile und Desktop)
    const sprachAuswahl = document.getElementById("lang-switcher");
    const sprachAuswahlDesktop = document.getElementById("lang-switcher-desktop");
    
    [sprachAuswahl, sprachAuswahlDesktop].forEach((select) => {
      if (select) {
        [...select.options].forEach((option) => {
          const schluessel = option.dataset.i18n;
          if (!schluessel) return;
          const wert = aufloesung(woerterbuch, schluessel);
          if (wert != null) option.textContent = String(wert);
        });
        select.value = zustand.sprache;
      }
    });
  };

  /** Registriert eine globale I18N-Hilfs-API auf `window`. */
  const registriereGlobaleAPI = () => {
    window.I18N = {
      get lang() { return zustand.sprache; },
      get dict() { return zustand.woerterbuch; },
      t(schluessel, ersatzwert) {
        const wert = aufloesung(zustand.woerterbuch, schluessel);
        return wert != null ? (Array.isArray(wert) ? wert : String(wert)) : (ersatzwert ?? schluessel);
      }
    };
  };

  /** Sendet ein benutzerdefiniertes Event, wenn sich die Sprache ändert. */
  const sendeSprachGeaendertEvent = () => {
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
    const sprachAuswahl = document.getElementById("lang-switcher");
    const sprachAuswahlDesktop = document.getElementById("lang-switcher-desktop");
    const anfaenglicheSprache =
      holeGespeicherteSprache() ||
      (navigator.language || navigator.userLanguage || "de").slice(0, 2);

    const startSprache = UNTERSTUETZT.includes(anfaenglicheSprache) ? anfaenglicheSprache : STANDARD_SPRACHE;

    if (sprachAuswahl) sprachAuswahl.value = startSprache;
    if (sprachAuswahlDesktop) sprachAuswahlDesktop.value = startSprache;

    await ladeUndWendeAn(startSprache);
    speichereSprache(startSprache);

    // Konsistente Position des Desktop-Sprachwechslers über Engines hinweg
    const switcherDesktopWrapper = document.querySelector(".language-switcher-desktop");

    const positioniereDesktopSwitcher = () => {
      if (!switcherDesktopWrapper) return;
      // Fixe Referenz-Position: hält sich unabhängig von Textlängen/Layouts stabil
      // Werte orientieren sich am Firefox-Layout (vorherige Overlay-Position)
      const FIX_TOP = 100; // px, weiter nach oben (~100% zusätzlicher Versatz)
      const FIX_RIGHT = 112; // px
      switcherDesktopWrapper.style.top = `${FIX_TOP}px`;
      switcherDesktopWrapper.style.right = `${FIX_RIGHT}px`;
      switcherDesktopWrapper.style.position = "absolute";
      switcherDesktopWrapper.style.zIndex = "10";
    };

    // Initial positionieren und bei verschiedenen Ereignissen neu berechnen
    // 1) Direkt nach DOMContentLoaded
    positioniereDesktopSwitcher();
    // 2) Nach vollständigem Laden (inkl. Bilder/Fonts)
    window.addEventListener("load", positioniereDesktopSwitcher);
    // 3) Bei History/Page Cache (Chrome/Edge: bfcache)
    window.addEventListener("pageshow", positioniereDesktopSwitcher);
    // 4) Nach Fonts-Loading, da Typo-Metriken die Berechnung beeinflussen können
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(positioniereDesktopSwitcher).catch(() => {});
    }
    // 5) Bei Resize/Orientation
    window.addEventListener("resize", positioniereDesktopSwitcher, { passive: true });
    window.addEventListener("orientationchange", positioniereDesktopSwitcher);
    // 6) Beobachte Layout-Änderungen in der Startseite (i18n-Updates etc.)
    // Keine MutationObserver-Kopplung an Titel/Content – Position bleibt fix unabhängig vom Inhalt

    if (sprachAuswahl) {
      sprachAuswahl.addEventListener("change", async (ereignis) => {
        const neueSprache = ereignis.target.value;
        if (sprachAuswahlDesktop) sprachAuswahlDesktop.value = neueSprache;
        speichereSprache(neueSprache);
        await ladeUndWendeAn(neueSprache);
      });
    }

    if (sprachAuswahlDesktop) {
      sprachAuswahlDesktop.addEventListener("change", async (ereignis) => {
        const neueSprache = ereignis.target.value;
        if (sprachAuswahl) sprachAuswahl.value = neueSprache;
        speichereSprache(neueSprache);
        await ladeUndWendeAn(neueSprache);
      });
    }
  });
})();

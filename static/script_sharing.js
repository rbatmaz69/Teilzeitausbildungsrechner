/* global html2canvas, jsPDF */
/**
 * script_sharing.js – PDF-Export und Link-Sharing
 * Implementiert clientseitige PDF-Generierung und URL-basiertes Teilen von Berechnungen
 */

// i18n Helfer (nutzt die globale API aus script_Sprache_Auswaehlen.js)
function uebersetzung(schluessel, fallback) {
  if (window.I18N && typeof window.I18N.t === "function") {
    return window.I18N.t(schluessel, fallback);
  }
  return fallback ?? schluessel;
}

function aktuelleSprache() {
  return (window.I18N && window.I18N.lang) || "de";
}

// CDN-Fallback-Loader für PDF-Bibliotheken (mehrere Hosts, falls geblockt)
const PDF_LIB_SOURCES = {
  html2canvas: [
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"
  ],
  jspdf: [
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"
  ]
};

let pdfLibsLoadingPromise = null;

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Script failed: ${url}`));
    document.head.appendChild(script);
  });
}

async function loadFirstAvailable(urls) {
  let lastError;
  for (const url of urls) {
    try {
      await loadScript(url);
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function ensurePdfLibs() {
  if (typeof html2canvas !== "undefined" && (typeof jsPDF !== "undefined" || (window.jspdf && window.jspdf.jsPDF))) {
    return;
  }

  if (pdfLibsLoadingPromise) {
    return pdfLibsLoadingPromise;
  }

  pdfLibsLoadingPromise = (async () => {
    await loadFirstAvailable(PDF_LIB_SOURCES.html2canvas);
    await loadFirstAvailable(PDF_LIB_SOURCES.jspdf);

    // UMD-Version legt jsPDF unter window.jspdf.jsPDF ab
    if (typeof jsPDF === "undefined" && window.jspdf && window.jspdf.jsPDF) {
      window.jsPDF = window.jspdf.jsPDF;
    }
  })();

  return pdfLibsLoadingPromise;
}

/**
 * Initialisiert Sharing-Buttons und Event-Listener
 */
document.addEventListener("DOMContentLoaded", () => {
  const btnDownloadPdf = document.getElementById("btn-download-pdf");
  const btnCopyLink = document.getElementById("btn-copy-link");

  if (btnDownloadPdf) {
    btnDownloadPdf.addEventListener("click", generierePDF);
  }

  if (btnCopyLink) {
    btnCopyLink.addEventListener("click", kopiereLinkZwischenablage);
  }

  // Laden von geteilten Links beim Seitenaufruf
  loadSharedData();
});

/**
 * Generiert ein PDF mit allen Berechnungsergebnissen
 */
async function generierePDF() {
  try {
    await ensurePdfLibs();
  } catch (loadErr) {
    console.error("PDF-Bibliotheken nicht geladen", loadErr);
    alert(uebersetzung("sharing.error.libraries", "PDF-Bibliotheken konnten nicht geladen werden"));
    return;
  }

  const button = document.getElementById("btn-download-pdf");
  const originalText = button.innerHTML;
  const originalDisabled = button.disabled;

  // Button deaktivieren und Ladezustand anzeigen
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.setAttribute("aria-disabled", "true");
  button.innerHTML = `<svg class="sharing-btn-icon spinner" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg> <span>${uebersetzung("sharing.generating", "Erstelle PDF...")}</span>`;

  try {
    // Sammle alle relevanten Ergebnis-Elemente
    const ergebnisContainer = document.getElementById("ergebnis-container");
    const inputsSection = document.getElementById("inputs-section");

    if (!ergebnisContainer || ergebnisContainer.hidden) {
      alert(uebersetzung("sharing.error.noResults", "Bitte führen Sie zuerst eine Berechnung durch"));
      return;
    }

    // Erstelle Clone für sauberes Rendering
    const pdfContent = document.createElement("div");
    pdfContent.style.position = "absolute";
    pdfContent.style.left = "-9999px";
    pdfContent.style.width = "760px"; // etwas schlanker für kompakteren Fit
    pdfContent.style.padding = "12px"; // weniger Padding spart Höhe
    pdfContent.style.backgroundColor = "#ffffff";
    pdfContent.style.fontFamily = "system-ui, -apple-system, sans-serif";
    pdfContent.style.lineHeight = "1.25"; // kompaktere Zeilenhöhe

    const currentDate = new Date().toLocaleDateString(aktuelleSprache() === "de" ? "de-DE" : "en-US");
    const currentTime = new Date().toLocaleTimeString(aktuelleSprache() === "de" ? "de-DE" : "en-US");

    // Titel und Zeitstempel als Teil des gerenderten Canvas, damit Unicode-Schriften korrekt sind
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.flexDirection = "column";
    header.style.alignItems = "center";
    header.style.marginBottom = "12px";

    const titleEl = document.createElement("h1");
    titleEl.textContent = uebersetzung("res.headline", "Ihre Teilzeitausbildung");
    titleEl.style.margin = "0";
    titleEl.style.fontSize = "1.35rem";
    titleEl.style.fontWeight = "700";
    header.appendChild(titleEl);

    const metaEl = document.createElement("p");
    metaEl.textContent = `${currentDate} ${currentTime}`;
    metaEl.style.margin = "0";
    metaEl.style.fontSize = "0.9rem";
    metaEl.style.color = "#808080";
    header.appendChild(metaEl);

    pdfContent.appendChild(header);

    // Kopiere Ergebnis-Container
    const ergebnisCopy = ergebnisContainer.cloneNode(true);
    ergebnisCopy.style.display = "block";
    ergebnisCopy.hidden = false;
    
    // Entferne Sharing-Menü aus PDF
    const sharingMenu = ergebnisCopy.querySelector(".sharing-menu");
    if (sharingMenu) {
      sharingMenu.remove();
    }
    
    // Entferne inputs-section aus PDF (wird separat eingefügt)
    const inputsSectionInCopy = ergebnisCopy.querySelector("#inputs-section");
    if (inputsSectionInCopy) {
      inputsSectionInCopy.remove();
    }
    
    // Entferne Hinweise-Karte aus PDF (optional - nur Ergebnisse)
    const notesCard = ergebnisCopy.querySelector("[aria-labelledby='notes-title']");
    if (notesCard) {
      notesCard.remove();
    }
    
    // Vertikale Abstände im Ergebnis-Clone reduzieren
    ergebnisCopy.querySelectorAll("h1,h2,h3,p,li,dl,dt,dd").forEach(el => {
      el.style.marginTop = el.style.marginTop || "0.25rem";
      el.style.marginBottom = el.style.marginBottom || "0.25rem";
    });

    // Badge-Text minimal nach oben verschieben (nur PDF, beeinflusst das Original-DOM nicht)
    ergebnisCopy.querySelectorAll(".result-extension-delta").forEach(badge => {
      badge.style.setProperty("transform", "translate(-50%, 6px)", "important");
      let textSpan = badge.querySelector("span.__pdf-badge-text") || badge.querySelector("span");
      if (!textSpan) {
        const span = document.createElement("span");
        span.textContent = badge.textContent;
        badge.textContent = "";
        badge.appendChild(span);
        textSpan = span;
      }
      textSpan.classList.add("__pdf-badge-text");
      textSpan.style.setProperty("display", "inline-block", "important");
      textSpan.style.setProperty("transform", "translateY(-6px)", "important");
      textSpan.style.setProperty("lineHeight", "1", "important");
    });

    // Pfeil und Rahmen in der PDF auf gleiche Höhe wie im Rechner
    ergebnisCopy.querySelectorAll(".result-extension-arrow-wrapper").forEach(wrapper => {
      wrapper.style.setProperty("padding", "0.3rem 0", "important"); // kompakteres Padding für PDF
      wrapper.style.setProperty("min-width", "4.5rem", "important");
    });

    ergebnisCopy.querySelectorAll(".result-extension-arrow").forEach(arrow => {
      arrow.style.setProperty("font-size", "2.5rem", "important"); // etwas kleiner für PDF-Fit
      arrow.style.setProperty("line-height", "1", "important");
      arrow.style.setProperty("transform", "translateY(-6px)", "important");
    });

    // Leere Absätze/Listelemente entfernen
    ergebnisCopy.querySelectorAll("p,li").forEach(el => {
      if (!el.textContent.trim() && el.children.length === 0) el.remove();
    });

    // "Dauer in Teilzeit" Zeile im PDF auf eine Zeile packen (genügend Platz in PDF)
    ergebnisCopy.querySelectorAll("dt").forEach(dt => {
      if (dt.textContent.includes("Dauer in Teilzeit")) {
        dt.style.setProperty("white-space", "nowrap", "important");
        dt.style.setProperty("font-size", "0.9rem", "important");
      }
    });

    pdfContent.appendChild(ergebnisCopy);

    // Kopiere Input-Details
    if (inputsSection) {
      const inputsCopy = inputsSection.cloneNode(true);
      inputsCopy.style.display = "block";
      inputsCopy.style.marginTop = "0"; // keine Leerzeile über der Überschrift
      inputsCopy.style.paddingTop = "0";
      inputsCopy.open = true; // Öffne Details für PDF
      // Entferne den Summary/Toggle und ersetze ihn durch eine Überschrift
      const summaryToggle = inputsCopy.querySelector('summary');
      if (summaryToggle) {
        const titleEl = document.createElement('h2');
        const headingText = aktuelleSprache() === 'de'
          ? 'Ihre Angaben'
          : uebersetzung('inputs.title', 'Your inputs');
        titleEl.textContent = headingText;
        titleEl.style.margin = '0 0 0.5rem 0'; // kein oberer Abstand
        titleEl.style.fontSize = '1.35rem';
        titleEl.style.fontWeight = '700';
        titleEl.style.display = 'flex';
        titleEl.style.alignItems = 'center';
        titleEl.style.minHeight = '44px';
        titleEl.style.lineHeight = '1.2';
        summaryToggle.replaceWith(titleEl);
      }
      
      // Abstände in der Inputs-Box reduzieren
      inputsCopy.querySelectorAll("h1,h2,h3,p,li,dl,dt,dd").forEach(el => {
        el.style.marginTop = el.style.marginTop || "0.2rem";
        el.style.marginBottom = el.style.marginBottom || "0.2rem";
      });
      inputsCopy.querySelectorAll("p,li").forEach(el => {
        if (!el.textContent.trim() && el.children.length === 0) el.remove();
      });
      pdfContent.appendChild(inputsCopy);
    }

    // Entferne ALLE Legenden und Datumsstempel aus dem gesamten PDF-Content (nach dem Zusammenbau)
    pdfContent.querySelectorAll(".units-legend").forEach(el => el.remove());
    pdfContent.querySelectorAll('[data-i18n="inputs.unitsLegend"]').forEach(el => el.remove());
    pdfContent.querySelectorAll('#stamp-date').forEach(el => el.remove());

    // Für PDF: Ersetze alle Kurz-Units durch ausgeschriebene Units via Text-Ersetzung
    const sprache = aktuelleSprache();
    
    // Hilfsfunktion zum Ersetzen von Text in allen Text-Knoten (mit Kontextmustern)
    function walkAndReplaceText(node, replacements) {
      if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent;
        Object.entries(replacements).forEach(([from, to]) => {
          // Ersetze Muster wie " м ", " м,", "м " etc.
          // Für kyrillische und andere Zeichen: Ersetze mit Kontext-Patterns
          const patterns = [
            new RegExp(`\\s${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`, 'g'),  // " м "
            new RegExp(`\\s${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([,.]?)$`, 'gm'), // " м" am Ende
            new RegExp(`^${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`, 'gm'),  // "м " am Anfang
            new RegExp(`([,(/])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`, 'g'),  // ",м " oder "(м "
          ];
          
          patterns.forEach(pattern => {
            text = text.replace(pattern, (match) => {
              // Erhalte Kontext (Leerzeichen, Komma etc.) und ersetze nur die Unit
              if (match.includes(from)) {
                return match.replace(from, to);
              }
              return match;
            });
          });
        });
        if (text !== node.textContent) {
          node.textContent = text;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Durchsuche alle Kinder
        const childrenArray = Array.from(node.childNodes);
        childrenArray.forEach(child => walkAndReplaceText(child, replacements));
      }
    }

    // Definiere Unit-Ersetzungen für alle Sprachen
    const unitReplacements = {
      'de': {
        'M': 'Monate',
        'Std': 'Stunden',
      },
      'en': {
        'm': 'months',
        'h': 'hours',
      },
      'uk': {
        'М': 'місяці',      // kyrillisches М (Großbuchstabe)
        'м': 'місяці',      // kyrillisches м (Kleinbuchstabe)
        'M': 'місяці',      // lateinisches M (Fallback)
        'год': 'години',
        'тиж': 'тижні',
      },
      'tr': {
        's': 'saat',
      }
    };

    walkAndReplaceText(pdfContent, unitReplacements[sprache] || {});

    document.body.appendChild(pdfContent);

    // Canvas aus HTML erstellen
    const canvas = await html2canvas(pdfContent, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      allowTaint: true
    });

    document.body.removeChild(pdfContent);

    // PDF erstellen (jsPDF)
    const { jsPDF } = window.jspdf || window;
    const pageWidth = 210;   // A4 Breite in mm
    const pageHeight = 297;  // A4 Höhe in mm
    const marginTop = 10;    // kleinerer Rand, da Header im Canvas enthalten ist
    const marginBottom = 10; // Platz für Footer
    const availableHeight = pageHeight - marginTop - marginBottom;

    const pdf = new jsPDF("p", "mm", "a4");
    // Header ist bereits im Canvas enthalten, kein separater Text nötig

    // Füge Canvas als Bild ein und skaliere, so dass alles in EINE Seite passt
    const fullWidthHeight = (canvas.height * pageWidth) / canvas.width; // Höhe bei voller Seitenbreite
    let drawWidth = pageWidth;
    let drawHeight = fullWidthHeight;
    if (drawHeight > availableHeight) {
      const scale = availableHeight / drawHeight;
      drawHeight = availableHeight;
      drawWidth = drawWidth * scale; // proportional verkleinern
    }
    const xCentered = (pageWidth - drawWidth) / 2;
    const yTop = marginTop;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", xCentered, yTop, drawWidth, drawHeight);

    // Kein Footer (Seitenangaben entfernt)

    // Speichere PDF mit Timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const fileName = `Teilzeitausbildung_Berechnung_${timestamp}.pdf`;
    pdf.save(fileName);

    // Erfolgs-Feedback
    button.innerHTML = `<svg class="sharing-btn-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>${uebersetzung("sharing.downloaded", "PDF heruntergeladen")}</span>`;

    setTimeout(() => {
      button.innerHTML = originalText;
      button.disabled = originalDisabled;
      button.removeAttribute("aria-busy");
      button.removeAttribute("aria-disabled");
    }, 2000);
  } catch (error) {
    console.error("PDF-Generierung fehlgeschlagen:", error);
    alert(uebersetzung("sharing.error.generation", "Fehler beim Erstellen der PDF-Datei"));
    button.innerHTML = originalText;
    button.disabled = originalDisabled;
    button.removeAttribute("aria-busy");
    button.removeAttribute("aria-disabled");
  }
}

/**
 * Generiert einen Share-Link mit allen Eingaben als URL-Parameter
 */
function generiereShareLink() {
  // Sammle alle Eingabe-Werte
  const dauer = document.getElementById("dauer")?.value || "";
  const stunden = document.getElementById("stunden")?.value || "";
  const teilzeitProzent = document.getElementById("teilzeitProzent")?.value || "";
  const teilzeitStunden = document.getElementById("teilzeitStunden")?.value || "";
  const alter = document.getElementById("alter")?.value || "";
  const sprache = aktuelleSprache();

  // Sammle Verkürzungsgründe (Checkboxen)
  const verkuerzungsgruende = {};
  document.querySelectorAll("#vk-fieldset input[type='checkbox'][data-vk-field]").forEach((input) => {
    if (input.checked) {
      const field = input.dataset.vkField;
      const months = Number(input.dataset.vkMonths || 0);

      if (field === "vorkenntnisse_monate") {
        verkuerzungsgruende.vorkenntnisse_monate = (verkuerzungsgruende.vorkenntnisse_monate || 0) + months;
      } else {
        verkuerzungsgruende[field] = true;
      }
    }
  });

  // Sammle Ja/Nein-Antworten (alle Checkboxen, auch "Nein")
  const yesNoQuestions = [
    { ja: 'kinderbetreuung-ja', nein: 'kinderbetreuung-nein', field: 'familien_kinderbetreuung' },
    { ja: 'pflege-ja', nein: 'pflege-nein', field: 'familien_pflegeverantwortung' },
    { ja: 'vk_beruf_q1_ja', nein: 'vk_beruf_q1_nein', field: 'beruf_q1' },
    { ja: 'vk_beruf_q2_ja', nein: 'vk_beruf_q2_nein', field: 'beruf_q2' },
    { ja: 'vk_beruf_q3_ja', nein: 'vk_beruf_q3_nein', field: 'beruf_q3' },
    { ja: 'vk_beruf_q4_ja', nein: 'vk_beruf_q4_nein', field: 'beruf_q4' },
    { ja: 'vk_beruf_q5_ja', nein: 'vk_beruf_q5_nein', field: 'beruf_q5' },
    { ja: 'vk_beruf_q6_ja', nein: 'vk_beruf_q6_nein', field: 'beruf_q6' }
  ];

  yesNoQuestions.forEach(({ ja, nein, field }) => {
    const jaCheckbox = document.getElementById(ja);
    const neinCheckbox = document.getElementById(nein);
    if (jaCheckbox && jaCheckbox.checked) {
      verkuerzungsgruende[field] = 'ja';
    } else if (neinCheckbox && neinCheckbox.checked) {
      verkuerzungsgruende[field] = 'nein';
    }
  });

  // Speichere Monate der nicht abgeschlossenen Ausbildung
  const berufQ2Months = document.getElementById('vk_beruf_q2_dauer_months');
  if (berufQ2Months && berufQ2Months.value) {
    verkuerzungsgruende.beruf_q2_months = Number(berufQ2Months.value);
  }

  // Schulabschluss-Select
  const schoolSelect = document.querySelector('select[data-vk-type="school-select"]');
  if (schoolSelect && schoolSelect.value) {
    const selectedOption = schoolSelect.selectedOptions[0];
    const fields = (selectedOption.dataset.vkSetFields || "").split(",").map((s) => s.trim()).filter(Boolean);
    fields.forEach((f) => {
      if (f in verkuerzungsgruende || f === "abitur" || f === "realschule") {
        verkuerzungsgruende[f] = true;
      }
    });
  }

  // Erstelle Base64-kodierte Parameterkette
  const params = {
    dauer,
    stunden,
    teilzeitProzent,
    teilzeitStunden,
    alter,
    sprache,
    vk: JSON.stringify(verkuerzungsgruende)
  };

  // Entferne leere Parameter
  Object.keys(params).forEach((key) => {
    if (!params[key] || params[key] === "" || params[key] === "{}") {
      delete params[key];
    }
  });

  const queryString = new URLSearchParams(params).toString();
  const shareLink = `${window.location.origin}${window.location.pathname}?${queryString}`;

  return shareLink;
}

/**
 * Kopiert Share-Link in Zwischenablage
 */
async function kopiereLinkZwischenablage() {
  const button = document.getElementById("btn-copy-link");
  const feedback = document.getElementById("copy-feedback");
  const originalText = button.innerHTML;

  try {
    button.setAttribute("aria-busy", "true");
    const shareLink = generiereShareLink();

    // Nutze Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareLink);
      zeigeFeedback();
    } else {
      // Fallback für ältere Browser
      const textarea = document.createElement("textarea");
      textarea.value = shareLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      zeigeFeedback();
    }
  } catch (error) {
    console.error("Fehler beim Kopieren:", error);
    alert(uebersetzung("sharing.error.copy", "Link konnte nicht kopiert werden"));
    button.removeAttribute("aria-busy");
  }

  function zeigeFeedback() {
    feedback.hidden = false;
    button.innerHTML = `<svg class="sharing-btn-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>${uebersetzung("sharing.copied", "Kopiert!")}</span>`;

    setTimeout(() => {
      button.innerHTML = originalText;
      feedback.hidden = true;
      button.removeAttribute("aria-busy");
    }, 2000);
  }
}

/**
 * Lädt geteilte Daten aus URL-Parametern und füllt die Formulare
 */
function loadSharedData() {
  const params = new URLSearchParams(window.location.search);

  // Nur laden, wenn Parameter vorhanden sind
  if (params.size === 0) {
    return;
  }

  // Verzögere Laden bis DOM vollständig initialisiert ist
  setTimeout(() => {
    // Basiseingaben
    const dauer = params.get("dauer");
    if (dauer && document.getElementById("dauer")) {
      document.getElementById("dauer").value = dauer;
      document.getElementById("dauer").dispatchEvent(new Event("input", { bubbles: true }));
    }

    const stunden = params.get("stunden");
    if (stunden && document.getElementById("stunden")) {
      document.getElementById("stunden").value = stunden;
      document.getElementById("stunden").dispatchEvent(new Event("input", { bubbles: true }));
    }

    const teilzeitProzent = params.get("teilzeitProzent");
    if (teilzeitProzent && document.getElementById("teilzeitProzent")) {
      document.getElementById("teilzeitProzent").value = teilzeitProzent;
      document.getElementById("teilzeitProzent").dispatchEvent(new Event("input", { bubbles: true }));
    }

    const teilzeitStunden = params.get("teilzeitStunden");
    if (teilzeitStunden && document.getElementById("teilzeitStunden")) {
      document.getElementById("teilzeitStunden").value = teilzeitStunden;
      document.getElementById("teilzeitStunden").dispatchEvent(new Event("input", { bubbles: true }));
    }

    const alter = params.get("alter");
    if (alter && document.getElementById("alter")) {
      document.getElementById("alter").value = alter;
      document.getElementById("alter").dispatchEvent(new Event("input", { bubbles: true }));
    }

    // Sprache setzen
    const sprache = params.get("sprache");
    if (sprache && document.getElementById("lang-switcher")) {
      document.getElementById("lang-switcher").value = sprache;
      document.getElementById("lang-switcher").dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Verkürzungsgründe laden
    const vkJson = params.get("vk");
    if (vkJson) {
      try {
        const vk = JSON.parse(decodeURIComponent(vkJson));

        // Setze Checkboxen
        document.querySelectorAll("#vk-fieldset input[type='checkbox'][data-vk-field]").forEach((checkbox) => {
          const field = checkbox.dataset.vkField;
          if (vk[field] === true) {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event("change", { bubbles: true }));
          }
        });

        // Setze Ja/Nein-Antworten
        const yesNoQuestions = [
          { ja: 'kinderbetreuung-ja', nein: 'kinderbetreuung-nein', field: 'familien_kinderbetreuung' },
          { ja: 'pflege-ja', nein: 'pflege-nein', field: 'familien_pflegeverantwortung' },
          { ja: 'vk_beruf_q1_ja', nein: 'vk_beruf_q1_nein', field: 'beruf_q1' },
          { ja: 'vk_beruf_q2_ja', nein: 'vk_beruf_q2_nein', field: 'beruf_q2' },
          { ja: 'vk_beruf_q3_ja', nein: 'vk_beruf_q3_nein', field: 'beruf_q3' },
          { ja: 'vk_beruf_q4_ja', nein: 'vk_beruf_q4_nein', field: 'beruf_q4' },
          { ja: 'vk_beruf_q5_ja', nein: 'vk_beruf_q5_nein', field: 'beruf_q5' },
          { ja: 'vk_beruf_q6_ja', nein: 'vk_beruf_q6_nein', field: 'beruf_q6' }
        ];

        yesNoQuestions.forEach(({ ja, nein, field }) => {
          const jaCheckbox = document.getElementById(ja);
          const neinCheckbox = document.getElementById(nein);
          
          if (vk[field] === 'ja' && jaCheckbox) {
            jaCheckbox.checked = true;
            jaCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
          } else if (vk[field] === 'nein' && neinCheckbox) {
            neinCheckbox.checked = true;
            neinCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
          }
        });

        // Setze Monate der nicht abgeschlossenen Ausbildung
        if (vk.beruf_q2_months) {
          const berufQ2Months = document.getElementById('vk_beruf_q2_dauer_months');
          if (berufQ2Months) {
            berufQ2Months.value = vk.beruf_q2_months;
            berufQ2Months.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }

        // Schulabschluss-Select
        const schoolSelect = document.querySelector('select[data-vk-type="school-select"]');
        if (schoolSelect) {
          const options = schoolSelect.querySelectorAll("option");
          for (const option of options) {
            const fields = (option.dataset.vkSetFields || "").split(",").map((s) => s.trim()).filter(Boolean);
            if (fields.some((f) => vk[f] === true)) {
              schoolSelect.value = option.value;
              schoolSelect.dispatchEvent(new Event("change", { bubbles: true }));
              break;
            }
          }
        }

        // Trigger Berechnung (ohne Scroll)
        window.__skipScrollToResults = true;
        setTimeout(() => {
          const btnCalculate = document.querySelector("button[data-i18n='btn.calculate']");
          if (btnCalculate) {
            btnCalculate.click();
          }
          // Reset Flag nach Berechnung
          setTimeout(() => {
            window.__skipScrollToResults = false;
          }, 1000);
        }, 500);
      } catch (error) {
        console.error("Fehler beim Laden geteilter Daten:", error);
      }
    }
  }, 500);
}

/**
 * CSS für Spinner-Animation hinzufügen
 */
const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .spinner {
    animation: spin 1s linear infinite;
    display: inline-block;
  }
`;
document.head.appendChild(style);

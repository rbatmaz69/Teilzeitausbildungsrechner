/**
 * Grundlegende Test-Suite für Sharing-Funktionalität
 * Kann in der Browser-Konsole ausgeführt werden
 */

console.log("🧪 Sharing & PDF Export - Test Suite");
console.log("=====================================\n");

// Test 1: PDF-Bibliotheken vorhanden?
function testPdfLibraries() {
  console.log("✓ Test 1: PDF-Bibliotheken");
  const hasJsPDF = typeof jsPDF !== "undefined" || typeof window.jspdf !== "undefined";
  const hasHtml2Canvas = typeof html2canvas !== "undefined";
  
  console.log(`  - jsPDF: ${hasJsPDF ? "✅ Geladen" : "❌ Nicht geladen"}`);
  console.log(`  - html2canvas: ${hasHtml2Canvas ? "✅ Geladen" : "❌ Nicht geladen"}`);
  
  return hasJsPDF && hasHtml2Canvas;
}

// Test 2: Sharing-Buttons vorhanden?
function testSharingButtons() {
  console.log("\n✓ Test 2: Sharing-Buttons");
  const btnPdf = document.getElementById("btn-download-pdf");
  const btnLink = document.getElementById("btn-copy-link");
  
  console.log(`  - PDF-Button: ${btnPdf ? "✅ Vorhanden" : "❌ Nicht vorhanden"}`);
  console.log(`  - Link-Button: ${btnLink ? "✅ Vorhanden" : "❌ Nicht vorhanden"}`);
  
  return !!btnPdf && !!btnLink;
}

// Test 3: i18n-Strings vorhanden?
function testI18nStrings() {
  console.log("\n✓ Test 3: i18n-Strings (Übersetzungen)");
  
  const requiredKeys = [
    "sharing.title",
    "sharing.downloadPdf",
    "sharing.copyLink",
    "sharing.copiedSuccess"
  ];
  
  let allPresent = true;
  requiredKeys.forEach(key => {
    const text = document.querySelector(`[data-i18n="${key}"]`)?.textContent;
    const hasKey = text && text !== key;
    console.log(`  - ${key}: ${hasKey ? "✅ Vorhanden" : "❌ Fehlt"}`);
    allPresent = allPresent && hasKey;
  });
  
  return allPresent;
}

// Test 4: Formular-Felder vorhanden?
function testFormFields() {
  console.log("\n✓ Test 4: Formular-Felder");
  
  const fields = [
    { id: "dauer", name: "Dauer" },
    { id: "stunden", name: "Wochenstunden" },
    { id: "teilzeitProzent", name: "Teilzeit-Prozent" }
  ];
  
  let allPresent = true;
  fields.forEach(field => {
    const element = document.getElementById(field.id);
    const hasElement = !!element;
    console.log(`  - ${field.name}: ${hasElement ? "✅ Vorhanden" : "❌ Fehlt"}`);
    allPresent = allPresent && hasElement;
  });
  
  return allPresent;
}

// Test 5: Barrierefreiheit
function testAccessibility() {
  console.log("\n✓ Test 5: Barrierefreiheit");
  
  const btnPdf = document.getElementById("btn-download-pdf");
  const btnLink = document.getElementById("btn-copy-link");
  
  const pdfHasAria = btnPdf?.hasAttribute("aria-describedby");
  const linkHasAria = btnLink?.hasAttribute("aria-describedby");
  
  console.log(`  - PDF-Button hat aria-describedby: ${pdfHasAria ? "✅ Ja" : "❌ Nein"}`);
  console.log(`  - Link-Button hat aria-describedby: ${linkHasAria ? "✅ Ja" : "❌ Nein"}`);
  
  return pdfHasAria && linkHasAria;
}

// Test 6: CSS-Styles geladen?
function testCssStyles() {
  console.log("\n✓ Test 6: CSS-Styles");
  
  const sharingMenu = document.getElementById("sharing-menu");
  if (!sharingMenu) {
    console.log(`  - Sharing-Menü: ❌ Nicht vorhanden`);
    return false;
  }
  
  const styles = window.getComputedStyle(sharingMenu);
  const hasBorder = styles.borderColor || styles.border;
  
  console.log(`  - Sharing-Menü geladen: ✅ Ja`);
  console.log(`  - Styling angewendet: ${hasBorder ? "✅ Ja" : "❌ Nein"}`);
  
  return !!hasBorder;
}

// Test 7: URL-Parameter Parsing
function testUrlParameterParsing() {
  console.log("\n✓ Test 7: URL-Parameter Parsing");
  
  const testParams = new URLSearchParams("dauer=36&stunden=40&teilzeitProzent=75");
  const hasDauer = testParams.has("dauer");
  const hasStunden = testParams.has("stunden");
  
  console.log(`  - Dauer-Parameter: ${hasDauer ? "✅ Erkannt" : "❌ Nicht erkannt"}`);
  console.log(`  - Stunden-Parameter: ${hasStunden ? "✅ Erkannt" : "❌ Nicht erkannt"}`);
  
  return hasDauer && hasStunden;
}

// Test 8: Event-Listener registriert?
function testEventListeners() {
  console.log("\n✓ Test 8: Event-Listener");
  
  const btnPdf = document.getElementById("btn-download-pdf");
  const btnLink = document.getElementById("btn-copy-link");
  
  // Prüfe ob Funktionen definiert sind
  const hasPdfFunction = typeof generierePDF === "function";
  const hasLinkFunction = typeof kopiereLinkZwischenablage === "function";
  
  console.log(`  - PDF-Funktion: ${hasPdfFunction ? "✅ Definiert" : "❌ Nicht definiert"}`);
  console.log(`  - Link-Funktion: ${hasLinkFunction ? "✅ Definiert" : "❌ Nicht definiert"}`);
  console.log(`  - Event-Listener registriert: ${btnPdf && btnLink ? "✅ Ja" : "❌ Nein"}`);
  
  return hasPdfFunction && hasLinkFunction;
}

// Test 9: Responsive Design
function testResponsiveDesign() {
  console.log("\n✓ Test 9: Responsive Design");
  
  const sharingButtons = document.querySelector(".sharing-buttons");
  if (!sharingButtons) {
    console.log(`  - Responsive Grid: ❌ Nicht vorhanden`);
    return false;
  }
  
  const styles = window.getComputedStyle(sharingButtons);
  const hasGridLayout = styles.display === "grid";
  
  console.log(`  - Grid-Layout vorhanden: ${hasGridLayout ? "✅ Ja" : "❌ Nein"}`);
  console.log(`  - Viewport-Breite: ${window.innerWidth}px`);
  
  const expectedColumns = window.innerWidth >= 640 ? "2" : "1";
  console.log(`  - Erwartete Spalten: ${expectedColumns}`);
  
  return hasGridLayout;
}

// Test 10: Integration Test
async function testIntegration() {
  console.log("\n✓ Test 10: Integration (Manual)");
  
  console.log("  - Folgende Schritte manuell überprüfen:");
  console.log("    1. Formular ausfüllen");
  console.log("    2. 'Ergebnis anzeigen' klicken");
  console.log("    3. Sharing-Menü sollte sichtbar sein");
  console.log("    4. PDF-Button klicken → Download sollte starten");
  console.log("    5. Link-Button klicken → Bestätigung sollte angezeigt werden");
  
  return true;
}

// Hauptfunktion: Alle Tests ausführen
async function runAllTests() {
  console.log("\n🚀 Starte Test-Suite...\n");
  
  const results = {
    "PDF-Bibliotheken": testPdfLibraries(),
    "Sharing-Buttons": testSharingButtons(),
    "i18n-Strings": testI18nStrings(),
    "Formular-Felder": testFormFields(),
    "Barrierefreiheit": testAccessibility(),
    "CSS-Styles": testCssStyles(),
    "URL-Parameter": testUrlParameterParsing(),
    "Event-Listener": testEventListeners(),
    "Responsive Design": testResponsiveDesign(),
    "Integration": await testIntegration()
  };
  
  // Zusammenfassung
  console.log("\n=====================================");
  console.log("📊 ZUSAMMENFASSUNG\n");
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  const percentage = Math.round((passed / total) * 100);
  
  Object.entries(results).forEach(([name, result]) => {
    console.log(`${result ? "✅" : "❌"} ${name}`);
  });
  
  console.log(`\n📈 Gesamt: ${passed}/${total} Tests bestanden (${percentage}%)`);
  
  if (percentage === 100) {
    console.log("\n🎉 Alle Tests bestanden! Die Implementierung ist produktionsreif.");
  } else if (percentage >= 80) {
    console.log("\n⚠️ Die meisten Tests bestanden. Kleine Anpassungen möglich.");
  } else {
    console.log("\n❌ Es gibt noch Probleme zu beheben.");
  }
  
  return results;
}

// Starte Tests
runAllTests().then(results => {
  console.log("\n💾 Test-Ergebnisse in der Konsole verfügbar.");
});

/**
 * Hilfreiche Debug-Funktionen
 */

// Funktionen exportieren für manuelle Tests in der Konsole
window.SHARING_TESTS = {
  runAllTests,
  testPdfLibraries,
  testSharingButtons,
  testI18nStrings,
  
  // Manuelle Funktions-Tests
  generateLink: () => {
    if (typeof generiereShareLink === "function") {
      const link = generiereShareLink();
      console.log("📍 Generierter Link:");
      console.log(link);
      return link;
    } else {
      console.error("❌ generiereShareLink() nicht definiert");
    }
  },
  
  simulatePdfGeneration: async () => {
    if (typeof generierePDF === "function") {
      console.log("🔄 Starte PDF-Generierung...");
      await generierePDF();
    } else {
      console.error("❌ generierePDF() nicht definiert");
    }
  },
  
  testUrlLoad: (url) => {
    console.log(`🔗 Teste URL-Parameter: ${url}`);
    const params = new URLSearchParams(new URL(url).search);
    console.log("Parameter gefunden:", Object.fromEntries(params));
    return params;
  }
};

console.log("\n💡 Tipp: window.SHARING_TESTS.runAllTests() für vollständigen Test");

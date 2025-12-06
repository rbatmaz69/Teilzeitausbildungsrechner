import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Happy Path - Hauptnutzerflüsse
 * 
 * Diese Tests decken die wichtigsten User-Journeys ab:
 * - Vollzeit-Berechnung (36 Monate, 100%)
 * - Teilzeit-Berechnung (36 Monate, 75%)
 * - Teilzeit mit Verkürzung (Abitur)
 * - Stunden-Eingabe statt Prozent
 */

/**
 * Helper: Navigiert zur Seite und wartet bis Formular geladen ist
 * Das Formular ist jetzt immer sichtbar und scrollbar (kein Button-Klick nötig)
 */
async function gotoCalculator(page) {
  // Setze Sprache auf Deutsch via localStorage
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('lang', 'de'));
  await page.reload();
  
  // Warte bis Seite komplett geladen ist
  await page.waitForLoadState('networkidle');
  
  // Warte bis Formular sichtbar ist
  await page.waitForSelector('#dauer', { state: 'visible', timeout: 10000 });
  
  // Scroll zum Formular
  await page.locator('#dauer').scrollIntoViewIfNeeded();
  
  // Warte auf deutschen Text (robuster als nur auf Formular zu warten)
  await expect(page.locator('body')).toContainText('Ausbildungsdauer', { timeout: 10000 });
}

/**
 * Helper: Klickt Button mit automatischem Scroll
 */
async function clickButton(page, selector) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.click(selector);
}

test.describe('Happy Path: Vollzeit Berechnungen', () => {
  
  test('Vollzeit ohne Verkürzung: 36 Monate, 40h, 100%', async ({ page }) => {
    await gotoCalculator(page);
    
    // Explizit 100% setzen (falls vorheriger Test Teilzeit aktiviert hat)
    await page.click('#teilzeitProzent');
    await page.fill('#teilzeitProzent', '100');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 36 Monate
    await expect(page.locator('#res-total-months')).toContainText('36');
  });

  test('Vollzeit mit Abitur-Verkürzung: 36-12 = 24 Monate', async ({ page }) => {
    await gotoCalculator(page);
    
    // Explizit 100% setzen (Vollzeit)
    await page.click('#teilzeitProzent');
    await page.fill('#teilzeitProzent', '100');
    
    // Abitur aus Dropdown auswählen (12 Monate Verkürzung)
    await page.selectOption('#vk-school-select', 'abitur');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 36 - 12 = 24 Monate
    await expect(page.locator('#res-total-months')).toContainText('24');
  });
});

test.describe('Happy Path: Teilzeit Berechnungen', () => {
  
  test('Teilzeit 75%: (36 Monate * 100/75) = 48 Monate (Preset-Button)', async ({ page }) => {
    await gotoCalculator(page);
    
    // Eingaben: 36 Monate, 40h
    // 75% Button klicken
    await clickButton(page, '[data-value="75"][data-type="percent"]');
    
    // Prüfe dass Button den Wert gesetzt hat
    await expect(page.locator('#teilzeitProzent')).toHaveValue('75');
    await expect(page.locator('#teilzeitStunden')).toHaveValue('30');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 36 * (100/75) = 48 Monate
    await expect(page.locator('#res-total-months')).toContainText('48');
  });

  test('Teilzeit 50%: Preset-Button und manuelle Prozent-Eingabe', async ({ page }) => {
    await gotoCalculator(page);
    
    // 50% Button klicken
    await clickButton(page, '[data-type="percent"][data-value="50"]');
    
    // Prüfe dass Button den Wert gesetzt hat
    await expect(page.locator('#teilzeitProzent')).toHaveValue('50');
    await expect(page.locator('#teilzeitStunden')).toHaveValue('20');
    
    // Ändere manuell auf 55%
    await page.fill('#teilzeitProzent', '55');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 36 * (100/55) ≈ 65.45 → 65M, aber max 1.5x = 54M
    await expect(page.locator('#res-total-months')).toContainText('54');
  });

  test('Teilzeit 75% mit Abitur: (36-12) * 100/75 = 32 Monate', async ({ page }) => {
    await gotoCalculator(page);
    
    // 75% und Abitur
    await clickButton(page, '[data-value="75"][data-type="percent"]');
    await page.selectOption('#vk-school-select', 'abitur');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: (36-12) * (100/75) = 24 * 1.333 = 32 Monate
    await expect(page.locator('#res-total-months')).toContainText('32');
  });

  test('Teilzeit 50% (Minimum): 36 * 100/50 = 72, aber max 1.5x = 54 Monate', async ({ page }) => {
    await gotoCalculator(page);
    
    // WICHTIG: page.goto um sauberen State zu garantieren
    await page.goto('http://localhost:5000');
    await page.evaluate(() => localStorage.setItem('lang', 'de'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Explizit 50% über Button setzen
    await clickButton(page, '[data-type="percent"][data-value="50"]');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 36 * 2 = 72 Monate, ABER gesetzliche Obergrenze (§ 7a BBiG) begrenzt auf 36 * 1.5 = 54 Monate
    await expect(page.locator('#res-total-months')).toContainText('54');
  });
});

test.describe('Happy Path: Stunden-Eingabe', () => {
  
  test('30 von 40 Stunden = 75% (manuelle Eingabe)', async ({ page }) => {
    await gotoCalculator(page);
    
    // Teilzeit-Stunden direkt eingeben: 30 Stunden
    await page.fill('#teilzeitStunden', '30');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 30h von 40h = 75% → 36 * (100/75) = 48 Monate
    await expect(page.locator('#res-total-months')).toContainText('48');
  });

  test('24h Preset-Button setzt korrekte Stunden', async ({ page }) => {
    await gotoCalculator(page);
    
    // 24h Button klicken
    await clickButton(page, '[data-type="hours"][data-value="24"]');
    
    // Prüfe ob Stunden-Feld korrekt gesetzt wurde
    await expect(page.locator('#teilzeitStunden')).toHaveValue('24');
    
    // Prozent-Feld sollte automatisch auf 60% gesetzt sein (24/40)
    await expect(page.locator('#teilzeitProzent')).toHaveValue('60');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 24h von 40h = 60% → 36 * (100/60) = 60 Monate, max 1.5x = 54M
    await expect(page.locator('#res-total-months')).toContainText('54');
  });

  test('32h Preset-Button setzt korrekte Stunden', async ({ page }) => {
    await gotoCalculator(page);
    
    // 32h Button klicken
    await clickButton(page, '[data-type="hours"][data-value="32"]');
    
    // Prüfe ob Stunden-Feld korrekt gesetzt wurde
    await expect(page.locator('#teilzeitStunden')).toHaveValue('32');
    
    // Prozent-Feld sollte automatisch auf 80% gesetzt sein (32/40)
    await expect(page.locator('#teilzeitProzent')).toHaveValue('80');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 32h von 40h = 80% → 36 * (100/80) = 45 Monate
    await expect(page.locator('#res-total-months')).toContainText('45');
  });
});

test.describe('Happy Path: Sprachwechsel', () => {
  
  test('Sprachwechsel DE → EN funktioniert', async ({ page }) => {
    // Setze Sprache auf Deutsch
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('lang', 'de'));
    await page.reload();
    
    // Prüfe deutsche Überschrift (auf Startseite)
    await expect(page.locator('.startseite-title-accent').first()).toContainText('Teilzeitausbildung');
    
    // Wechsle zu Englisch (Desktop-Ansicht in Playwright)
    await page.selectOption('#lang-switcher-desktop', 'en');
    
    // Warte auf Übersetzung - prüfe direkt auf englischen Text
    await expect(page.locator('.startseite-title-accent').first()).toContainText('part-time training', { timeout: 5000 });
  });
});

test.describe('Happy Path: English Language Tests', () => {
  
  /**
   * Helper für englische Tests
   */
  async function gotoCalculatorEnglish(page) {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('lang', 'en'));
    await page.reload();
    
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#dauer', { state: 'visible', timeout: 10000 });
    await page.locator('#dauer').scrollIntoViewIfNeeded();
    
    // Warte auf englischen Text statt waitForTimeout (robuster)
    await expect(page.locator('body')).toContainText('part-time training', { timeout: 10000 });
  }
  
  test('Full-time calculation in English: 36 months', async ({ page }) => {
    await gotoCalculatorEnglish(page);
    
    // Verify English is loaded
    await expect(page.locator('.startseite-title-accent').first()).toContainText('part-time training');
    
    // Set 100% (full-time)
    await page.click('#teilzeitProzent');
    await page.fill('#teilzeitProzent', '100');
    
    // Calculate
    await page.locator('#berechnenBtn').scrollIntoViewIfNeeded();
    await page.click('#berechnenBtn');
    
    // Check result: 36 months
    await expect(page.locator('#res-total-months')).toContainText('36');
  });
  
  test('Part-time 75% calculation in English: 48 months', async ({ page }) => {
    await gotoCalculatorEnglish(page);
    
    // Click 75% preset button
    await page.click('[data-value="75"][data-type="percent"]');
    
    // Calculate
    await page.locator('#berechnenBtn').scrollIntoViewIfNeeded();
    await page.click('#berechnenBtn');
    
    // Check result: 36 * 100/75 = 48 months
    await expect(page.locator('#res-total-months')).toContainText('48');
  });
});

test.describe('Happy Path: Reset-Button', () => {
  
  test('Reset-Button setzt alle Felder zurück', async ({ page }) => {
    await gotoCalculator(page);
    
    // Mock confirm Dialog mit Zähler - nur ersten Aufruf bestätigen
    await page.evaluate(() => {
      let confirmCount = 0;
      window.confirm = () => {
        confirmCount++;
        return confirmCount === 1; // Nur beim ersten Mal true (für Reset)
      };
    });
    
    // Fülle Formular aus
    await page.fill('#dauer', '42');
    await page.fill('#stunden', '35');
    await page.fill('#teilzeitProzent', '80');
    await page.selectOption('#vk-school-select', 'realschule');
    
    // Berechne Ergebnis
    await clickButton(page, '#berechnenBtn');
    
    // Prüfe dass Ergebnis sichtbar ist
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Reset-Button klicken
    await clickButton(page, '#btn-reset');
    
    // Warte bis Felder zurückgesetzt wurden
    await expect(page.locator('#dauer')).toHaveValue('36', { timeout: 2000 });
    await expect(page.locator('#stunden')).toHaveValue('40');
    await expect(page.locator('#teilzeitProzent')).toHaveValue('75');
    await expect(page.locator('#vk-school-select')).toHaveValue('none');
    
    // Prüfe dass Ergebnis hidden-Attribut hat
    await expect(page.locator('#ergebnis-container')).toHaveAttribute('hidden', '');
  });
});

test.describe('Happy Path: Share-Button', () => {

  test('Share-Button erstellt URL mit Berechnungsdaten', async ({ page }) => {
    await gotoCalculator(page);
    
    // ERSTER SHARE: Fülle Formular mit "none" als Schulabschluss
    await page.fill('#dauer', '30');
    await page.fill('#stunden', '38');
    await clickButton(page, '[data-type="percent"][data-value="75"]');
    await page.selectOption('#vk-school-select', 'none');
    // Keine Checkboxen aktiviert
    
    // Berechne Ergebnis
    await clickButton(page, '#berechnenBtn');
    
    // Warte auf Ergebnis
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Mock clipboard API und alert für Test
    await page.evaluate(() => {
      window.copiedText = '';
      window.alert = () => {};
      if (!navigator.clipboard) {
        navigator.clipboard = {};
      }
      navigator.clipboard.writeText = async (text) => {
        window.copiedText = text;
        return Promise.resolve();
      };
    });
    
    // Share-Button klicken
    await clickButton(page, '#btn-share');
    
    // Warte bis copiedText gesetzt wurde
    await page.waitForFunction(() => window.copiedText !== undefined, { timeout: 2000 });
    
    // Hole kopierten Link
    const copiedUrl = await page.evaluate(() => window.copiedText);
    
    // Prüfe dass URL Daten enthält
    expect(copiedUrl).toContain('?data=');
    
    // Navigiere zu kopiertem Link
    await page.goto(copiedUrl);
    await page.waitForLoadState('networkidle');
    
    // Prüfe dass Ergebnis direkt angezeigt wird
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Prüfe dass die Werte korrekt geladen wurden
    await expect(page.locator('#dauer')).toHaveValue('30');
    await expect(page.locator('#stunden')).toHaveValue('38');
    await expect(page.locator('#teilzeitProzent')).toHaveValue('75');
    await expect(page.locator('#vk-school-select')).toHaveValue('none');
    await expect(page.locator('[data-vk-field="alter_ueber_21"]')).not.toBeChecked();
    await expect(page.locator('[data-vk-field="familien_pflegeverantwortung"]')).not.toBeChecked();
    
    // ZWEITER SHARE: Ändere auf Abitur und aktiviere Checkboxen
    await page.selectOption('#vk-school-select', 'abitur');
    await page.check('[data-vk-field="alter_ueber_21"]');
    
    // Berechne erneut
    await clickButton(page, '#berechnenBtn');
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Mock clipboard API erneut (nach page.goto wurde die Seite neu geladen)
    await page.evaluate(() => {
      window.copiedText = '';
      window.alert = () => {};
      if (!navigator.clipboard) {
        navigator.clipboard = {};
      }
      navigator.clipboard.writeText = async (text) => {
        window.copiedText = text;
        return Promise.resolve();
      };
    });
    
    // Teile erneut
    await clickButton(page, '#btn-share');
    await page.waitForFunction(() => window.copiedText && window.copiedText.includes('data='), { timeout: 2000 });
    
    // Hole neuen Link
    const copiedUrl2 = await page.evaluate(() => window.copiedText);
    expect(copiedUrl2).toContain('?data=');
    
    // Navigiere zu neuem Link
    await page.goto(copiedUrl2);
    await page.waitForLoadState('networkidle');
    
    // Prüfe dass die GEÄNDERTEN Werte korrekt geladen wurden
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#dauer')).toHaveValue('30');
    await expect(page.locator('#stunden')).toHaveValue('38');
    await expect(page.locator('#teilzeitProzent')).toHaveValue('75');
    await expect(page.locator('#vk-school-select')).toHaveValue('abitur');
    await expect(page.locator('[data-vk-field="alter_ueber_21"]')).toBeChecked();
  });
});

test.describe('Mobile Tests: Happy Path', () => {
  /**
   * Helper für Mobile-Tests (iPhone 13 Viewport)
   */
  async function gotoCalculatorMobile(page) {
    // iPhone 13 Viewport setzen
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Setze Sprache auf Deutsch via localStorage
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('lang', 'de'));
    await page.reload();
    
    // Warte bis Seite komplett geladen ist
    await page.waitForLoadState('networkidle');
    
    // Warte bis Formular sichtbar ist
    await page.waitForSelector('#dauer', { state: 'visible', timeout: 10000 });
    
    // Scroll zum Formular
    await page.locator('#dauer').scrollIntoViewIfNeeded();
    
    // Warte auf deutschen Text (robuster für Mobile)
    await expect(page.locator('body')).toContainText('Ausbildungsdauer', { timeout: 10000 });
  }
  
  /**
   * Helper: Klickt Button mit automatischem Scroll (Mobile)
   */
  async function clickButtonMobile(page, selector) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.click(selector);
  }
  
  test('Mobile: Vollzeit ohne Verkürzung - 36 Monate', async ({ page }) => {
    await gotoCalculatorMobile(page);
    
    // Explizit 100% setzen (Vollzeit)
    await page.click('#teilzeitProzent');
    await page.fill('#teilzeitProzent', '100');
    
    // Berechnen
    await clickButtonMobile(page, '#berechnenBtn');
    
    // Warte auf Ergebnis-Container
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Scroll zum Ergebnis (wichtig auf Mobile!)
    await page.locator('#res-total-months').scrollIntoViewIfNeeded();
    
    // Ergebnis: 36 Monate
    await expect(page.locator('#res-total-months')).toContainText('36');
  });
  
  test('Mobile: Teilzeit 75% - 48 Monate', async ({ page }) => {
    await gotoCalculatorMobile(page);
    
    // 75% Button klicken
    await clickButtonMobile(page, '[data-value="75"][data-type="percent"]');
    
    // Prüfe dass Button den Wert gesetzt hat
    await expect(page.locator('#teilzeitProzent')).toHaveValue('75');
    
    // Berechnen
    await clickButtonMobile(page, '#berechnenBtn');
    
    // Warte auf Ergebnis
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Scroll zum Ergebnis
    await page.locator('#res-total-months').scrollIntoViewIfNeeded();
    
    // Ergebnis: 36 * 100/75 = 48 Monate
    await expect(page.locator('#res-total-months')).toContainText('48');
  });
  
  test('Mobile: Teilzeit 50% mit Abitur - 48 Monate', async ({ page }) => {
    await gotoCalculatorMobile(page);
    
    // 50% Button klicken
    await clickButtonMobile(page, '[data-value="50"][data-type="percent"]');
    
    // Abitur aus Dropdown auswählen
    await page.selectOption('#vk-school-select', 'abitur');
    
    // Berechnen
    await clickButtonMobile(page, '#berechnenBtn');
    
    // Warte auf Ergebnis
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Scroll zum Ergebnis
    await page.locator('#res-total-months').scrollIntoViewIfNeeded();
    
    // Ergebnis: (36 - 12) * 100/50 = 48 Monate
    await expect(page.locator('#res-total-months')).toContainText('48');
  });
  
  test('Mobile: Validierung Minimum 24 Monate', async ({ page }) => {
    await gotoCalculatorMobile(page);
    
    // Ungültigen Wert eingeben (unter 24)
    await page.fill('#dauer', '10');
    
    // Blur Event auslösen durch Klick auf anderes Feld
    await clickButtonMobile(page, '#stunden');
    
    // Wert wird auf 24 korrigiert
    await expect(page.locator('#dauer')).toHaveValue('24');
    
    // Fehlermeldung wird angezeigt
    await expect(page.locator('#errorDauer')).toBeVisible();
    await expect(page.locator('#errorDauer')).toContainText('mindestens 24 Monate');
  });
  
  test('Mobile: Validierung Minimum 50% Teilzeit', async ({ page }) => {
    await gotoCalculatorMobile(page);
    
    // Aktiviere Teilzeit mit 75% Button (damit Feld aktiv ist)
    await clickButtonMobile(page, '[data-value="75"][data-type="percent"]');
    
    // Ungültigen Wert eingeben (unter 50%)
    await page.fill('#teilzeitProzent', '30');
    
    // Blur Event auslösen
    await clickButtonMobile(page, '#dauer');
    
    // Wert wird auf 50 korrigiert - warte auf Validierung
    await expect(page.locator('#teilzeitProzent')).toHaveValue('50', { timeout: 2000 });
    
    // Fehlermeldung wird angezeigt
    await expect(page.locator('#errorProzent')).toContainText('mindestens 50%');
  });
  
  test('Mobile: Sprachwechsel DE → EN mit Mobile-Switcher', async ({ page }) => {
    // iPhone 13 Viewport
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Setze Sprache auf Deutsch
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('lang', 'de'));
    await page.reload();
    
    // Warte bis Seite geladen ist
    await page.waitForLoadState('networkidle');
    
    // Prüfe deutsche Überschrift
    await expect(page.locator('.startseite-title-accent').first()).toContainText('Teilzeitausbildung');
    
    // Wechsle zu Englisch mit MOBILE Switcher
    await page.selectOption('#lang-switcher', 'en');
    
    // Warte auf Übersetzung - prüfe direkt auf englischen Text
    await expect(page.locator('.startseite-title-accent').first()).toContainText('part-time training', { timeout: 5000 });
  });
  
  test('Mobile: Scroll zu Ergebnis nach Berechnung', async ({ page }) => {
    await gotoCalculatorMobile(page);
    
    // Setze Werte
    await page.fill('#dauer', '30');
    await page.fill('#stunden', '35');
    await clickButtonMobile(page, '[data-value="75"][data-type="percent"]');
    
    // Berechnen
    await clickButtonMobile(page, '#berechnenBtn');
    
    // Warte auf Ergebnis
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Prüfe dass Ergebnis-Container sichtbar ist (impliziert automatisches Scroll)
    await expect(page.locator('#ergebnis-container')).toBeVisible();
    
    // Prüfe Ergebnis: 30 * 100/75 = 40 Monate
    await expect(page.locator('#res-total-months')).toContainText('40');
  });
  
  test('Mobile: Reset-Button funktioniert', async ({ page }) => {
    await gotoCalculatorMobile(page);
    
    // Mock confirm Dialog
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    
    // Setze mehrere Werte
    await page.fill('#dauer', '30');
    await page.fill('#stunden', '35');
    await clickButtonMobile(page, '[data-value="75"][data-type="percent"]');
    await page.selectOption('#vk-school-select', 'abitur');
    await page.check('[data-vk-field="alter_ueber_21"]');
    
    // Berechnen
    await clickButtonMobile(page, '#berechnenBtn');
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Reset klicken (korrekter Selector: #btn-reset)
    await page.locator('#btn-reset').scrollIntoViewIfNeeded();
    await page.click('#btn-reset');
    
    // Warte bis alle Felder zurückgesetzt wurden
    await expect(page.locator('#dauer')).toHaveValue('36', { timeout: 2000 });
    await expect(page.locator('#stunden')).toHaveValue('40');
    await expect(page.locator('#teilzeitProzent')).toHaveValue('75');  // 75 ist Default, nicht 100
    await expect(page.locator('#vk-school-select')).toHaveValue('none');
    await expect(page.locator('[data-vk-field="alter_ueber_21"]')).not.toBeChecked();
    
    // Prüfe dass Ergebnis versteckt wurde
    await expect(page.locator('#ergebnis-container')).toBeHidden();
  });
});

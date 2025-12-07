import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Input Validierung
 * 
 * Diese Tests prüfen die Frontend-Validierung der Eingabefelder:
 * - Min/Max Limits für Ausbildungsdauer (24-42 Monate)
 * - Min/Max Limits für Wochenstunden (10-48 Stunden)
 * - Teilzeit-Prozent Minimum (50%)
 * - Spinner-Verhalten an Limits
 */

/**
 * Helper: Navigiert zur Seite und wartet bis Formular geladen ist
 * Setzt Sprache IMMER auf Deutsch um Race Conditions zwischen parallel laufenden Tests zu vermeiden
 */
async function gotoCalculator(page) {
  await page.goto('/');
  
  // Setze Sprache explizit auf Deutsch (wichtig wegen parallel laufender Tests!)
  await page.evaluate(() => localStorage.setItem('lang', 'de'));
  await page.reload();
  
  // Warte bis Seite komplett geladen ist
  await page.waitForLoadState('networkidle');
  
  // Warte bis i18n-System vollständig initialisiert ist (globale API vorhanden)
  await page.waitForFunction(() => window.I18N && window.I18N.lang === 'de', { timeout: 15000 });
  
  // Warte auf das Formular
  await page.waitForSelector('#dauer', { state: 'visible', timeout: 10000 });
  await page.locator('#dauer').scrollIntoViewIfNeeded();
}

/**
 * Helper: Klickt Button mit automatischem Scroll
 */
async function clickButton(page, selector) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.click(selector);
}

test.describe('Validierung: Ausbildungsdauer', () => {
  
  test('Minimum 24 Monate wird erzwungen bei blur', async ({ page }) => {
    await gotoCalculator(page);
    
    // Setze ungültigen Wert unter Minimum
    await page.fill('#dauer', '10');
    
    // Blur triggern (auf anderes Feld klicken)
    await clickButton(page, '#stunden');
    
    // Wert sollte auf 24 korrigiert sein
    await expect(page.locator('#dauer')).toHaveValue('24');
    
    // Fehlermeldung sollte angezeigt werden
    await expect(page.locator('#errorDauer')).toBeVisible();
    await expect(page.locator('#errorDauer')).toContainText('mindestens 24 Monate');
  });

  test('Maximum 42 Monate wird sofort erzwungen', async ({ page }) => {
    await gotoCalculator(page);
    
    // Setze ungültigen Wert über Maximum
    await page.fill('#dauer', '60');
    
    // Wert sollte auf 42 korrigiert sein (mit Timeout für Auto-Korrektur)
    await expect(page.locator('#dauer')).toHaveValue('42', { timeout: 2000 });
    
    // Fehlermeldung sollte sichtbar sein
    await expect(page.locator('#errorDauer')).toBeVisible();
    await expect(page.locator('#errorDauer')).toContainText('maximal 42 Monate');
  });

  test('Gültiger Wert (36) zeigt keinen Fehler', async ({ page }) => {
    await gotoCalculator(page);
    
    // Standardwert ist 36 (gültig)
    await expect(page.locator('#dauer')).toHaveValue('36');
    
    // Keine Fehlermeldung
    await expect(page.locator('#errorDauer')).toBeEmpty();
  });
});

test.describe('Validierung: Wochenstunden', () => {
  
  test('Minimum 10 Stunden wird erzwungen', async ({ page }) => {
    await gotoCalculator(page);
    
    // Setze ungültigen Wert
    await page.fill('#stunden', '5');
    
    // Blur triggern
    await clickButton(page, '#dauer');
    
    // Korrigiert auf 10
    await expect(page.locator('#stunden')).toHaveValue('10');
    await expect(page.locator('#errorRegularStunden')).toContainText('mindestens 10 Stunden');
  });

  test('Maximum 48 Stunden wird sofort erzwungen', async ({ page }) => {
    await gotoCalculator(page);
    
    // Setze ungültigen Wert
    await page.fill('#stunden', '60');
    
    // Korrigiert auf 48
    await expect(page.locator('#stunden')).toHaveValue('48', { timeout: 2000 });
    
    // Warte kurz damit Fehlermeldung erscheint (asynchrone Event-Verarbeitung)
    await page.waitForTimeout(100);
    await expect(page.locator('#errorRegularStunden')).toContainText('maximal 48 Stunden', { timeout: 1000 });
  });
});

test.describe('Validierung: Teilzeit-Prozent', () => {
  
  test('Minimum 50% wird erzwungen bei manueller Eingabe', async ({ page }) => {
    await gotoCalculator(page);
    
    // Aktiviere Prozent-Input durch Button-Klick
    await clickButton(page, '[data-value="75"][data-type="percent"]');
    
    // Setze ungültigen Wert direkt im Input
    await page.fill('#teilzeitProzent', '30');
    
    // Blur triggern
    await clickButton(page, '#dauer');
    
    // Prüfe Fehlermeldung sofort (verschwindet nach 4s!)
    // Fehlermeldung ist auf Deutsch (Browser-Standard hat localStorage-Sprache)
    await expect(page.locator('#errorProzent')).toContainText('mindestens 50%');
    
    // Sollte auf 50 korrigiert sein
    await expect(page.locator('#teilzeitProzent')).toHaveValue('50');
  });

  test('Maximum 100% wird erzwungen', async ({ page }) => {
    await gotoCalculator(page);
    
    // Aktiviere Prozent-Input
    await clickButton(page, '[data-value="75"][data-type="percent"]');
    
    // Setze ungültigen Wert
    await page.fill('#teilzeitProzent', '150');
    
    // Sollte auf 100 korrigiert sein
    await expect(page.locator('#teilzeitProzent')).toHaveValue('100', { timeout: 2000 });
    await expect(page.locator('#errorProzent')).toContainText('maximal 100%');
  });
});

test.describe('Validierung: Fehler verschwinden nach 4 Sekunden', () => {
  
  test('Fehlermeldung verschwindet automatisch', async ({ page }) => {
    await gotoCalculator(page);
    
    // Trigger Fehler
    await page.fill('#dauer', '10');
    await clickButton(page, '#stunden');
    
    // Fehler ist sichtbar
    await expect(page.locator('#errorDauer')).toBeVisible();
    
    // Warte bis Fehler automatisch verschwindet (4s + fade)
    await expect(page.locator('#errorDauer')).toBeHidden({ timeout: 6000 });
    
    // Fehler sollte verschwunden sein
    await expect(page.locator('#errorDauer')).toBeEmpty();
  });
});

test.describe('Validation: English Language Tests', () => {
  
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
    
    // Warte auf englischen Text statt localStorage (robuster!)
    await expect(page.locator('body')).toContainText('part-time training', { timeout: 10000 });
  }
  
  async function clickButton(page, selector) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.click(selector);
  }
  
  test('Minimum 24 months validation in English', async ({ page }) => {
    await gotoCalculatorEnglish(page);
    
    // Set invalid value below minimum
    await page.fill('#dauer', '10');
    
    // Trigger blur
    await clickButton(page, '#stunden');
    
    // Should be corrected to 24
    await expect(page.locator('#dauer')).toHaveValue('24');
    
    // Check English error message
    await expect(page.locator('#errorDauer')).toBeVisible();
    await expect(page.locator('#errorDauer')).toContainText('at least 24 months');
  });
  
  test('Minimum 50% part-time validation in English', async ({ page }) => {
    await gotoCalculatorEnglish(page);
    
    // Activate part-time
    await clickButton(page, '[data-value="75"][data-type="percent"]');
    
    // Set too low percentage
    await page.fill('#teilzeitProzent', '30');
    await clickButton(page, '#dauer');
    
    // Should be corrected to 50 (mit Timeout für blur-Validierung)
    await expect(page.locator('#teilzeitProzent')).toHaveValue('50', { timeout: 2000 });
    
    // Check English error message
    await expect(page.locator('#errorProzent')).toContainText('at least 50%');
  });
});

// ============================================================================
// MOBILE VALIDATION TESTS
// ============================================================================

test.describe('Mobile Validation: Ausbildungsdauer', () => {
  
  test.beforeEach(async ({ page }) => {
    // iPhone 13 viewport
    await page.setViewportSize({ width: 390, height: 844 });
  });
  
  test('Mobile: Minimum 24 Monate wird erzwungen bei blur', async ({ page }) => {
    await gotoCalculator(page);
    
    // Setze ungültigen Wert unter Minimum
    await page.fill('#dauer', '10');
    
    // Blur triggern (auf anderes Feld klicken)
    await clickButton(page, '#stunden');
    
    // Wert sollte auf 24 korrigiert sein
    await expect(page.locator('#dauer')).toHaveValue('24');
    
    // Fehlermeldung sollte angezeigt werden
    await expect(page.locator('#errorDauer')).toBeVisible();
    await expect(page.locator('#errorDauer')).toContainText('mindestens 24 Monate');
  });

  test('Mobile: Maximum 42 Monate wird sofort erzwungen', async ({ page }) => {
    await gotoCalculator(page);
    
    // Setze ungültigen Wert über Maximum
    await page.fill('#dauer', '60');
    
    // Wert sollte auf 42 korrigiert sein (mit Timeout für Auto-Korrektur)
    await expect(page.locator('#dauer')).toHaveValue('42', { timeout: 2000 });
  });
});

test.describe('Mobile Validation: Wochenstunden', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });
  
  test('Mobile: Minimum 10 Stunden wird erzwungen', async ({ page }) => {
    await gotoCalculator(page);
    
    // Setze ungültigen Wert
    await page.fill('#stunden', '5');
    await clickButton(page, '#dauer');
    
    // Wert sollte auf 10 korrigiert sein (mit Timeout für blur-Validierung)
    await expect(page.locator('#stunden')).toHaveValue('10', { timeout: 2000 });
    
    // Fehlermeldung sollte angezeigt werden
    await expect(page.locator('#errorRegularStunden')).toContainText('mindestens 10 Stunden');
  });

  test('Mobile: Maximum 48 Stunden wird sofort erzwungen', async ({ page }) => {
    await gotoCalculator(page);
    
    // Setze ungültigen Wert über Maximum
    await page.fill('#stunden', '60');
    
    // Wert sollte auf 48 korrigiert sein (mit Timeout für Auto-Korrektur)
    await expect(page.locator('#stunden')).toHaveValue('48', { timeout: 2000 });
  });
});

test.describe('Mobile Validation: Teilzeit-Prozent', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });
  
  test('Mobile: Minimum 50% wird erzwungen bei manueller Eingabe', async ({ page }) => {
    await gotoCalculator(page);
    
    // Aktiviere Teilzeit-Feld über Preset-Button
    await clickButton(page, '[data-value="75"][data-type="percent"]');
    
    // Setze ungültigen Wert
    await page.fill('#teilzeitProzent', '30');
    await clickButton(page, '#dauer');
    
    // Wert sollte auf 50 korrigiert sein (mit Timeout für blur-Validierung)
    await expect(page.locator('#teilzeitProzent')).toHaveValue('50', { timeout: 2000 });
    
    // Fehlermeldung sollte angezeigt werden
    await expect(page.locator('#errorProzent')).toContainText('mindestens 50%');
  });

  test('Mobile: Maximum 100% wird erzwungen', async ({ page }) => {
    await gotoCalculator(page);
    
    // Aktiviere Teilzeit-Feld
    await clickButton(page, '[data-value="75"][data-type="percent"]');
    
    // Setze ungültigen Wert
    await page.fill('#teilzeitProzent', '150');
    
    // Wert sollte auf 100 korrigiert sein (mit Timeout für Auto-Korrektur)
    await expect(page.locator('#teilzeitProzent')).toHaveValue('100', { timeout: 2000 });
  });
});

test.describe('Mobile Validation: Fehler verschwinden nach 4 Sekunden', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });
  
  test('Mobile: Fehlermeldung verschwindet automatisch', async ({ page }) => {
    await gotoCalculator(page);
    
    // Trigger error by setting invalid value
    await page.fill('#dauer', '10');
    await clickButton(page, '#stunden');
    
    // Error should be visible
    await expect(page.locator('#errorDauer')).toBeVisible();
    
    // Wait for error to disappear automatically (4 seconds in code + 2s buffer)
    await expect(page.locator('#errorDauer')).toBeHidden({ timeout: 6000 });
  });
});

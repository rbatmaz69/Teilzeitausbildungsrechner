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
 */
async function gotoCalculator(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('lang', 'de'));
  await page.reload();
  
  // Warte bis Seite komplett geladen ist
  await page.waitForLoadState('networkidle');
  
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
    
    // Warte kurz (Validierung läuft)
    await page.waitForTimeout(100);
    
    // Wert sollte auf 42 korrigiert sein
    await expect(page.locator('#dauer')).toHaveValue('42');
    
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
    await page.waitForTimeout(100);
    
    // Korrigiert auf 48
    await expect(page.locator('#stunden')).toHaveValue('48');
    await expect(page.locator('#errorRegularStunden')).toContainText('maximal 48 Stunden');
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
    await page.waitForTimeout(100);
    
    // Sollte auf 100 korrigiert sein
    await expect(page.locator('#teilzeitProzent')).toHaveValue('100');
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
    
    // Warte 5 Sekunden (4s + 0.5s fade)
    await page.waitForTimeout(5000);
    
    // Fehler sollte verschwunden sein
    await expect(page.locator('#errorDauer')).toBeEmpty();
  });
});

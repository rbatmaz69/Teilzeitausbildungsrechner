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
  
  test('Teilzeit 75%: (36 Monate * 100/75) = 48 Monate', async ({ page }) => {
    await gotoCalculator(page);
    
    // Eingaben: 36 Monate, 40h
    // 75% Button klicken
    await clickButton(page, '[data-value="75"][data-type="percent"]');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 36 * (100/75) = 48 Monate
    await expect(page.locator('#res-total-months')).toContainText('48');
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
  
  test('30 von 40 Stunden = 75%', async ({ page }) => {
    await gotoCalculator(page);
    
    // Teilzeit-Stunden direkt eingeben: 30 Stunden
    await page.fill('#teilzeitStunden', '30');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 30h von 40h = 75% → 36 * (100/75) = 48 Monate
    await expect(page.locator('#res-total-months')).toContainText('48');
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
    
    // Wechsle zu Englisch
    await page.selectOption('#lang-switcher', 'en');
    
    // Warte kurz auf Übersetzung
    await page.waitForTimeout(500);
    
    // Prüfe englische Überschrift
    await expect(page.locator('.startseite-title-accent').first()).toContainText('part-time training');
  });
});

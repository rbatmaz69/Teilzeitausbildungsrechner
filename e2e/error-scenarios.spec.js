import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Error Scenarios
 * 
 * Diese Tests prüfen Fehlerszenarien und Edge Cases:
 * - API-Fehler (500, 422)
 * - Ungültige Kombinationen
 * - Grenzfälle (z.B. Teilzeit 50% mit Verkürzung)
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

test.describe('Error Handling: API Fehler', () => {
  
  test('Anzeige wenn Backend nicht erreichbar', async ({ page }) => {
    // Mock: API-Request abfangen und Fehler zurückgeben
    await page.route('**/api/calculate', route => {
      route.abort('failed');
    });
    
    await gotoCalculator(page);
    
    // Formular ausfüllen - Vollzeit mit Standardwerten
    await page.fill('#dauer', '36');
    
    // Berechnen-Button sollte disabled sein wenn keine Verkürzung gewählt
    // Wähle eine Verkürzung aus Dropdown
    await page.selectOption('#vk-school-select', 'abitur');
    
    // Klicke Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Button sollte wieder enabled sein nach Fehler
    await expect(page.locator('#berechnenBtn')).toBeEnabled({ timeout: 3000 });
  });
});

test.describe('Edge Cases: Grenzwerte', () => {
  
  test('Teilzeit 50% mit Verkürzung ergibt max 1.5x Regel', async ({ page }) => {
    await gotoCalculator(page);
    
    // Minimale Dauer 24 Monate
    await page.fill('#dauer', '24');
    
    // Explizit 50% über Button setzen
    await clickButton(page, '[data-type="percent"][data-value="50"]');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Warte auf Ergebnis
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Ergebnis: 24 * 2 = 48, aber max 1.5x Obergrenze = 24 * 1.5 = 36 Monate
    await expect(page.locator('#res-total-months')).toContainText('36');
  });

  test('Maximum Dauer 42 mit minimum Teilzeit 50%', async ({ page }) => {
    await gotoCalculator(page);
    
    // Maximum Dauer
    await page.fill('#dauer', '42');
    
    // Minimum Teilzeit 50% über Button setzen
    await clickButton(page, '[data-type="percent"][data-value="50"]');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Warte auf Ergebnis
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Ergebnis: 42 * 2 = 84, aber max 1.5x Obergrenze = 42 * 1.5 = 63 Monate
    await expect(page.locator('#res-total-months')).toContainText('63');
  });

  test('Alle Verkürzungsgründe kombiniert mit 50% Teilzeit (1.5x Obergrenze)', async ({ page }) => {
    await gotoCalculator(page);
    
    // Standard Dauer 36, Vollzeit (40h Standardwert)
    await page.fill('#dauer', '36');
    
    // 50% Teilzeit setzen
    await clickButton(page, '[data-type="percent"][data-value="50"]');
    
    // Alle Verkürzungen aktivieren (max 12M → 36 - 12 = 24M)
    // 1. Abitur aus Dropdown
    await page.selectOption('#vk-school-select', 'abitur');
    // 2. Familie/Pflegeverantwortung
    await page.check('[data-vk-field="familien_pflegeverantwortung"]');
    // 3. Berufliche Vorkenntnisse
    await page.check('[data-vk-field="vorkenntnisse_monate"]');
    // 4. Alter über 21
    await page.check('[data-vk-field="alter_ueber_21"]');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 24M * 2 = 48M, aber max 1.5x Obergrenze = 36M * 1.5 = 54M (Bezug ist Original-Dauer 36M!)
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#res-total-months')).toContainText('48');
  });
});

test.describe('Business Rules: Verkürzungen', () => {
  
  test('Maximale Verkürzung 12 Monate: Nur Abitur (Dropdown)', async ({ page }) => {
    await gotoCalculator(page);
    
    // Basis-Dauer 36 Monate
    await page.fill('#dauer', '36');
    
    // Abitur (12M Verkürzung)
    await page.selectOption('#vk-school-select', 'abitur');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 36 - 12 = 24 Monate mit 75% Teilzeit → 32 Monate
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#res-total-months')).toContainText('32');
  });

  test('Verkürzung mit einzelner Checkbox: Familie/Pflege', async ({ page }) => {
    await gotoCalculator(page);
    
    // Basis-Dauer 36 Monate, Vollzeit
    await page.fill('#dauer', '36');
    await page.fill('#teilzeitProzent', '100');
    
    // Nur Familie/Pflege aktivieren
    await page.check('[data-vk-field="familien_pflegeverantwortung"]');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: Familie/Pflege gibt 12 Monate Verkürzung
    // 36 - 12 = 24 Monate Vollzeit
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#res-total-months')).toContainText('24');
  });

  test('Verkürzung mit einzelner Checkbox: Alter über 21', async ({ page }) => {
    await gotoCalculator(page);
    
    // Basis-Dauer 36 Monate, Vollzeit
    await page.fill('#dauer', '36');
    await page.fill('#teilzeitProzent', '100');
    
    // Nur Alter über 21 aktivieren
    await page.check('[data-vk-field="alter_ueber_21"]');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: Alter 21+ gibt 12 Monate Verkürzung
    // 36 - 12 = 24 Monate Vollzeit
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#res-total-months')).toContainText('24');
  });

  test('Realschule (Dropdown) + Vorkenntnisse (Checkbox)', async ({ page }) => {
    await gotoCalculator(page);
    
    // Basis-Dauer 36 Monate
    await page.fill('#dauer', '36');
    
    // Realschule (6M) + Vorkenntnisse (12M) = 18M, max ist aber 12M
    await page.selectOption('#vk-school-select', 'realschule');
    await page.check('[data-vk-field="vorkenntnisse_monate"]');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 36 - 12 (max) = 24 mit 75% → 32 Monate
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#res-total-months')).toContainText('32');
  });

  test('Maximale Verkürzung 12 Monate: Alle Checkbox-Gründe kombiniert', async ({ page }) => {
    await gotoCalculator(page);
    
    // Basis-Dauer 36 Monate (Vollzeit ist Standard 75%)
    await page.fill('#dauer', '36');
    
    // Alle Verkürzungen (würde 12+12+12 = 36M ergeben, max ist aber 12M)
    await page.selectOption('#vk-school-select', 'abitur');
    await page.check('[data-vk-field="familien_pflegeverantwortung"]');
    await page.check('[data-vk-field="vorkenntnisse_monate"]');
    await page.check('[data-vk-field="alter_ueber_21"]');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 36 - 12 (max) = 24 Monate mit 75% Teilzeit → 32 Monate
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#res-total-months')).toContainText('32');
  });

  test('Mindestdauer 24 Monate wird eingehalten (keine Verkürzung)', async ({ page }) => {
    await gotoCalculator(page);
    
    // Minimale Basis-Dauer 24 Monate mit Standard 75% Teilzeit
    await page.fill('#dauer', '24');
    
    // Keine Verkürzung ausgewählt - Dropdown bleibt auf "none"
    // Keine Checkboxen aktiviert
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 24M mit 75% → 32 Monate
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#res-total-months')).toContainText('32');
  });

  test('Regel § 8 Abs. 3 BBiG: Dauer ≤ Original+6M → Original verwenden', async ({ page }) => {
    await gotoCalculator(page);
    
    // 36 Monate mit 95% Teilzeit (sollte ~38M ergeben, aber <42M)
    await page.fill('#dauer', '36');
    await page.fill('#teilzeitProzent', '95');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 36 / 0.95 = 37.89 → 37M, aber durch § 8 Abs. 3 auf 36M begrenzt
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#res-total-months')).toContainText('36');
  });
});

test.describe('Edge Cases: Teilzeit-Grenzwerte', () => {
  
  test('51% Teilzeit (knapp über Minimum)', async ({ page }) => {
    await gotoCalculator(page);
    
    // 36 Monate mit 51% Teilzeit
    await page.fill('#dauer', '36');
    await page.fill('#teilzeitProzent', '51');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 36 / 0.51 ≈ 70.5 → 70 Monate (abgerundet)
    // ABER: max 1.5x = 54M
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#res-total-months')).toContainText('54');
  });

  test('99% Teilzeit (knapp unter Maximum)', async ({ page }) => {
    await gotoCalculator(page);
    
    // 36 Monate mit 99% Teilzeit
    await page.fill('#dauer', '36');
    await page.fill('#teilzeitProzent', '99');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Ergebnis: 36 / 0.99 ≈ 36.36 → 36 Monate (abgerundet)
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#res-total-months')).toContainText('36');
  });
});

test.describe('Input Validation: Ungültige Zeichen', () => {
  
  test('Zahlenfeld akzeptiert nur numerische Werte', async ({ page }) => {
    await gotoCalculator(page);
    
    // Prüfe dass type="number" gesetzt ist
    const inputType = await page.getAttribute('#dauer', 'type');
    expect(inputType).toBe('number');
    
    // Aktueller Wert sollte numerisch sein
    const value = await page.inputValue('#dauer');
    expect(value).toMatch(/^\d+$/); // Nur Zahlen
    expect(parseInt(value)).toBeGreaterThanOrEqual(24);
  });
});

test.describe('Error Scenarios: English Language Tests', () => {
  
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
  
  test('Part-time 50% with shortening in English', async ({ page }) => {
    await gotoCalculatorEnglish(page);
    
    // Set part-time to 50%
    await page.click('[data-value="50"][data-type="percent"]');
    
    // Add Abitur shortening
    await page.selectOption('#vk-school-select', 'abitur');
    
    // Calculate
    await clickButton(page, '#berechnenBtn');
    
    // Wait for result
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Check: (36 - 12) * 100/50 = 48 months
    // Note: Shortening is applied BEFORE part-time multiplication
    await expect(page.locator('#res-total-months')).toContainText('48');
  });
});

// ============================================================================
// MOBILE ERROR SCENARIOS TESTS
// ============================================================================

test.describe('Mobile: Edge Cases Grenzwerte', () => {
  
  test.beforeEach(async ({ page }) => {
    // iPhone 13 viewport
    await page.setViewportSize({ width: 390, height: 844 });
  });
  
  test('Mobile: Teilzeit 50% mit Verkürzung ergibt max 1.5x Regel', async ({ page }) => {
    await gotoCalculator(page);
    
    // Minimale Dauer 24 Monate
    await page.fill('#dauer', '24');
    
    // Explizit 50% über Button setzen
    await clickButton(page, '[data-type="percent"][data-value="50"]');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Warte auf Ergebnis
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Ergebnis: 24 * 2 = 48, aber max 1.5x Obergrenze = 24 * 1.5 = 36 Monate
    await expect(page.locator('#res-total-months')).toContainText('36');
  });

  test('Mobile: Maximum Dauer 42 mit minimum Teilzeit 50%', async ({ page }) => {
    await gotoCalculator(page);
    
    // Maximum Dauer
    await page.fill('#dauer', '42');
    
    // Minimum Teilzeit 50% über Button setzen
    await clickButton(page, '[data-type="percent"][data-value="50"]');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Warte auf Ergebnis
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Ergebnis: 42 * 2 = 84, aber max 1.5x Obergrenze = 42 * 1.5 = 63 Monate
    await expect(page.locator('#res-total-months')).toContainText('63');
  });

  test('Mobile: 51% Teilzeit (knapp über Minimum)', async ({ page }) => {
    await gotoCalculator(page);
    
    // Setze manuelle Prozente
    await clickButton(page, '[data-type="percent"][data-value="75"]');
    await page.fill('#teilzeitProzent', '51');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Warte auf Ergebnis
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Ergebnis: 36 / 0.51 ≈ 70.5 → 70 Monate (abgerundet)
    // ABER: max 1.5x = 54M
    await expect(page.locator('#res-total-months')).toContainText('54');
  });

  test('Mobile: 99% Teilzeit (knapp unter Maximum)', async ({ page }) => {
    await gotoCalculator(page);
    
    // Setze manuelle Prozente
    await clickButton(page, '[data-type="percent"][data-value="75"]');
    await page.fill('#teilzeitProzent', '99');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Warte auf Ergebnis
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Ergebnis: 36 / 0.99 ≈ 36.36 → 36 Monate (abgerundet)
    await expect(page.locator('#res-total-months')).toContainText('36');
  });
});

test.describe('Mobile: Business Rules Verkürzungen', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });
  
  test('Mobile: Maximale Verkürzung 12 Monate bei Abitur', async ({ page }) => {
    await gotoCalculator(page);
    
    // Vollzeit 100% (sonst ist Default 75%)
    await page.fill('#teilzeitProzent', '100');
    
    // Wähle Abitur (12 Monate)
    await page.selectOption('#vk-school-select', 'abitur');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Warte auf Ergebnis
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Ergebnis: 36 - 12 = 24 Monate
    await expect(page.locator('#res-total-months')).toContainText('24');
  });

  test('Mobile: Teilzeit 75% mit Abitur: (36-12) * 100/75 = 32 Monate', async ({ page }) => {
    await gotoCalculator(page);
    
    // Teilzeit 75% über Preset-Button
    await clickButton(page, '[data-type="percent"][data-value="75"]');
    
    // Wähle Abitur (12 Monate)
    await page.selectOption('#vk-school-select', 'abitur');
    
    // Berechnen
    await clickButton(page, '#berechnenBtn');
    
    // Warte auf Ergebnis
    await page.waitForSelector('#ergebnis-container:not([hidden])', { state: 'visible', timeout: 5000 });
    
    // Ergebnis: (36 - 12) * 100/75 = 24 * 1.33... = 32 Monate
    await expect(page.locator('#res-total-months')).toContainText('32');
  });
});

(function(){
  const toggle = document.getElementById('a11y-toggle');
  const menu = document.getElementById('a11y-menu');
  const readToggle = document.getElementById('a11y-read-toggle');
  const easyLanguageToggle = document.getElementById('a11y-easy-language-toggle');
  const decBtn = document.getElementById('a11y-decrease');
  const resetBtn = document.getElementById('a11y-reset');
  const incBtn = document.getElementById('a11y-increase');
  const MIN_FONT = 12;
  const MAX_FONT = 28;
  // discrete levels: -3..+3 per request
  const MIN_LEVEL = -3;
  const MAX_LEVEL = 3;
  const STEP_PX = 2; // each level changes base by 2px
  // adjust root font-size so rem-based text scales with A-/A+
  const rootEl = document.documentElement;
  const DEFAULT_ROOT_FONT = parseFloat(getComputedStyle(rootEl).fontSize) || 16;
  let currentLevel = 0; // 0 = default
  let currentRootPx = DEFAULT_ROOT_FONT;

  // ==========================================
  // THEME (DARK MODE) MANAGEMENT
  // ==========================================
  const THEME_KEY = 'theme';
  const themeSlider = document.getElementById('a11y-theme-slider');
  const statusRegion = document.getElementById('a11y-status');

  // ==========================================
  // SCREEN READER ANNOUNCEMENTS
  // ==========================================
  function announceToScreenReader(message) {
    if (!statusRegion) return;
    // Clear first to ensure announcement is triggered even for repeated messages
    statusRegion.textContent = '';
    setTimeout(() => {
      statusRegion.textContent = message;
    }, 100);
  }

  function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function applyTheme(theme) {
    let effectiveTheme = theme;
    if (theme === 'auto') {
      effectiveTheme = getSystemTheme();
    }
    
    if (effectiveTheme === 'dark') {
      rootEl.setAttribute('data-theme', 'dark');
    } else {
      rootEl.removeAttribute('data-theme');
    }
    
    // Update slider position and ARIA
    if (themeSlider) {
      const position = theme === 'light' ? 0 : theme === 'auto' ? 1 : 2;
      const labels = { 'light': 'Hell', 'auto': 'Auto', 'dark': 'Dunkel' };
      themeSlider.setAttribute('aria-valuenow', position);
      themeSlider.setAttribute('aria-valuetext', labels[theme]);
      themeSlider.setAttribute('data-theme', theme);
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      console.warn('Could not save theme preference:', e);
    }
  }

  function loadTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || 'auto';
    } catch (e) {
      console.warn('Could not load theme preference:', e);
      return 'auto';
    }
  }

  function setTheme(theme) {
    console.log('Setting theme to:', theme);
    saveTheme(theme);
    applyTheme(theme);
    
    // Announce theme change to screen readers
    const themeNames = { 'light': 'Helles Design', 'auto': 'Automatisches Design', 'dark': 'Dunkles Design' };
    announceToScreenReader(themeNames[theme] + ' aktiviert');
  }

  // Initialize theme on page load
  const savedTheme = loadTheme();
  console.log('Loaded theme:', savedTheme);
  console.log('Theme slider:', themeSlider);
  applyTheme(savedTheme);

  // Theme slider interaction handlers
  if (themeSlider) {
    // Click on slider options
    const options = themeSlider.querySelectorAll('.a11y-theme-option');
    options.forEach(option => {
      option.addEventListener('click', () => {
        const theme = option.getAttribute('data-theme');
        setTheme(theme);
      });
    });
    
    // Keyboard navigation
    themeSlider.addEventListener('keydown', (e) => {
      const currentTheme = loadTheme();
      const themes = ['light', 'auto', 'dark'];
      const currentIndex = themes.indexOf(currentTheme);
      
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        const newIndex = Math.max(0, currentIndex - 1);
        setTheme(themes[newIndex]);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        const newIndex = Math.min(2, currentIndex + 1);
        setTheme(themes[newIndex]);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setTheme('light');
      } else if (e.key === 'End') {
        e.preventDefault();
        setTheme('dark');
      }
    });
  }

  // Listen for system theme changes when in auto mode
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const currentTheme = loadTheme();
      if (currentTheme === 'auto') {
        applyTheme('auto');
      }
    });
  }

  // ==========================================
  // MENU MANAGEMENT
  // ==========================================
  const iconDefault = document.getElementById('a11y-icon-default');
  const iconClose = document.getElementById('a11y-icon-close');

  function isEasyLanguageSupportedForCurrentLang() {
    return true;
  }

  function updateToggleIcon(isOpen) {
    if (!iconDefault || !iconClose) return;
    
    if (isOpen) {
      // Rotate out default icon and rotate in close icon
      iconDefault.style.display = 'none';
      iconClose.style.display = 'block';
      iconClose.style.animation = 'icon-rotate-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    } else {
      // Rotate out close icon and rotate in default icon
      iconClose.style.display = 'none';
      iconDefault.style.display = 'block';
      iconDefault.style.animation = 'icon-rotate-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    }
  }

  function updateAriaLabel(isOpen) {
    if (!toggle) return;
    const key = isOpen ? 'a11y.buttonAriaExpanded' : 'a11y.buttonAria';
    const label = window.I18N && window.I18N.t ? window.I18N.t(key) : (isOpen ? 'Barrierefreiheitsmenü schließen' : 'Barrierefreiheitsmenü öffnen');
    toggle.setAttribute('aria-label', label);
  }

  // Focus trap management
  let focusableElements = [];
  let firstFocusable = null;
  let lastFocusable = null;

  function updateFocusableElements() {
    if (!menu) return;
    // Get all focusable elements within the menu
    focusableElements = Array.from(menu.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), [tabindex="0"]:not([disabled])'
    ));
    firstFocusable = focusableElements[0];
    lastFocusable = focusableElements[focusableElements.length - 1];
  }

  function handleMenuKeydown(e) {
    // Only handle Tab when menu is open
    if (menu.getAttribute('aria-hidden') === 'true') return;

    if (e.key === 'Tab') {
      // Trap focus within menu
      if (e.shiftKey) {
        // Shift+Tab: moving backwards
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    }
  }

  function openMenu(){
    toggle.setAttribute('aria-expanded','true');
    menu.setAttribute('aria-hidden','false');
    updateToggleIcon(true);
    updateAriaLabel(true);
    
    // Update focusable elements and focus first one
    updateFocusableElements();
    setTimeout(() => {
      if (readToggle) readToggle.focus();
    }, 50);
  }
  
  function closeMenu(){
    toggle.setAttribute('aria-expanded','false');
    menu.setAttribute('aria-hidden','true');
    updateToggleIcon(false);
    updateAriaLabel(false);
    if(toggle) toggle.focus();
  }

  if(toggle) toggle.addEventListener('click', function() {
    const isOpen = menu.getAttribute('aria-hidden') === 'false';
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Handle Escape and Tab keys
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && menu && menu.getAttribute('aria-hidden') === 'false'){
      closeMenu();
    }
    // Handle Tab/Shift+Tab for focus trap
    handleMenuKeydown(e);
  });

  // ==========================================
  // EASY LANGUAGE (LEICHTE SPRACHE) TOGGLE
  // ==========================================
  const EASY_LANGUAGE_KEY = 'easyLanguage';

  function loadEasyLanguage() {
    try {
      return localStorage.getItem(EASY_LANGUAGE_KEY) === 'true';
    } catch (e) {
      console.warn('Could not load easy language preference:', e);
      return false;
    }
  }

  function saveEasyLanguage(enabled) {
    try {
      localStorage.setItem(EASY_LANGUAGE_KEY, enabled ? 'true' : 'false');
    } catch (e) {
      console.warn('Could not save easy language preference:', e);
    }
  }

  function applyEasyLanguage(enabled) {
    if (enabled) {
      rootEl.setAttribute('data-easy-language', 'true');
    } else {
      rootEl.removeAttribute('data-easy-language');
    }
    
    if (easyLanguageToggle) {
      easyLanguageToggle.checked = enabled;
      easyLanguageToggle.setAttribute('aria-checked', enabled ? 'true' : 'false');
    }
  }

  function toggleEasyLanguage() {
    if (!isEasyLanguageSupportedForCurrentLang()) return;
    const currentState = loadEasyLanguage();
    const newState = !currentState;
    saveEasyLanguage(newState);
    applyEasyLanguage(newState);

    // Announce to screen readers
    announceToScreenReader(newState ? 'Leichte Sprache aktiviert' : 'Leichte Sprache deaktiviert');

    window.dispatchEvent(new CustomEvent('easyLanguage:changed', {
      detail: { enabled: newState }
    }));
  }

  function setEasyLanguageButtonEnabled(isGerman) {
    if (!easyLanguageToggle) return;
    if (isGerman) {
      easyLanguageToggle.removeAttribute('disabled');
      easyLanguageToggle.parentElement.style.opacity = '1';
      easyLanguageToggle.parentElement.style.cursor = 'pointer';
    } else {
      easyLanguageToggle.setAttribute('disabled', 'true');
      easyLanguageToggle.checked = false;
      easyLanguageToggle.parentElement.style.opacity = '0.5';
      easyLanguageToggle.parentElement.style.cursor = 'not-allowed';
    }
  }

  function syncEasyLanguageForCurrentLang() {
    const supported = isEasyLanguageSupportedForCurrentLang();
    setEasyLanguageButtonEnabled(supported);

    if (!supported) {
      // Leichte Sprache ist nur für Deutsch: erzwinge „aus“ ohne die gespeicherte Präferenz zu löschen.
      const wasEnabled = rootEl.getAttribute('data-easy-language') === 'true';
      applyEasyLanguage(false);
      if (wasEnabled) {
        window.dispatchEvent(new CustomEvent('easyLanguage:changed', {
          detail: { enabled: false }
        }));
      }
      return;
    }

    // Deutsch: wende gespeicherte Präferenz an
    const saved = loadEasyLanguage();
    applyEasyLanguage(saved);
  }

  // Initialize easy language on page load (Deutsch only; refresh when i18n finished)
  syncEasyLanguageForCurrentLang();

  // Easy language button click handler
  if (easyLanguageToggle) {
    easyLanguageToggle.addEventListener('change', () => {
      toggleEasyLanguage();
    });
    
    // Enable Enter key for toggle activation
    easyLanguageToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        easyLanguageToggle.click();
      }
    });
  }

  // Wenn sich die Sprache ändert: Toggle aktivieren/deaktivieren und Zustand anwenden
  window.addEventListener('i18n:changed', () => {
    syncEasyLanguageForCurrentLang();
    // i18n rendert im Handler in script_Sprache_Auswaehlen.js bei easyLanguage:changed neu.
    if (isEasyLanguageSupportedForCurrentLang()) {
      window.dispatchEvent(new CustomEvent('easyLanguage:changed', {
        detail: { enabled: rootEl.getAttribute('data-easy-language') === 'true' }
      }));
    }
  });

  // Speech (Web Speech API) — collect visible text, exclude calendar images, read once
  let synth = window.speechSynthesis;
  let utterance = null;
  let isSpeaking = false;
  let lastUtteranceText = '';
  let lastStopTime = 0;

  function stopSpeaking(){
    if(synth && synth.speaking){
      synth.cancel();
    }
    isSpeaking = false;
    if(readToggle){
      readToggle.checked = false;
      readToggle.setAttribute('aria-checked', 'false');
    }
  }

  function startSpeaking(){
    // Prevent double-start
    if(isSpeaking) return;

    // Cooldown: avoid immediately restarting same text
    const now = Date.now();
    if(lastUtteranceText && now - lastStopTime < 2000){
      console.debug('a11y: blocked start due to recent stop');
      return;
    }

    // Use the full document body so the whole current page is read
    const container = document.body;

    const isVisible = (el) => {
      if(!el) return false;
      if(el.nodeType === Node.TEXT_NODE) return isVisible(el.parentElement);
      if(el.nodeType !== Node.ELEMENT_NODE) return false;
      const style = window.getComputedStyle(el);
      if(style.display === 'none' || style.visibility === 'hidden') return false;
      if(el.hasAttribute && el.hasAttribute('aria-hidden')) return false;
      if(el.classList && el.classList.contains('sr-only')) return false;
      const rects = el.getClientRects();
      if(!rects || rects.length === 0) return false;
      return true;
    };

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null);
    const parts = [];
    const EXCLUDE_ANCESTOR_SELECTORS = ['.calendar-visualization', '.calendar-device', '.calendar-screen', '.calendar-days'];

    while(walker.nextNode()){
      const node = walker.currentNode;
      if(node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SELECT'){
        const opt = node.options && node.options[node.selectedIndex];
        if(opt && isVisible(node)) parts.push(String(opt.textContent || opt.innerText || '').trim());
        continue;
      }
      if(node.nodeType === Node.TEXT_NODE){
        const parent = node.parentElement;
        if(!parent) continue;
        let skip = false;
        for(const sel of EXCLUDE_ANCESTOR_SELECTORS){
          if(parent.closest && parent.closest(sel)){ skip = true; break; }
        }
        if(skip) continue;
        if(!isVisible(parent)) continue;
        const txt = String(node.nodeValue || '').replace(/\s+/g,' ').trim();
        if(txt) parts.push(txt);
      }
    }

    let text = parts.join(' ').replace(/\s+/g,' ').trim();

    const MAX_CHARS = 20000;
    if(text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

    utterance = new SpeechSynthesisUtterance(text);
    lastUtteranceText = text;
    utterance.lang = document.documentElement.lang || 'de-DE';
    utterance.rate = 1;
    utterance.onend = ()=>{
      isSpeaking = false;
      lastStopTime = Date.now();
      stopSpeaking();
      console.debug('a11y: utterance ended');
    };
    utterance.onerror = ()=>{
      isSpeaking = false;
      lastStopTime = Date.now();
      stopSpeaking();
      console.debug('a11y: utterance error');
    };

    if(synth && synth.speaking) synth.cancel();
    synth.speak(utterance);
    if(readToggle){
      readToggle.checked = true;
      readToggle.setAttribute('aria-checked', 'true');
    }
    isSpeaking = true;
    announceToScreenReader('Vorlesefunktion aktiviert');
  }

  if(readToggle){
    readToggle.addEventListener('change', ()=>{
      if(readToggle.checked){
        startSpeaking();
      } else {
        stopSpeaking();
        announceToScreenReader('Vorlesefunktion deaktiviert');
      }
    });
    
    // Enable Enter key for toggle activation
    readToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        readToggle.click();
      }
    });
  }

  // Font size
  function applyZoomForLevel(level){
    // clamp level
    if(level < MIN_LEVEL) level = MIN_LEVEL;
    if(level > MAX_LEVEL) level = MAX_LEVEL;
    const nextPx = DEFAULT_ROOT_FONT + (level * STEP_PX);
    const clampedPx = Math.min(Math.max(nextPx, MIN_FONT), MAX_FONT);
    rootEl.style.fontSize = clampedPx + 'px';
    currentRootPx = clampedPx;
    // Wenn MIN/MAX durch Clamping erreicht wurde, Level auf den effektiven Wert korrigieren,
    // damit Button-States und Anzeige zur tatsächlichen Schriftgröße passen.
    currentLevel = Math.round((clampedPx - DEFAULT_ROOT_FONT) / STEP_PX);
    updateStepLabels();
    updateFontButtonStates();
  }

  function updateFontButtonStates() {
    if (!decBtn || !incBtn) return;

    // nutze den effektiven Root-Font (wegen Clamping kann Level sonst „zu weit“ laufen)
    const px = typeof currentRootPx === 'number' ? currentRootPx : DEFAULT_ROOT_FONT;
    
    // Update decrease button
    if (px <= MIN_FONT + 0.01) {
      decBtn.setAttribute('aria-disabled', 'true');
      decBtn.disabled = true;
    } else {
      decBtn.removeAttribute('aria-disabled');
      decBtn.disabled = false;
    }
    
    // Update increase button
    if (px >= MAX_FONT - 0.01) {
      incBtn.setAttribute('aria-disabled', 'true');
      incBtn.disabled = true;
    } else {
      incBtn.removeAttribute('aria-disabled');
      incBtn.disabled = false;
    }
  }

  function updateStepLabels(){
    if(!decBtn || !incBtn) return;
    // update simple button labels
    decBtn.textContent = '−';
    incBtn.textContent = '+';
    // update the central level display
    const display = document.getElementById('a11y-level-display');
    if(display){
      display.textContent = String(currentLevel);
    }
  }


  if(decBtn) decBtn.addEventListener('click', ()=>{
    const next = Math.max(currentLevel - 1, MIN_LEVEL);
    if (next < currentLevel) {
      applyZoomForLevel(next);
      announceToScreenReader('Schriftgröße verringert');
    }
  });
  if(incBtn) incBtn.addEventListener('click', ()=>{
    const next = Math.min(currentLevel + 1, MAX_LEVEL);
    if (next > currentLevel) {
      applyZoomForLevel(next);
      announceToScreenReader('Schriftgröße vergrößert');
    }
  });
  if(resetBtn) resetBtn.addEventListener('click', ()=>{
    rootEl.style.fontSize = '';
    currentLevel = 0;
    currentRootPx = DEFAULT_ROOT_FONT;
    updateStepLabels();
    updateFontButtonStates();
    announceToScreenReader('Schriftgröße zurückgesetzt');
  });

  // initialize labels and button states
  updateStepLabels();
  updateFontButtonStates();

})();

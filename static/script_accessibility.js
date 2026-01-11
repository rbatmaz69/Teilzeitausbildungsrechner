(function(){
  const toggle = document.getElementById('a11y-toggle');
  const menu = document.getElementById('a11y-menu');
  const closeBtn = document.getElementById('a11y-close');
  const readToggle = document.getElementById('a11y-read-toggle');
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

  // ==========================================
  // THEME (DARK MODE) MANAGEMENT
  // ==========================================
  const THEME_KEY = 'theme';
  const themeLightBtn = document.getElementById('a11y-theme-light');
  const themeDarkBtn = document.getElementById('a11y-theme-dark');
  const themeAutoBtn = document.getElementById('a11y-theme-auto');

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
    
    // Update button states (aria-pressed)
    if (themeLightBtn) themeLightBtn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    if (themeDarkBtn) themeDarkBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    if (themeAutoBtn) themeAutoBtn.setAttribute('aria-pressed', theme === 'auto' ? 'true' : 'false');
    
    // Add active class for visual feedback
    [themeLightBtn, themeDarkBtn, themeAutoBtn].forEach(btn => {
      if (btn) btn.classList.remove('a11y-theme-active');
    });
    if (theme === 'light' && themeLightBtn) themeLightBtn.classList.add('a11y-theme-active');
    if (theme === 'dark' && themeDarkBtn) themeDarkBtn.classList.add('a11y-theme-active');
    if (theme === 'auto' && themeAutoBtn) themeAutoBtn.classList.add('a11y-theme-active');
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
      return localStorage.getItem(THEME_KEY) || 'light';
    } catch (e) {
      console.warn('Could not load theme preference:', e);
      return 'light';
    }
  }

  function setTheme(theme) {
    console.log('Setting theme to:', theme);
    saveTheme(theme);
    applyTheme(theme);
  }

  // Initialize theme on page load
  const savedTheme = loadTheme();
  console.log('Loaded theme:', savedTheme);
  console.log('Theme buttons:', {light: themeLightBtn, dark: themeDarkBtn, auto: themeAutoBtn});
  applyTheme(savedTheme);

  // Theme button click handlers
  if (themeLightBtn) {
    console.log('Adding click listener to light button');
    themeLightBtn.addEventListener('click', () => {
      console.log('Light button clicked');
      setTheme('light');
    });
  }
  if (themeDarkBtn) {
    console.log('Adding click listener to dark button');
    themeDarkBtn.addEventListener('click', () => {
      console.log('Dark button clicked');
      setTheme('dark');
    });
  }
  if (themeAutoBtn) {
    console.log('Adding click listener to auto button');
    themeAutoBtn.addEventListener('click', () => {
      console.log('Auto button clicked');
      setTheme('auto');
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
  const easyLanguageBtn = document.getElementById('a11y-easy-language');

  function getCurrentLang() {
    if (window.I18N && typeof window.I18N.lang === 'string') return window.I18N.lang;
    return document.documentElement.getAttribute('lang') || 'de';
  }

  function isEasyLanguageSupportedForCurrentLang() {
    return getCurrentLang() === 'de';
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

  function openMenu(){
    toggle.setAttribute('aria-expanded','true');
    menu.setAttribute('aria-hidden','false');
    updateToggleIcon(true);
    updateAriaLabel(true);
    setTimeout(()=>{ if(readBtn) readBtn.focus() },50);
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
  if(closeBtn) closeBtn.addEventListener('click', closeMenu);

  // Close on Escape
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && menu && menu.getAttribute('aria-hidden') === 'false'){
      closeMenu();
    }
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
    }
  }

  function toggleEasyLanguage() {
    if (!isEasyLanguageSupportedForCurrentLang()) return;
    const currentState = loadEasyLanguage();
    const newState = !currentState;
    saveEasyLanguage(newState);
    applyEasyLanguage(newState);

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
    }
    isSpeaking = true;
  }

  if(readToggle){
    readToggle.addEventListener('change', ()=>{
      if(readToggle.checked){
        startSpeaking();
      } else {
        stopSpeaking();
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
    currentLevel = level;
    updateStepLabels();
  }

  function updateStepLabels(){
    if(!decBtn || !incBtn) return;
    // update simple button labels (keep A- / A+)
    decBtn.textContent = 'A-';
    incBtn.textContent = 'A+';
    // update the central level display
    const display = document.getElementById('a11y-level-display');
    if(display){
      display.textContent = String(currentLevel);
    }
  }


  if(decBtn) decBtn.addEventListener('click', ()=>{
    const next = Math.max(currentLevel - 1, MIN_LEVEL);
    applyZoomForLevel(next);
  });
  if(incBtn) incBtn.addEventListener('click', ()=>{
    const next = Math.min(currentLevel + 1, MAX_LEVEL);
    applyZoomForLevel(next);
  });
  if(resetBtn) resetBtn.addEventListener('click', ()=>{
    rootEl.style.fontSize = '';
    currentLevel = 0;
    updateStepLabels();
  });

  // initialize labels
  updateStepLabels();
  

})();

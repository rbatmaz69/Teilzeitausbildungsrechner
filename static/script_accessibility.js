(function(){
  const toggle = document.getElementById('a11y-toggle');
  const menu = document.getElementById('a11y-menu');
  const closeBtn = document.getElementById('a11y-close');
  const readBtn = document.getElementById('a11y-read');
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
  function openMenu(){
    toggle.setAttribute('aria-expanded','true');
    toggle.style.display = 'none';
    menu.setAttribute('aria-hidden','false');
    setTimeout(()=>{ if(readBtn) readBtn.focus() },50);
  }
  function closeMenu(){
    toggle.setAttribute('aria-expanded','false');
    toggle.style.display = '';
    menu.setAttribute('aria-hidden','true');
    if(toggle) toggle.focus();
  }

  if(toggle) toggle.addEventListener('click', openMenu);
  if(closeBtn) closeBtn.addEventListener('click', closeMenu);

  // Close on Escape
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && menu && menu.getAttribute('aria-hidden') === 'false'){
      closeMenu();
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
    if(readBtn){
      const readLabel = window.I18N && window.I18N.t ? window.I18N.t('a11y.read','Vorlesen') : 'Vorlesen';
      readBtn.setAttribute('aria-pressed','false');
      readBtn.textContent = readLabel;
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
    if(readBtn){
      const stopLabel = window.I18N && window.I18N.t ? window.I18N.t('a11y.readStop','Vorlesen stoppen') : 'Vorlesen stoppen';
      readBtn.setAttribute('aria-pressed','true');
      readBtn.textContent = stopLabel;
    }
    isSpeaking = true;
  }

  if(readBtn){
    readBtn.addEventListener('click', ()=>{
      if(isSpeaking){
        stopSpeaking();
      } else {
        startSpeaking();
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

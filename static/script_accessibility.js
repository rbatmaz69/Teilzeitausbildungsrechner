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

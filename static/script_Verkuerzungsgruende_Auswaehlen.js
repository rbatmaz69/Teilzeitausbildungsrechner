import uebersetzung from '/static/script_Ergebnis_Uebersicht.js';

/**
 * Initialisiert die Verkürzungsgründe-Steuerung.
 *
 * Bindet Tooltips, sorgt für korrektes Checkbox-Verhalten und synchronisiert
 * die Anzeige der Vorkenntnis-Monate mit der aktuellen Sprache.
 */
document.addEventListener('DOMContentLoaded', () => {
  const alter = document.getElementById('alter');
  const kinderbetreuungJa = document.getElementById('kinderbetreuung-ja');
  const kinderbetreuungNein = document.getElementById('kinderbetreuung-nein');
  const pflegeJa = document.getElementById('pflege-ja');
  const pflegeNein = document.getElementById('pflege-nein');
  // Berufliche Qualifikationen
  const berufQ1Ja = document.getElementById('vk_beruf_q1_ja');
  const berufQ1Nein = document.getElementById('vk_beruf_q1_nein');
  const berufQ2Ja = document.getElementById('vk_beruf_q2_ja');
  const berufQ2Nein = document.getElementById('vk_beruf_q2_nein');
  const berufQ2Duration = document.getElementById('vk_beruf_q2_dauer_months');
  const berufQ2DurationContainer = document.getElementById('vk_beruf_q2_duration_container');
  const berufQ3Ja = document.getElementById('vk_beruf_q3_ja');
  const berufQ3Nein = document.getElementById('vk_beruf_q3_nein');
  const berufQ4Ja = document.getElementById('vk_beruf_q4_ja');
  const berufQ4Nein = document.getElementById('vk_beruf_q4_nein');
  const berufQ5Ja = document.getElementById('vk_beruf_q5_ja');
  const berufQ5Nein = document.getElementById('vk_beruf_q5_nein');
  const berufQ6Ja = document.getElementById('vk_beruf_q6_ja');
  const berufQ6Nein = document.getElementById('vk_beruf_q6_nein');

  /* ========== Tooltips (touch-optimiert) ========== */
  document.querySelectorAll('.info-btn').forEach(schaltflaeche => {
    const kurzinfo = schaltflaeche.closest('.tile')?.querySelector('.tooltip');
    if (!kurzinfo) return;
    kurzinfo.textContent = schaltflaeche.dataset.tooltip || '';
    schaltflaeche.addEventListener('click', ereignis => {
      ereignis.preventDefault(); ereignis.stopPropagation();
      const geoeffnet = kurzinfo.classList.toggle('show');
      if (geoeffnet) {
        document.querySelectorAll('.tooltip').forEach(tooltip => { if (tooltip !== kurzinfo) tooltip.classList.remove('show'); });
        schaltflaeche.setAttribute('aria-expanded','true');
      } else {
        schaltflaeche.setAttribute('aria-expanded','false');
      }
    });
  });

  // Außerhalb klicken → Tooltips schließen
  document.body.addEventListener('click', ereignis => {
    if (!(ereignis.target instanceof Element) || !ereignis.target.classList.contains('info-btn')) {
      document.querySelectorAll('.tooltip').forEach(tooltip => tooltip.classList.remove('show'));
      document.querySelectorAll('.info-btn[aria-expanded="true"]').forEach(schaltflaeche => schaltflaeche.setAttribute('aria-expanded','false'));
    }
  })

  // Alter-Eingabe validieren
  const errorAlter = document.getElementById('errorAlter');
  let alterErrorTimeout = null;
  
  alter.addEventListener('keydown', (ev) => {
    const forbidden = ['e', 'E', '+', '-', '.', ','];
    if (forbidden.includes(ev.key)) ev.preventDefault();
  });
  
  alter.addEventListener('input', () => {
    let v = alter.value.replace(/[^0-9]/g, '');
    alter.value = v;
    
    // Max-Validierung sofort: Wenn > 99, auf 99 setzen und Fehler anzeigen
    const alterInt = parseInt(v);
    if (!isNaN(alterInt) && alterInt > 99) {
      alter.value = 99;
      alter.classList.add('error');
      if (errorAlter) errorAlter.textContent = uebersetzung("errors.alterMax", "Der Wert darf maximal 99 betragen");
      
      // Fehler nach 4 Sekunden entfernen
      clearTimeout(alterErrorTimeout);
      alterErrorTimeout = setTimeout(() => {
        alter.classList.remove('error');
        if (errorAlter) errorAlter.textContent = '';
      }, 4000);
    }
  });
  
  alter.addEventListener('blur', () => {
    const alterInt = parseInt(alter.value);

    if (isNaN(alterInt) || alterInt < 0) {
      alter.value = null;
    } else if (alterInt > 99) {
      alter.value = 99;
    }
  });

  // Ereignis-Listener für familiäre Verpflichtungen - Ja/Nein-Gruppen
  // Kinderbetreuung: Mutual exclusivity zwischen Ja und Nein
  if (kinderbetreuungJa && kinderbetreuungNein) {
    kinderbetreuungJa.addEventListener("change", () => {
      if (kinderbetreuungJa.checked) {
        kinderbetreuungNein.checked = false;
      }
    });
    
    kinderbetreuungNein.addEventListener("change", () => {
      if (kinderbetreuungNein.checked) {
        kinderbetreuungJa.checked = false;
      }
    });
  }

  // Pflege: Mutual exclusivity zwischen Ja und Nein
  if (pflegeJa && pflegeNein) {
    pflegeJa.addEventListener("change", () => {
      if (pflegeJa.checked) {
        pflegeNein.checked = false;
      }
    });
    
    pflegeNein.addEventListener("change", () => {
      if (pflegeNein.checked) {
        pflegeJa.checked = false;
      }
    });
  }

  // Berufliche Fragen: Mutual exclusivity & Q2 Duration show/hide
  function setupYesNo(jaEl, neinEl) {
    if (!jaEl || !neinEl) return;
    jaEl.addEventListener('change', () => {
      if (jaEl.checked) neinEl.checked = false;
    });
    neinEl.addEventListener('change', () => {
      if (neinEl.checked) jaEl.checked = false;
    });
  }

  setupYesNo(berufQ1Ja, berufQ1Nein);
  setupYesNo(berufQ2Ja, berufQ2Nein);
  setupYesNo(berufQ3Ja, berufQ3Nein);
  setupYesNo(berufQ4Ja, berufQ4Nein);
  setupYesNo(berufQ5Ja, berufQ5Nein);
  setupYesNo(berufQ6Ja, berufQ6Nein);

  // Show/Hide duration input for Q2
  if (berufQ2Ja && berufQ2DurationContainer && berufQ2Duration) {
    berufQ2Ja.addEventListener('change', () => {
      if (berufQ2Ja.checked) {
        berufQ2DurationContainer.style.display = 'block';
      } else {
        berufQ2DurationContainer.style.display = 'none';
        berufQ2Duration.value = '';
      }
    });
    berufQ2Nein && berufQ2Nein.addEventListener('change', () => {
      if (berufQ2Nein.checked) {
        berufQ2DurationContainer.style.display = 'none';
        berufQ2Duration.value = '';
      }
    });

    // Numeric input: block invalid keys
    berufQ2Duration.addEventListener('keydown', (ev) => {
      const forbidden = ['e', 'E', '+', '-'];
      if (forbidden.includes(ev.key)) ev.preventDefault();
    });
    
    const errorBerufQ2Dauer = document.getElementById('errorBerufQ2Dauer');
    let q2DauerErrorTimeout = null;
    
    berufQ2Duration.addEventListener('input', () => {
      let v = berufQ2Duration.value.replace(/[^0-9]/g, '');
      berufQ2Duration.value = v;
      
      // Max-Validierung sofort: Wenn > 50, auf 50 setzen und Fehler anzeigen
      const dauer = parseInt(v);
      if (!isNaN(dauer) && dauer > 50) {
        berufQ2Duration.value = 50;
        berufQ2Duration.classList.add('error');
        if (errorBerufQ2Dauer) errorBerufQ2Dauer.textContent = uebersetzung("errors.berufQ2DauerMax", "Der Wert darf maximal 50 Monate betragen");
        
        // Fehler nach 4 Sekunden entfernen
        clearTimeout(q2DauerErrorTimeout);
        q2DauerErrorTimeout = setTimeout(() => {
          berufQ2Duration.classList.remove('error');
          if (errorBerufQ2Dauer) errorBerufQ2Dauer.textContent = '';
        }, 4000);
      }
    });
  }

  /* ========== "Was ist das?" Modal ========== */
  const infoButton = document.getElementById('vk-info-btn');
  const infoModal = document.getElementById('vk-info-modal');
  const infoCloseButton = infoModal?.querySelector('.vk-info-close');
  const infoOverlay = infoModal?.querySelector('.vk-info-overlay');
  const infoContent = infoModal?.querySelector('.vk-info-content');
  let previousActiveElement = null;

  if (!infoButton || !infoModal) return;

  /**
   * Öffnet das Modal und setzt den Focus auf den ersten fokussierbaren Element.
   */
  function oeffneModal() {
    previousActiveElement = document.activeElement;
    infoModal.removeAttribute('hidden');
    document.body.classList.add('modal-open');
    
    // Focus auf den Close-Button setzen
    setTimeout(() => {
      infoCloseButton?.focus();
    }, 100);
  }

  /**
   * Schließt das Modal und gibt den Focus zurück.
   */
  function schliesseModal() {
    infoModal.setAttribute('hidden', '');
    document.body.classList.remove('modal-open');
    
    // Focus zurück auf den Button setzen
    if (previousActiveElement) {
      previousActiveElement.focus();
      previousActiveElement = null;
    }
  }

  /**
   * Prüft, ob ein Klick außerhalb des Modal-Contents war.
   */
  function istKlickAusserhalb(event) {
    return infoContent && !infoContent.contains(event.target);
  }

  // Button-Klick: Modal öffnen
  infoButton.addEventListener('click', (event) => {
    event.preventDefault();
    oeffneModal();
  });

  // Close-Button: Modal schließen
  infoCloseButton?.addEventListener('click', (event) => {
    event.preventDefault();
    schliesseModal();
  });

  // Overlay-Klick: Modal schließen
  infoOverlay?.addEventListener('click', (event) => {
    if (istKlickAusserhalb(event)) {
      schliesseModal();
    }
  });

  // Escape-Taste: Modal schließen
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !infoModal.hasAttribute('hidden')) {
      schliesseModal();
    }
  });

  // Focus-Trap: Verhindert, dass Focus außerhalb des Modals geht
  function handleTabKey(event) {
    if (infoModal.hasAttribute('hidden')) return;

    const focusableElements = infoModal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    }
  }

  infoModal.addEventListener('keydown', handleTabKey);
});

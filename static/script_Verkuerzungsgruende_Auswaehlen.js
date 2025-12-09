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
  alter.addEventListener('blur', () => {
    const alterInt = parseInt(alter.value);

    if (isNaN(alterInt) || alterInt < 0) {
      alter.value = null;
    } else if (alterInt > 100) {
      alter.value = null;
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

/**
 * Initialisiert die Verkürzungsgründe-Steuerung.
 *
 * Bindet Tooltips, sorgt für korrektes Checkbox-Verhalten und synchronisiert
 * die Anzeige der Vorkenntnis-Monate mit der aktuellen Sprache.
 */
document.addEventListener('DOMContentLoaded', () => {
  const alter = document.getElementById('alter');
  const kinder = document.getElementById('kinderbetreuung');
  const pflege = document.getElementById('pflege');
  const keineFamiliärenVerpflichtungen = document.getElementById('keineFamiliaerenVerpflichtungen');

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

  // Ereignis-Listener für familiäre Verpflichtungen
  kinder.addEventListener("change", familiaereVerpflichtungAusgewaehlt);
  pflege.addEventListener("change", familiaereVerpflichtungAusgewaehlt);

  keineFamiliärenVerpflichtungen.addEventListener("change", () => {
    if (keineFamiliärenVerpflichtungen.checked) {
      kinder.checked = false;
      pflege.checked = false;
    };
  })

  // Logik für familiäre Verpflichtungen
  function familiaereVerpflichtungAusgewaehlt() {
    if (kinder.checked || pflege.checked) {
      keineFamiliärenVerpflichtungen.checked = false;
    }
  }
});

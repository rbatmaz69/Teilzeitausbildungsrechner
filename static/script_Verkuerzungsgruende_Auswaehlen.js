/**
 * Initialisiert die Verkürzungsgründe-Steuerung.
 *
 * Bindet Tooltips, sorgt für korrektes Checkbox-Verhalten und synchronisiert
 * die Anzeige der Vorkenntnis-Monate mit der aktuellen Sprache.
 */
document.addEventListener('DOMContentLoaded', () => {
  const abiturKontrollkaestchen = document.getElementById('g-abitur');
  const realschuleKontrollkaestchen = document.getElementById('g-realschule');
  const vorkSchieberegler = document.getElementById('vork-slider');
  const vorkWert = document.getElementById('vork-wert');

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
  });

  // Exklusives Verhalten für Abitur- und Realschule-Checkboxen
  abiturKontrollkaestchen.addEventListener('change', () => {
    if (abiturKontrollkaestchen.checked) {
      realschuleKontrollkaestchen.checked = false;
    }
  });

  realschuleKontrollkaestchen.addEventListener('change', () => {
    if (realschuleKontrollkaestchen.checked) {
      abiturKontrollkaestchen.checked = false;
    }
  });

  vorkSchieberegler.addEventListener('input', () => {
    const monateBezeichnung = window.I18N?.t("units.months.full", "Monate") || "Monate";
    vorkWert.textContent = `${vorkSchieberegler.value} ${monateBezeichnung}`;
  });
});

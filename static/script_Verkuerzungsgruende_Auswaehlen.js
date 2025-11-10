document.addEventListener('DOMContentLoaded', () => {

  const abiturCheckbox = document.getElementById('g-abitur');
  const realschuleCheckbox = document.getElementById('g-realschule');
  const vorkSlider = document.getElementById('vork-slider');
  const vorkWert = document.getElementById('vork-wert');

  /* ========== Tooltips (touch-optimiert) ========== */
  document.querySelectorAll('.info-btn').forEach(btn => {
    const tooltip = btn.closest('.tile')?.querySelector('.tooltip');
    if (!tooltip) return;
    tooltip.textContent = btn.dataset.tooltip || '';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const open = tooltip.classList.toggle('show');
      if (open) {
        document.querySelectorAll('.tooltip').forEach(t => { if (t !== tooltip) t.classList.remove('show'); });
        btn.setAttribute('aria-expanded','true');
      } else {
        btn.setAttribute('aria-expanded','false');
      }
    });
  });

  // Außerhalb klicken → Tooltips schließen
  document.body.addEventListener('click', e => {
    if (!(e.target instanceof Element) || !e.target.classList.contains('info-btn')) {
      document.querySelectorAll('.tooltip').forEach(t => t.classList.remove('show'));
      document.querySelectorAll('.info-btn[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded','false'));
    }
  });

  // Exklusives Verhalten für Abitur- und Realschule-Checkboxen
  abiturCheckbox.addEventListener('change', () => {
    if (abiturCheckbox.checked) {
      realschuleCheckbox.checked = false;
    }
  });

  realschuleCheckbox.addEventListener('change', () => {
    if (realschuleCheckbox.checked) {
      abiturCheckbox.checked = false;
    }
  });

  vorkSlider.addEventListener('input', () => {
    const monthsLabel = window.I18N?.t("units.months.full", "Monate") || "Monate";
    vorkWert.textContent = `${vorkSlider.value} ${monthsLabel}`;
  });
});

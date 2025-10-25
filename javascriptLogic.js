document.addEventListener('DOMContentLoaded', () => {
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
});

// Alles erst starten, wenn das DOM bereit ist
document.addEventListener('DOMContentLoaded', () => {
  /* ========== Tooltips (touch-optimiert) ========== */
  document.querySelectorAll('.info-btn').forEach(btn => {
    const tooltip = btn.closest('.tile').querySelector('.tooltip');
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

  document.body.addEventListener('click', e => {
    if (!e.target.classList.contains('info-btn')) {
      document.querySelectorAll('.tooltip').forEach(t => t.classList.remove('show'));
      document.querySelectorAll('.info-btn[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded','false'));
    }
  });

  /* ========== Datenobjekt fürs Backend (unverändert) ========== */
  function getVerkuerzungsgruende(){
    const abitur = document.getElementById('g-abitur').checked;
    const realschule = document.getElementById('g-realschule').checked;
    const alter_ueber_21 = document.getElementById('g-alter21').checked;

    const vorkToggle = document.getElementById('g-vork').checked;
    const raw = parseInt(document.getElementById('vork-monate').value || '0', 10);
    const vorkenntnisse_monate = (vorkToggle ? (isNaN(raw) ? 0 : raw) : 0);

    return { abitur, realschule, alter_ueber_21, vorkenntnisse_monate };
  }

  const out = document.getElementById('json-out');
  const vorkToggleEl = document.getElementById('g-vork');
  const vorkControls = document.getElementById('vork-controls');

  function renderPreview(){
    if (out) out.textContent = JSON.stringify(getVerkuerzungsgruende(), null, 2);
  }

  function updateVorkUI(){
    const on = vorkToggleEl.checked;
    vorkControls.classList.toggle('show', on);
    if (!on) { document.getElementById('vork-monate').value = '0'; }
    renderPreview();
  }

  ['g-abitur','g-realschule','g-alter21'].forEach(id=>{
    document.getElementById(id).addEventListener('change', renderPreview);
  });
  vorkToggleEl.addEventListener('change', updateVorkUI);
  document.getElementById('vork-monate').addEventListener('change', renderPreview);

  document.getElementById('btn-reset').addEventListener('click', ()=>{
    document.getElementById('vk-form').reset();
    updateVorkUI(); renderPreview();
  });

  /* ========== POST an Flask (/api/calculate) – Beispielwerte ========== */
  document.getElementById('btn-emit').addEventListener('click', async ()=>{
    const payload = {
      base_duration_months: 36,
      vollzeit_stunden: 40,
      teilzeit_input: 75,
      input_type: 'prozent',
      verkuerzungsgruende: getVerkuerzungsgruende()
    };
    try{
      const res = await fetch('/api/calculate', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      out.textContent = JSON.stringify(data, null, 2);
    }catch(err){
      out.textContent = 'Fehler: ' + err;
    }
  });

  // Init
  updateVorkUI(); renderPreview();
});

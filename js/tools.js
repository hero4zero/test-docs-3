let TOOLS_DATA = [];
let activeFilter = 'all';

async function loadTools() {
  const banner = document.getElementById('cfg-banner-tools');
  try {
    const data = await ghJSON(GH.files.tools);
    banner.style.display = 'none';
    TOOLS_DATA = data.tools ?? data;
    document.getElementById('tools-subtitle').textContent =
      `${TOOLS_DATA.length} tools available · data from GitHub`;
    renderTools();
  } catch (e) { showError(banner, e.message); }
}

function renderTools() {
  const grid = document.getElementById('tools-grid');
  const list = activeFilter === 'all' ? TOOLS_DATA : TOOLS_DATA.filter(t => (t.envs || []).includes(activeFilter));
  grid.innerHTML = list.map(t => `
    <div class="tool-card">
      <div class="tool-name">${t.name}</div>
      <div style="display:flex;gap:4px;margin-bottom:7px;">
        ${(t.envs || []).map(e => `<span style="font-size:9px;padding:2px 6px;border-radius:4px;font-weight:700;letter-spacing:.5px;background:${e === 'HPC' ? 'rgba(255,204,0,.1)' : 'rgba(0,200,255,.08)'};color:${e === 'HPC' ? 'var(--yellow)' : 'var(--cyan)'};">${e}</span>`).join('')}
      </div>
      <div class="tool-desc">${t.description ?? t.desc ?? ''}</div>
      <div class="tool-actions">
        ${t.info_url ? `<button class="btn-info" onclick="window.open('${t.info_url}','_blank')">info</button>` : ''}
        ${t.doc_path ? `<button class="btn-docs" onclick="goToDoc('${t.doc_path}')">Documentation</button>` : ''}
      </div>
    </div>`).join('');
}

function filterTools(env, btn) {
  activeFilter = env;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTools();
}

function goToDoc(path) {
  const btn = document.querySelector('.nav-btn:nth-child(6)');
  navTo('docs', btn);
  loadDocByPath(path);
}

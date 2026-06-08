async function loadEnvironments() {
  const banner = document.getElementById('cfg-banner-env');
  try {
    const envs = await ghJSON(GH.files.environments);
    banner.style.display = 'none';
    const grid = document.getElementById('env-grid');
    grid.innerHTML = envs.map(env => `
      <div class="env-card" data-env="${env.tag}">
        <div class="env-title" style="color:${env.tag === 'HPC' ? 'var(--yellow)' : env.tag === 'PROD' ? 'var(--green)' : 'var(--cyan)'};">${env.name}</div>
        <div style="margin-bottom:12px;">
          <div class="env-sec-title">Node Configuration</div>
          ${env.nodes.map(n => `<div class="gpu-row"><span class="gpu-type">${n.type}</span><span class="gpu-count">${n.count} Node${n.count > 1 ? 's' : ''}</span></div>`).join('')}
        </div>
        <div style="margin-bottom:12px;">
          <div class="env-sec-title">GPU Inventory</div>
          ${env.gpus.map(g => `<div class="gpu-row"><span class="gpu-type">${g.type}</span><span class="gpu-count">${g.count} GPUs</span></div>`).join('')}
        </div>
        <div class="util-bar"><div class="util-fill" style="width:${env.utilization}%"></div></div>
        <div class="status-row"><span class="s-green"><span class="status-dot"></span>${env.status}</span><span>· ${env.summary}</span></div>
      </div>`).join('');
  } catch (e) { showError(banner, e.message); }
}

async function loadModels() {
  const banner = document.getElementById('cfg-banner-models');
  try {
    const data = await ghJSON(GH.files.models);
    banner.style.display = 'none';
    document.getElementById('models-subtitle').textContent = data.subtitle ?? '';
    const grid = document.getElementById('models-grid');
    const tagColor = t => t === 'HPC'
      ? ['rgba(255,204,0,.1)', 'var(--yellow)', 'rgba(255,204,0,.25)']
      : t === 'PROD'
        ? ['rgba(0,255,136,.08)', 'var(--green)', 'rgba(0,255,136,.2)']
        : ['rgba(0,200,255,.08)', 'var(--cyan)', 'rgba(0,200,255,.2)'];
    grid.innerHTML = data.environments.map(env => {
      const [bg, col, bdr] = tagColor(env.tag);
      return `<div class="model-card">
        <span class="model-env-tag" style="background:${bg};color:${col};border:1px solid ${bdr};">${env.label}</span>
        <a class="model-link" href="${env.endpoint}" target="_blank">↗ ${env.endpoint}</a>
        ${env.models.map(m => `
          <div class="model-item">
            <div class="model-name">${m.name}</div>
            <div class="model-detail">${m.nodes}<br/>${m.gpus}</div>
            <span class="model-status ${m.active ? 's-active' : 's-inactive'}">
              <span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;"></span>
              ${m.active ? 'Active' : 'Offline'}
            </span>
          </div>`).join('')}
      </div>`;
    }).join('');
  } catch (e) { showError(banner, e.message); }
}

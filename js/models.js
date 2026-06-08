async function fetchLiveModels(endpoint, apiKey) {
  const headers = apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {};
  const r = await fetch(`${endpoint}/v1/models`, {
    headers,
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const json = await r.json();
  return (json.data ?? []).map(m => ({
    name: m.id,
    nodes: m.owned_by ? `Owner: ${m.owned_by}` : '',
    gpus: '',
    active: true,
    live: true,
  }));
}

async function loadModels() {
  const banner = document.getElementById('cfg-banner-models');
  try {
    const data = await ghJSON(GH.files.models);
    banner.style.display = 'none';
    document.getElementById('models-subtitle').textContent = data.subtitle ?? '';

    // Fetch live models for DEV in parallel with rendering
    const liveMap = {};
    await Promise.all(data.environments.map(async env => {
      if (env.tag === 'DEV') {
        try {
          liveMap['DEV'] = await fetchLiveModels(env.endpoint, env.apiKey);
        } catch (_) { /* fall back to static */ }
      }
    }));

    const tagColor = t => t === 'HPC'
      ? ['rgba(255,204,0,.1)', 'var(--yellow)', 'rgba(255,204,0,.25)']
      : t === 'PROD'
        ? ['rgba(0,255,136,.08)', 'var(--green)', 'rgba(0,255,136,.2)']
        : ['rgba(0,200,255,.08)', 'var(--cyan)', 'rgba(0,200,255,.2)'];

    const grid = document.getElementById('models-grid');
    grid.innerHTML = data.environments.map(env => {
      const [bg, col, bdr] = tagColor(env.tag);
      const models = liveMap[env.tag] ?? env.models;
      const isLive = !!liveMap[env.tag];
      return `<div class="model-card">
        <span class="model-env-tag" style="background:${bg};color:${col};border:1px solid ${bdr};">${env.label}</span>
        ${isLive ? `<span class="model-live-badge" style="color:${col};font-size:9px;font-weight:700;letter-spacing:1px;margin-left:8px;opacity:0.8;">● LIVE</span>` : ''}
        <a class="model-link" href="${env.endpoint}" target="_blank">↗ ${env.endpoint}</a>
        ${models.map(m => `
          <div class="model-item">
            <div class="model-name">${m.name}</div>
            <div class="model-detail">${m.nodes ?? ''}${m.gpus ? '<br/>' + m.gpus : ''}</div>
            <span class="model-status ${m.active ? 's-active' : 's-inactive'}">
              <span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;"></span>
              ${m.active ? 'Active' : 'Offline'}
            </span>
          </div>`).join('')}
      </div>`;
    }).join('');
  } catch (e) { showError(banner, e.message); }
}

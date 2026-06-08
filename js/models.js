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
    nodes: '',
    gpus: '',
    active: null, // null = checking
    live: true,
  }));
}

// Fire health check for one model, update its status badge in DOM
async function checkModelHealth(endpoint, apiKey, modelId) {
  const headers = apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {};
  const encoded = encodeURIComponent(modelId);
  try {
    const r = await fetch(`${endpoint}/health?model=${encoded}`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return false;
    const json = await r.json();
    return (json.healthy_count ?? 0) > 0;
  } catch (_) {
    return false;
  }
}

function statusBadge(active) {
  if (active === null)
    return `<span class="model-status s-checking"><span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;"></span> Checking…</span>`;
  return `<span class="model-status ${active ? 's-active' : 's-inactive'}"><span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;"></span> ${active ? 'Active' : 'Offline'}</span>`;
}

async function loadModels() {
  const banner = document.getElementById('cfg-banner-models');
  try {
    const data = await ghJSON(GH.files.models);
    banner.style.display = 'none';
    document.getElementById('models-subtitle').textContent = data.subtitle ?? '';

    // Fetch live models for DEV
    const liveMap = {};
    await Promise.all(data.environments.map(async env => {
      if (env.tag === 'DEV') {
        try {
          liveMap['DEV'] = await fetchLiveModels(env.endpoint, env.apiKey);
        } catch (_) {}
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
          <div class="model-item" data-model="${encodeURIComponent(m.name)}" data-env="${env.tag}">
            <div class="model-name">${m.name}</div>
            <div class="model-detail">${m.nodes ?? ''}${m.gpus ? '<br/>' + m.gpus : ''}</div>
            ${statusBadge(m.active)}
          </div>`).join('')}
      </div>`;
    }).join('');

    // Fire parallel health checks for all live DEV models, then sort active first
    const devEnv = data.environments.find(e => e.tag === 'DEV');
    if (devEnv && liveMap['DEV']) {
      const checks = liveMap['DEV'].map(m =>
        checkModelHealth(devEnv.endpoint, devEnv.apiKey, m.name).then(active => {
          // Update badge immediately as each check resolves
          const el = grid.querySelector(`[data-model="${encodeURIComponent(m.name)}"][data-env="DEV"] .model-status`);
          if (el) el.outerHTML = statusBadge(active);
          return { name: m.name, active };
        })
      );

      // After all checks done, re-sort the card: active first, offline below
      Promise.allSettled(checks).then(results => {
        const activeSet = new Set(
          results.filter(r => r.status === 'fulfilled' && r.value.active).map(r => r.value.name)
        );
        const card = grid.querySelector('[data-env="DEV"]')?.closest('.model-card');
        if (!card) return;
        const items = [...card.querySelectorAll('.model-item[data-env="DEV"]')];
        const active = items.filter(el => activeSet.has(decodeURIComponent(el.dataset.model)));
        const offline = items.filter(el => !activeSet.has(decodeURIComponent(el.dataset.model)));
        [...active, ...offline].forEach(el => card.appendChild(el));
      });
    }

  } catch (e) { showError(banner, e.message); }
}

const NEWS_TAG_COLOR = {
  HPC:  { cls: 'news-tag-HPC',  icon: '#ffcc00', bg: 'rgba(255,204,0,.12)'  },
  PROD: { cls: 'news-tag-PROD', icon: '#00ff88', bg: 'rgba(0,255,136,.08)'  },
  DEV:  { cls: 'news-tag-DEV',  icon: '#00c8ff', bg: 'rgba(0,200,255,.08)'  },
};

function renderNewsFeed(items) {
  const feed = document.getElementById('news-feed');
  feed.innerHTML = items.map(item => {
    const env  = item.env ?? 'DEV';
    const cfg  = NEWS_TAG_COLOR[env] ?? NEWS_TAG_COLOR.DEV;
    const text = item.text ?? item;
    return `
      <div class="news-row">
        <div class="news-row-left">
          <span class="news-row-tag ${cfg.cls}">${env}</span>
          <span class="news-row-text">${text}</span>
        </div>
        <div class="news-row-icon" style="background:${cfg.bg};">
          <svg viewBox="0 0 24 24" fill="none" stroke="${cfg.icon}" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14M15.54 8.46a5 5 0 010 7.07M8.46 8.46a5 5 0 000 7.07"/>
          </svg>
        </div>
      </div>`;
  }).join('');
  document.getElementById('news-section').style.display = 'block';
}

async function loadOverview() {
  const spinner = document.getElementById('cfg-banner-overview');
  try {
    const d = await ghJSON(GH.files.overview);
    spinner.style.display = 'none';
    document.getElementById('globe-container').style.display = 'grid';

    document.getElementById('ov-models').textContent     = d.active_models?.total ?? '—';
    document.getElementById('ov-models-sub').textContent = d.active_models?.breakdown ?? '';
    document.getElementById('ov-envs').textContent       = d.environments?.total ?? '—';
    document.getElementById('ov-envs-sub').textContent   = d.environments?.names?.join(' · ') ?? '';
    document.getElementById('ov-gpus').textContent       = d.gpus?.total ?? '—';
    document.getElementById('ov-gpus-sub').textContent   = d.gpus?.breakdown ?? '';
    document.getElementById('ov-tools').textContent      = d.tools?.total ?? '—';
    document.getElementById('ov-tools-sub').textContent  = d.tools?.subtitle ?? '';

    document.getElementById('badge-dev').textContent  = d.badges?.dev  ?? '';
    document.getElementById('badge-prod').textContent = d.badges?.prod ?? '';
    document.getElementById('badge-hpc').textContent  = d.badges?.hpc  ?? '';

    renderNewsFeed(d.news ?? []);

    initGlobe();
  } catch (e) { showError(spinner, e.message); }
}

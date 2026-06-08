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

    const news = d.news ?? ['No news'];
    let ni = 0;
    const tick = () => { document.getElementById('news-text').textContent = news[ni % news.length]; ni++; };
    tick(); setInterval(tick, 4000);

    initGlobe();
  } catch (e) { showError(spinner, e.message); }
}

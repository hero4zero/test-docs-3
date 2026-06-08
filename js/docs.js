// docsInited is declared in app.js alongside navigation state
let DOCS_INDEX = [];
let DOCS_TREE_DATA = [];
let activeDocId = null;

async function initDocsPage() {
  if (docsInited) return;
  docsInited = true;
  const nav = document.getElementById('docs-tree-nav');
  nav.innerHTML = `<div style="padding:16px;">${skeletons(6)}</div>`;
  try {
    const raw = await ghJSON(GH.files.docs_index);
    if (raw[0]?.items) {
      DOCS_TREE_DATA = raw;
      DOCS_INDEX = raw.flatMap(s => s.items.map(i => ({ ...i, section: s.section })));
    } else {
      DOCS_INDEX = raw;
      const secs = {};
      raw.forEach(i => { const s = i.section || 'Documents'; if (!secs[s]) secs[s] = []; secs[s].push(i); });
      DOCS_TREE_DATA = Object.entries(secs).map(([section, items]) => ({ section, items }));
    }
    nav.innerHTML = `
      <div class="tree-repo-badge">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
        ${GH.owner}/${GH.repo} · ${GH.branch}
      </div>`;
    renderDocTree();
    if (DOCS_INDEX.length) loadDocById(DOCS_INDEX[0].id);
  } catch (e) {
    nav.innerHTML = `<div style="padding:14px;color:var(--red);font-size:12px;">⚠ ${e.message}</div>`;
  }
}

function renderDocTree(filter = '') {
  const nav = document.getElementById('docs-tree-nav');
  const q = filter.toLowerCase();
  const badge = nav.querySelector('.tree-repo-badge')?.outerHTML ?? '';
  let html = badge;
  DOCS_TREE_DATA.forEach(sec => {
    const items = sec.items.filter(i => !q || i.title.toLowerCase().includes(q) || (i.section || '').toLowerCase().includes(q));
    if (!items.length) return;
    html += `<div class="tree-section-hdr">${sec.section}</div>`;
    items.forEach(item => {
      const active = item.id === activeDocId ? 'active' : '';
      const badge = item.badge
        ? `<span class="tree-badge" style="background:${item.badge_bg || 'rgba(0,200,255,.1)'};color:${item.badge_color || 'var(--cyan)'};">${item.badge}</span>`
        : '';
      html += `<div class="tree-item ${active}" onclick="loadDocById('${item.id}')">
        <span class="tree-icon">${item.icon || '📄'}</span>
        <span class="tree-label">${item.title}</span>${badge}
      </div>`;
    });
  });
  nav.innerHTML = html;
}

function filterDocTree(val) { renderDocTree(val); }

async function loadDocById(id) {
  const item = DOCS_INDEX.find(i => i.id === id);
  if (!item) return;
  activeDocId = id;
  renderDocTree(document.getElementById('docs-search').value);
  await renderDocContent(item);
}

async function loadDocByPath(path) {
  const item = DOCS_INDEX.find(i => i.path === path || i.path === GH.docs_base + path);
  if (item) { await loadDocById(item.id); return; }
  await renderDocContent({ title: path.split('/').pop().replace('.md', ''), path, section: '—' });
}

async function renderDocContent(item) {
  const content = document.getElementById('docs-page-content');
  const idx = DOCS_INDEX.findIndex(i => i.id === item.id);

  document.getElementById('docs-breadcrumb').innerHTML =
    `<span style="opacity:.4;">Docs</span><span style="opacity:.3;"> › </span>
     <span style="opacity:.5;">${item.section ?? ''}</span><span style="opacity:.3;"> › </span>
     <span style="color:var(--text);">${item.title}</span>`;

  const pBtn = document.getElementById('btn-prev'), nBtn = document.getElementById('btn-next');
  pBtn.disabled = idx <= 0; nBtn.disabled = idx >= DOCS_INDEX.length - 1;

  content.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;padding:10px 0;">
    <div class="skeleton" style="height:28px;width:50%;"></div>
    <div class="skeleton" style="height:11px;width:25%;"></div>
    <div style="margin-top:12px;">${skeletons(7)}</div>
    <div class="skeleton" style="height:80px;width:100%;border-radius:9px;"></div>
    ${skeletons(4)}
  </div>`;

  await new Promise(r => setTimeout(r, 300));

  let md = null;
  const mdPath = item.path.startsWith('http') ? null
    : item.path.startsWith(GH.docs_base) || item.path.includes('/')
      ? item.path : GH.docs_base + item.path;

  if (mdPath) {
    try { md = await ghMD(mdPath); } catch (e) { /* fall through to error state */ }
  }

  if (!md) {
    content.innerHTML = `<div style="padding:40px 0;text-align:center;">
      <div style="font-size:32px;margin-bottom:12px;">📄</div>
      <div style="font-size:15px;color:var(--text2);margin-bottom:6px;">${item.title}</div>
      <div style="font-size:12px;color:var(--text3);">Could not load: <code>${mdPath ?? item.path}</code></div>
    </div>`;
    return;
  }

  const rendered = marked.parse(md);
  const headings = [...rendered.matchAll(/<h([23])[^>]*>(.*?)<\/h[23]>/g)];
  let toc = '';
  if (headings.length > 2) {
    toc = `<div class="docs-toc"><div class="docs-toc-title">On this page</div>
      ${headings.map(m => `<a href="#" class="docs-toc-link ${m[1] === '3' ? 'h3' : ''}" onclick="return false;">${m[2].replace(/<[^>]+>/g, '')}</a>`).join('')}
    </div>`;
  }
  content.innerHTML = `
    <h1 class="docs-page-title" style="font-size:26px;font-weight:800;margin-bottom:6px;">${item.title}</h1>
    <div class="docs-page-meta">
      <span>${item.section ?? ''}</span><span style="opacity:.3;">·</span>
      <span style="color:var(--green);">●</span> GitHub · ${GH.owner}/${GH.repo}
    </div>
    ${toc}${rendered}
    <div style="margin-top:44px;padding-top:18px;border-top:1px solid var(--border);display:flex;justify-content:space-between;">
      ${idx > 0 ? `<button onclick="loadDocById('${DOCS_INDEX[idx - 1].id}')" style="padding:7px 16px;border-radius:7px;border:1px solid var(--border);background:var(--glass);color:var(--text2);font-size:12px;cursor:pointer;font-weight:600;">← ${DOCS_INDEX[idx - 1].title}</button>` : '<span></span>'}
      ${idx < DOCS_INDEX.length - 1 ? `<button onclick="loadDocById('${DOCS_INDEX[idx + 1].id}')" style="padding:7px 16px;border-radius:7px;border:1px solid var(--border);background:var(--glass);color:var(--text2);font-size:12px;cursor:pointer;font-weight:600;">${DOCS_INDEX[idx + 1].title} →</button>` : '<span></span>'}
    </div>`;
  content.scrollTop = 0;
}

function docsNavPrev() { const i = DOCS_INDEX.findIndex(x => x.id === activeDocId); if (i > 0) loadDocById(DOCS_INDEX[i - 1].id); }
function docsNavNext() { const i = DOCS_INDEX.findIndex(x => x.id === activeDocId); if (i < DOCS_INDEX.length - 1) loadDocById(DOCS_INDEX[i + 1].id); }

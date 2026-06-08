let concurrency = 4, streamerOn = false;

function setConcurrency(val, el) {
  concurrency = val;
  document.querySelectorAll('#concurrency-group .radio-opt').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  recalc();
}

function toggleStreamer() {
  streamerOn = !streamerOn;
  document.getElementById('streamerToggle').classList.toggle('on', streamerOn);
  document.getElementById('streamer-opts').style.display = streamerOn ? 'block' : 'none';
  recalc();
}

function fmt(n) { return n.toLocaleString(); }
function fmtGB(n) { return n % 1 === 0 ? n + ' GB' : n.toFixed(1) + ' GB'; }

function recalc() {
  const ms   = parseFloat(document.getElementById('modelSize').value) || 127;
  const gc   = parseInt(document.getElementById('gpuCount').value) || 4;
  const gv   = parseInt(document.getElementById('gpuVRAM').value) || 80;
  const goal = document.getElementById('optGoal').value;
  const thr  = parseInt(document.getElementById('streamerThreads').value) || 16;

  document.getElementById('lbl-modelsize').textContent = ms + ' GB';
  document.getElementById('lbl-gpucount').textContent = gc;

  const totalVRAM = gc * gv, sysRAM = totalVRAM * 1.6, shm = ms * 1.5, cpu = gc * 16;
  const KV = 230000, mml = Math.floor((KV / concurrency) * .8);
  const bat = goal === 'low' ? 2048 : goal === 'balanced' ? 8192 : 16384;
  let cpuR = 32, cpuL = 64, ramR = 512, ramL = 640;
  if (streamerOn) { cpuR += thr * .5; cpuL += thr * .5; ramR += thr * 2; ramL += thr * 2; }

  document.getElementById('out-vram').textContent = fmtGB(totalVRAM);
  document.getElementById('out-ram').textContent  = fmtGB(sysRAM);
  document.getElementById('out-shm').textContent  = fmtGB(shm);
  document.getElementById('out-cpu').textContent  = cpu + ' cores';
  document.getElementById('out-mml').textContent  = fmt(mml);
  document.getElementById('out-mnbt').textContent = fmt(bat);

  const mx = Math.max(totalVRAM, 320) * 1.2;
  document.getElementById('bar-vram').style.width = Math.min(100, totalVRAM / mx * 100) + '%';
  document.getElementById('bar-ram').style.width  = Math.min(100, sysRAM / mx * 100) + '%';
  document.getElementById('bar-shm').style.width  = Math.min(100, shm / mx * 100) + '%';
  document.getElementById('bar-cpu').style.width  = Math.min(100, cpu / 128 * 100) + '%';

  const sc = streamerOn
    ? `\n            # +${thr * .5} CPU, +${thr * 2}Gi RAM for RunAI streamer (${thr} threads)` : '';

  document.getElementById('yaml-content').innerHTML =
    `<span class="yaml-key">spec</span>:
  <span class="yaml-key">containers</span>:
  - <span class="yaml-key">name</span>: <span class="yaml-str">vllm</span>
    <span class="yaml-key">image</span>: <span class="yaml-str">vllm/vllm-openai:latest</span>${streamerOn ? '\n    # Custom image for RunAI streamer' : ''}
    <span class="yaml-key">resources</span>:
      <span class="yaml-key">requests</span>:
        <span class="yaml-key">cpu</span>: <span class="yaml-str">"${cpuR}"</span>${sc}
        <span class="yaml-key">memory</span>: <span class="yaml-str">"${ramR}Gi"</span>
        <span class="yaml-key">nvidia.com/gpu</span>: <span class="yaml-str">"${gc}"</span>
      <span class="yaml-key">limits</span>:
        <span class="yaml-key">cpu</span>: <span class="yaml-str">"${cpuL}"</span>
        <span class="yaml-key">memory</span>: <span class="yaml-str">"${ramL}Gi"</span>
        <span class="yaml-key">nvidia.com/gpu</span>: <span class="yaml-str">"${gc}"</span>
    <span class="yaml-key">securityContext</span>:
      <span class="yaml-key">capabilities</span>:
        <span class="yaml-key">add</span>: [<span class="yaml-str">"IPC_LOCK"</span>]
    <span class="yaml-key">volumeMounts</span>:
    - <span class="yaml-key">name</span>: <span class="yaml-str">dshm</span>
      <span class="yaml-key">mountPath</span>: <span class="yaml-str">/dev/shm</span>
  <span class="yaml-key">volumes</span>:
  - <span class="yaml-key">name</span>: <span class="yaml-str">dshm</span>
    <span class="yaml-key">emptyDir</span>:
      <span class="yaml-key">medium</span>: <span class="yaml-str">Memory</span>
      <span class="yaml-key">sizeLimit</span>: <span class="yaml-str">${Math.ceil(shm)}Gi</span> <span class="yaml-comment">            # 1.5× model size (${ms} GB)</span>`;

  const sf = streamerOn
    ? `\n  <span class="flag">--load-format</span> <span class="flagval">runai_streamer</span> \\\n  <span class="flag">--model-loader-extra-config</span> <span class="flagval">'{"concurrency":${thr},"memory_limit":0}'</span> \\`
    : '';

  document.getElementById('cmd-output').innerHTML =
    `<span class="prompt">$</span> <span class="cmd">vllm serve</span> <span class="flagval">MODEL_NAME</span> \\
  <span class="flag">--tensor-parallel-size</span> <span class="flagval">${gc}</span> \\
  <span class="flag">--gpu-memory-utilization</span> <span class="flagval">0.90</span> \\
  <span class="flag">--max-model-len</span> <span class="flagval">${mml}</span> \\
  <span class="flag">--max-num-seqs</span> <span class="flagval">${concurrency}</span> \\
  <span class="flag">--max-num-batched-tokens</span> <span class="flagval">${bat}</span> \\
  <span class="flag">--kv-cache-dtype</span> <span class="flagval">fp8</span> \\
  <span class="flag">--enable-chunked-prefill</span> \\
  <span class="flag">--enable-prefix-caching</span> \\
  <span class="flag">--swap-space</span> <span class="flagval">4</span>${sf}`;
}

function copyYAML() {
  const t = document.getElementById('yaml-content').innerText;
  navigator.clipboard.writeText(t).then(() => {
    const b = document.querySelector('#yaml-output .copy-btn');
    b.textContent = 'Copied!'; setTimeout(() => b.textContent = 'Copy', 1500);
  });
}

function copyCmd() {
  const t = document.getElementById('cmd-output').innerText;
  navigator.clipboard.writeText(t).then(() => {
    const b = document.querySelector('.terminal-block .copy-btn');
    b.textContent = 'Copied!'; setTimeout(() => b.textContent = 'Copy', 1500);
  });
}

/**
 * HTML Renderer - IDX Screener UI
 * Returns full HTML string. Semua CSS & JS inline → tidak butuh static assets.
 * Fix layar hitam: selalu return HTML lengkap, bukan string kosong/ok.
 */

export function renderHTML() {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Fix cache: paksa browser reload setiap kali -->
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <title>IDX Screener Pro</title>
  <style>
    /* ─── Reset & Base ─── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #0a0e1a;
      --surface:   #111827;
      --surface2:  #1a2235;
      --border:    #1e2d42;
      --accent:    #00d4aa;
      --accent2:   #0ea5e9;
      --red:       #f43f5e;
      --green:     #22c55e;
      --yellow:    #f59e0b;
      --purple:    #a855f7;
      --text:      #e2e8f0;
      --muted:     #64748b;
      --font:      'JetBrains Mono', 'Courier New', monospace;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      font-size: 13px;
      min-height: 100vh;
    }

    /* ─── Header ─── */
    header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo {
      font-size: 16px;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: 0.05em;
    }
    .logo span { color: var(--muted); font-weight: 400; }
    .badge {
      background: var(--accent);
      color: var(--bg);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 3px;
      letter-spacing: 0.08em;
    }

    /* ─── Toolbar ─── */
    .toolbar {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 12px 20px;
      background: var(--surface2);
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
    }
    .toolbar select, .toolbar input {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 10px;
      border-radius: 4px;
      font-family: var(--font);
      font-size: 12px;
      outline: none;
      cursor: pointer;
    }
    .toolbar select:focus, .toolbar input:focus {
      border-color: var(--accent);
    }
    .toolbar input { width: 90px; }
    .btn {
      padding: 6px 14px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-family: var(--font);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.85; }
    .btn-primary { background: var(--accent); color: var(--bg); }
    .btn-secondary { background: var(--surface); border: 1px solid var(--border); color: var(--text); }
    .label { color: var(--muted); font-size: 11px; }

    /* ─── Stats bar ─── */
    .stats {
      display: flex;
      gap: 20px;
      padding: 10px 20px;
      border-bottom: 1px solid var(--border);
      background: var(--bg);
      flex-wrap: wrap;
    }
    .stat { display: flex; flex-direction: column; gap: 2px; }
    .stat-val { font-size: 18px; font-weight: 700; color: var(--accent); }
    .stat-lbl { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }

    /* ─── Table ─── */
    .table-wrap {
      overflow-x: auto;
      padding: 0 0 60px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 800px;
    }
    thead th {
      background: var(--surface);
      color: var(--muted);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 53px;
      cursor: pointer;
      white-space: nowrap;
      user-select: none;
    }
    thead th:hover { color: var(--accent); }
    thead th.sorted { color: var(--accent); }

    tbody tr {
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      transition: background 0.1s;
    }
    tbody tr:hover { background: var(--surface2); }
    td {
      padding: 10px 14px;
      white-space: nowrap;
    }

    /* Score bar */
    .score-wrap { display: flex; align-items: center; gap: 8px; }
    .score-bar-bg {
      width: 60px; height: 5px;
      background: var(--border);
      border-radius: 3px;
      overflow: hidden;
    }
    .score-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.4s ease;
    }
    .score-num { font-weight: 700; min-width: 28px; }

    .pos  { color: var(--green); }
    .neg  { color: var(--red); }
    .neu  { color: var(--muted); }

    /* Signal pills */
    .signals { display: flex; gap: 4px; flex-wrap: wrap; }
    .pill {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      letter-spacing: 0.06em;
    }
    .pill-green  { background: rgba(34,197,94,0.15);  color: var(--green); }
    .pill-red    { background: rgba(244,63,94,0.15);  color: var(--red); }
    .pill-yellow { background: rgba(245,158,11,0.15); color: var(--yellow); }
    .pill-blue   { background: rgba(14,165,233,0.15); color: var(--accent2); }
    .pill-purple { background: rgba(168,85,247,0.15); color: var(--purple); }

    /* ─── Loading ─── */
    #loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      gap: 14px;
    }
    .spinner {
      width: 32px; height: 32px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ─── Error ─── */
    #error-box {
      display: none;
      margin: 20px;
      padding: 16px;
      background: rgba(244,63,94,0.1);
      border: 1px solid var(--red);
      border-radius: 6px;
      color: var(--red);
    }

    /* ─── Mobile responsive ─── */
    @media (max-width: 600px) {
      header { padding: 10px 14px; }
      .toolbar { padding: 10px 14px; gap: 8px; }
      .stats { gap: 14px; padding: 8px 14px; }
      td, th { padding: 8px 10px; }
    }
  </style>
</head>
<body>

<header>
  <div class="logo">IDX<span>Screener</span> <span style="color:var(--accent2)">PRO</span></div>
  <div class="badge">LIVE</div>
</header>

<div class="toolbar">
  <span class="label">Sector:</span>
  <select id="sectorFilter">
    <option value="">All Sectors</option>
    <option value="Finance">Finance</option>
    <option value="Tech">Tech</option>
    <option value="Telecom">Telecom</option>
    <option value="Consumer">Consumer</option>
    <option value="Mining">Mining</option>
    <option value="Auto">Auto</option>
  </select>

  <span class="label">Min Score:</span>
  <input type="number" id="minScore" value="0" min="0" max="100" placeholder="0">

  <span class="label">Sort:</span>
  <select id="sortBy">
    <option value="score">Score</option>
    <option value="changePct">Change %</option>
    <option value="volume">Volume</option>
    <option value="close">Price</option>
  </select>

  <select id="sortOrder">
    <option value="desc">↓ High First</option>
    <option value="asc">↑ Low First</option>
  </select>

  <button class="btn btn-primary" onclick="loadData()">▶ Run Screen</button>
  <button class="btn btn-secondary" onclick="resetFilters()">↺ Reset</button>

  <span id="last-update" style="color:var(--muted);font-size:11px;margin-left:auto"></span>
</div>

<div class="stats" id="stats-bar">
  <div class="stat"><div class="stat-val" id="stat-total">—</div><div class="stat-lbl">Showing</div></div>
  <div class="stat"><div class="stat-val" id="stat-bullish" style="color:var(--green)">—</div><div class="stat-lbl">Bullish</div></div>
  <div class="stat"><div class="stat-val" id="stat-bearish" style="color:var(--red)">—</div><div class="stat-lbl">Bearish</div></div>
  <div class="stat"><div class="stat-val" id="stat-squeeze" style="color:var(--purple)">—</div><div class="stat-lbl">Squeeze</div></div>
  <div class="stat"><div class="stat-val" id="stat-avgScore" style="color:var(--accent)">—</div><div class="stat-lbl">Avg Score</div></div>
</div>

<div id="error-box">⚠️ <span id="error-msg">Gagal memuat data.</span></div>

<div id="loading"><div class="spinner"></div><span style="color:var(--muted)">Loading screener...</span></div>

<div class="table-wrap" id="table-wrap" style="display:none">
  <table>
    <thead>
      <tr>
        <th onclick="sortTable('ticker')">Ticker</th>
        <th onclick="sortTable('name')">Nama</th>
        <th onclick="sortTable('close')">Harga</th>
        <th onclick="sortTable('changePct')">Change%</th>
        <th onclick="sortTable('score')">Score</th>
        <th onclick="sortTable('volume')">Volume</th>
        <th>Signals</th>
        <th>Sector</th>
      </tr>
    </thead>
    <tbody id="tbody"></tbody>
  </table>
</div>

<script>
  let _data = [];
  let _sortCol = 'score';
  let _sortDir = 'desc';

  async function loadData() {
    showLoading(true);
    hideError();

    const sector   = document.getElementById('sectorFilter').value;
    const minScore = document.getElementById('minScore').value;
    const sortBy   = document.getElementById('sortBy').value;
    const order    = document.getElementById('sortOrder').value;

    const params = new URLSearchParams({ sector, minScore, sortBy, order, limit: 100 });

    try {
      // cache-bust: tambah timestamp supaya browser tidak pakai cache lama
      const ts = Date.now();
      const res = await fetch('/api/screen?' + params + '&_t=' + ts, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Unknown error');

      _data = json.data;
      renderTable(_data);
      renderStats(_data);
      document.getElementById('last-update').textContent = 'Updated: ' + new Date().toLocaleTimeString('id-ID');

    } catch (err) {
      showError('Gagal memuat data: ' + err.message);
    } finally {
      showLoading(false);
    }
  }

  function renderTable(data) {
    const tbody = document.getElementById('tbody');
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted)">Tidak ada saham yang memenuhi kriteria</td></tr>';
      document.getElementById('table-wrap').style.display = '';
      return;
    }

    tbody.innerHTML = data.map((s, i) => {
      const scoreColor = s.score >= 70 ? 'var(--green)' : s.score >= 50 ? 'var(--yellow)' : 'var(--red)';
      const changeClass = s.changePct > 0 ? 'pos' : s.changePct < 0 ? 'neg' : 'neu';
      const changeStr = (s.changePct > 0 ? '+' : '') + s.changePct.toFixed(2) + '%';
      const volStr = s.volume >= 1e9 ? (s.volume/1e9).toFixed(1)+'B' : s.volume >= 1e6 ? (s.volume/1e6).toFixed(1)+'M' : s.volume >= 1e3 ? (s.volume/1e3).toFixed(0)+'K' : s.volume;

      const pillMap = { green:'pill-green', red:'pill-red', yellow:'pill-yellow', blue:'pill-blue', purple:'pill-purple' };
      const signalsHTML = (s.signals||[]).map(sig =>
        '<span class="pill ' + (pillMap[sig.color]||'pill-blue') + '">' + sig.label + '</span>'
      ).join('');

      return '<tr onclick="openDetail(\'' + s.ticker + '\')">' +
        '<td><b style="color:var(--accent)">' + s.ticker + '</b></td>' +
        '<td>' + s.name + '</td>' +
        '<td>' + s.close.toLocaleString('id-ID') + '</td>' +
        '<td class="' + changeClass + '">' + changeStr + '</td>' +
        '<td><div class="score-wrap">' +
          '<div class="score-bar-bg"><div class="score-bar-fill" style="width:' + s.score + '%;background:' + scoreColor + '"></div></div>' +
          '<span class="score-num" style="color:' + scoreColor + '">' + s.score + '</span>' +
        '</div></td>' +
        '<td>' + volStr + '</td>' +
        '<td><div class="signals">' + (signalsHTML || '<span style="color:var(--muted)">—</span>') + '</div></td>' +
        '<td style="color:var(--muted)">' + s.sector + '</td>' +
      '</tr>';
    }).join('');

    document.getElementById('table-wrap').style.display = '';
  }

  function renderStats(data) {
    document.getElementById('stat-total').textContent = data.length;
    document.getElementById('stat-bullish').textContent = data.filter(s => s.signals?.some(x => x.type === 'bullish')).length;
    document.getElementById('stat-bearish').textContent = data.filter(s => s.signals?.some(x => x.type === 'bearish')).length;
    document.getElementById('stat-squeeze').textContent = data.filter(s => s.signals?.some(x => x.type === 'squeeze' || x.type === 'compression')).length;
    const avg = data.length ? Math.round(data.reduce((a,b) => a + b.score, 0) / data.length) : 0;
    document.getElementById('stat-avgScore').textContent = avg;
  }

  function sortTable(col) {
    if (_sortCol === col) _sortDir = _sortDir === 'desc' ? 'asc' : 'desc';
    else { _sortCol = col; _sortDir = 'desc'; }

    _data.sort((a, b) => {
      const av = a[col] ?? '';
      const bv = b[col] ?? '';
      if (typeof av === 'string') return _sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return _sortDir === 'asc' ? av - bv : bv - av;
    });
    renderTable(_data);
  }

  function openDetail(ticker) {
    window.open('/api/stock/' + ticker, '_blank');
  }

  function resetFilters() {
    document.getElementById('sectorFilter').value = '';
    document.getElementById('minScore').value = '0';
    document.getElementById('sortBy').value = 'score';
    document.getElementById('sortOrder').value = 'desc';
    loadData();
  }

  function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
    if (show) document.getElementById('table-wrap').style.display = 'none';
  }

  function showError(msg) {
    document.getElementById('error-msg').textContent = msg;
    document.getElementById('error-box').style.display = 'block';
  }
  function hideError() {
    document.getElementById('error-box').style.display = 'none';
  }

  // Auto-load on page open
  loadData();

  // Auto-refresh tiap 60 detik
  setInterval(loadData, 60000);
</script>
</body>
</html>`;
}

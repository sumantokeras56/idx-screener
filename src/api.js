/**
 * API Handler - IDX Screener
 * Endpoint: /api/screen   → jalankan screener
 * Endpoint: /api/stock/:ticker → detail 1 saham
 * Endpoint: /api/health   → cek status
 */

export async function handleAPI(request, url, env) {
  const path = url.pathname;

  // === CORS headers (dibutuhkan kalau akses dari domain lain) ===
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };

  // Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Health check
  if (path === '/api/health') {
    return json({ status: 'ok', ts: Date.now() }, corsHeaders);
  }

  // Run screener
  if (path === '/api/screen') {
    const params = Object.fromEntries(url.searchParams);
    const results = runScreener(SAMPLE_DATA, params);
    return json({ ok: true, count: results.length, data: results }, corsHeaders);
  }

  // Detail saham
  const stockMatch = path.match(/^\/api\/stock\/([A-Z]{1,6})$/);
  if (stockMatch) {
    const ticker = stockMatch[1];
    const stock = SAMPLE_DATA.find(s => s.ticker === ticker);
    if (!stock) return json({ ok: false, error: 'Ticker not found' }, corsHeaders, 404);
    return json({ ok: true, data: stock }, corsHeaders);
  }

  return json({ ok: false, error: 'Route not found' }, corsHeaders, 404);
}

// ─── Screener Engine ───────────────────────────────────────────────────────────

function runScreener(stocks, params = {}) {
  const minScore  = parseFloat(params.minScore  ?? 0);
  const maxScore  = parseFloat(params.maxScore  ?? 100);
  const sector    = params.sector   ?? '';
  const sortBy    = params.sortBy   ?? 'score';
  const order     = params.order    ?? 'desc';
  const limit     = parseInt(params.limit ?? 50);

  let results = stocks.map(s => ({
    ...s,
    score: computeScore(s),
    signals: computeSignals(s),
  }));

  // Filter
  results = results.filter(s =>
    s.score >= minScore &&
    s.score <= maxScore &&
    (sector === '' || s.sector === sector)
  );

  // Sort
  results.sort((a, b) => {
    const av = a[sortBy] ?? 0;
    const bv = b[sortBy] ?? 0;
    return order === 'asc' ? av - bv : bv - av;
  });

  return results.slice(0, limit);
}

/**
 * 4-Layer Scoring Engine (sesuai commit terakhir: 25 metode kuantitatif)
 * Layer 1: Momentum & Price Action (25%)
 * Layer 2: Volume & Microstructure (30%)
 * Layer 3: Volatility & Compression (25%)
 * Layer 4: Statistical Edge (20%)
 */
function computeScore(s) {
  const L1 = scoreLayer1(s); // Momentum
  const L2 = scoreLayer2(s); // Volume/Microstructure
  const L3 = scoreLayer3(s); // Volatility/Compression
  const L4 = scoreLayer4(s); // Statistical Edge

  return Math.round(L1 * 0.25 + L2 * 0.30 + L3 * 0.25 + L4 * 0.20);
}

function scoreLayer1(s) {
  // NMF: Net Money Flow
  const nmf = (s.close - s.open) / (s.high - s.low + 0.001) * s.volume;
  const nmfScore = nmf > 0 ? Math.min(100, (nmf / s.volume) * 100 + 50) : Math.max(0, 50 + (nmf / s.volume) * 100);

  // Price vs VWAP
  const vwapScore = s.close > s.vwap ? 70 : 30;

  // Gap fill probability
  const gapPct = Math.abs(s.open - s.prevClose) / s.prevClose * 100;
  const gapScore = gapPct < 1 ? 60 : gapPct < 3 ? 75 : 50;

  return (nmfScore * 0.4 + vwapScore * 0.35 + gapScore * 0.25);
}

function scoreLayer2(s) {
  // VRR: Volatility-adjusted Volume Ratio (RV5d / RV20d)
  const vrr = s.rv5d / (s.rv20d + 0.001);
  const vrrScore = vrr < 0.7 ? 85 : vrr < 1.0 ? 65 : vrr < 1.5 ? 45 : 30;

  // Microstructure imbalance: up-vol vs down-vol
  const imbalance = s.upVol / (s.upVol + s.downVol + 1);
  const imbalanceScore = imbalance * 100;

  // Volume spike
  const volRatio = s.volume / (s.avgVolume20d + 1);
  const volScore = volRatio > 2 ? 90 : volRatio > 1.5 ? 75 : volRatio > 1 ? 60 : 40;

  return (vrrScore * 0.35 + imbalanceScore * 0.35 + volScore * 0.30);
}

function scoreLayer3(s) {
  // HL Range compression: ADR5 / ADR20
  const hlCompression = s.adr5 / (s.adr20 + 0.001);
  const compressionScore = hlCompression < 0.7 ? 90 : hlCompression < 0.9 ? 70 : 40;

  // Realized skewness (positif = bagus)
  const skewScore = s.skew20d > 0.5 ? 80 : s.skew20d > 0 ? 60 : s.skew20d > -0.5 ? 40 : 20;

  // VWAP deviation (tidak terlalu jauh)
  const vwapDev = Math.abs(s.close - s.vwap) / s.vwap * 100;
  const devScore = vwapDev < 1 ? 80 : vwapDev < 2 ? 65 : vwapDev < 4 ? 45 : 25;

  return (compressionScore * 0.40 + skewScore * 0.30 + devScore * 0.30);
}

function scoreLayer4(s) {
  // Price displacement vs avg
  const displacement = (s.close - s.vwap20d) / (s.vwap20d + 0.001) * 100;
  const dispScore = Math.abs(displacement) < 2 ? 75 : Math.abs(displacement) < 5 ? 55 : 35;

  // Orderflow: bid-ask imbalance proxy
  const ofScore = s.orderflowBias > 0.6 ? 85 : s.orderflowBias > 0.5 ? 65 : s.orderflowBias > 0.4 ? 45 : 25;

  return (dispScore * 0.5 + ofScore * 0.5);
}

function computeSignals(s) {
  const signals = [];
  const vrr = s.rv5d / (s.rv20d + 0.001);
  if (vrr < 0.7) signals.push({ type: 'compression', label: 'Volatility Compression', color: 'yellow' });
  if (s.close > s.vwap && s.upVol > s.downVol) signals.push({ type: 'bullish', label: 'VWAP + Volume Bullish', color: 'green' });
  if (s.close < s.vwap && s.upVol < s.downVol) signals.push({ type: 'bearish', label: 'VWAP + Volume Bearish', color: 'red' });
  if (s.volume > s.avgVolume20d * 2) signals.push({ type: 'spike', label: 'Volume Spike 2x', color: 'blue' });
  if (s.adr5 / (s.adr20 + 0.001) < 0.7) signals.push({ type: 'squeeze', label: 'Range Squeeze', color: 'purple' });
  return signals;
}

// ─── Sample Data (ganti dengan fetch ke API real) ──────────────────────────────

const SAMPLE_DATA = [
  { ticker:'BBCA', name:'Bank Central Asia',        sector:'Finance',  close:9800,  open:9750,  high:9850,  low:9700,  prevClose:9720,  volume:45000000, avgVolume20d:38000000, vwap:9780,  vwap20d:9650,  rv5d:0.012, rv20d:0.018, adr5:1.2,  adr20:1.8,  upVol:27000000, downVol:18000000, skew20d:0.4,  orderflowBias:0.62 },
  { ticker:'BBRI', name:'Bank Rakyat Indonesia',    sector:'Finance',  close:4890,  open:4850,  high:4920,  low:4830,  prevClose:4810,  volume:120000000,avgVolume20d:95000000, vwap:4875,  vwap20d:4750,  rv5d:0.015, rv20d:0.020, adr5:1.5,  adr20:2.0,  upVol:72000000, downVol:48000000, skew20d:0.6,  orderflowBias:0.65 },
  { ticker:'TLKM', name:'Telkom Indonesia',         sector:'Telecom',  close:3200,  open:3180,  high:3220,  low:3160,  prevClose:3175,  volume:55000000, avgVolume20d:48000000, vwap:3190,  vwap20d:3100,  rv5d:0.009, rv20d:0.016, adr5:0.9,  adr20:1.6,  upVol:31000000, downVol:24000000, skew20d:0.2,  orderflowBias:0.58 },
  { ticker:'ASII', name:'Astra International',     sector:'Auto',     close:5100,  open:5050,  high:5150,  low:5020,  prevClose:5030,  volume:33000000, avgVolume20d:30000000, vwap:5080,  vwap20d:4980,  rv5d:0.011, rv20d:0.017, adr5:1.1,  adr20:1.7,  upVol:19000000, downVol:14000000, skew20d:0.3,  orderflowBias:0.60 },
  { ticker:'UNVR', name:'Unilever Indonesia',      sector:'Consumer', close:2800,  open:2810,  high:2830,  low:2780,  prevClose:2820,  volume:18000000, avgVolume20d:20000000, vwap:2805,  vwap20d:2850,  rv5d:0.008, rv20d:0.012, adr5:0.8,  adr20:1.2,  upVol:8000000,  downVol:10000000, skew20d:-0.3, orderflowBias:0.42 },
  { ticker:'GOTO', name:'GoTo Gojek Tokopedia',    sector:'Tech',     close:68,    open:65,    high:70,    low:64,    prevClose:64,    volume:800000000,avgVolume20d:600000000,vwap:67,    vwap20d:62,    rv5d:0.035, rv20d:0.042, adr5:3.5,  adr20:4.2,  upVol:500000000,downVol:300000000,skew20d:0.8,  orderflowBias:0.70 },
  { ticker:'BMRI', name:'Bank Mandiri',            sector:'Finance',  close:6200,  open:6150,  high:6250,  low:6120,  prevClose:6130,  volume:62000000, avgVolume20d:55000000, vwap:6180,  vwap20d:6050,  rv5d:0.013, rv20d:0.019, adr5:1.3,  adr20:1.9,  upVol:38000000, downVol:24000000, skew20d:0.5,  orderflowBias:0.63 },
  { ticker:'ICBP', name:'Indofood CBP',            sector:'Consumer', close:10200, open:10150, high:10300, low:10100, prevClose:10100, volume:9000000,  avgVolume20d:8500000,  vwap:10200, vwap20d:9950,  rv5d:0.007, rv20d:0.014, adr5:0.7,  adr20:1.4,  upVol:5500000,  downVol:3500000,  skew20d:0.1,  orderflowBias:0.55 },
  { ticker:'EXCL', name:'XL Axiata',               sector:'Telecom',  close:2100,  open:2080,  high:2120,  low:2070,  prevClose:2075,  volume:25000000, avgVolume20d:22000000, vwap:2095,  vwap20d:2050,  rv5d:0.010, rv20d:0.018, adr5:1.0,  adr20:1.8,  upVol:14000000, downVol:11000000, skew20d:0.2,  orderflowBias:0.56 },
  { ticker:'PTBA', name:'Bukit Asam',              sector:'Mining',   close:3100,  open:3050,  high:3130,  low:3030,  prevClose:3020,  volume:40000000, avgVolume20d:32000000, vwap:3085,  vwap20d:2950,  rv5d:0.018, rv20d:0.025, adr5:1.8,  adr20:2.5,  upVol:26000000, downVol:14000000, skew20d:0.7,  orderflowBias:0.68 },
].map(s => ({
  ...s,
  change:    parseFloat(((s.close - s.prevClose) / s.prevClose * 100).toFixed(2)),
  changePct: parseFloat(((s.close - s.prevClose) / s.prevClose * 100).toFixed(2)),
}));

// ─── Helper ────────────────────────────────────────────────────────────────────

function json(data, extraHeaders = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      ...extraHeaders,
    },
  });
}

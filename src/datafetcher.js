const API_BASE = 'https://idx-yahoo-proxy.waxewi.workers.dev';
const CACHE = new Map();
const CACHE_TTL = 60 * 1000;

export async function fetchCandles(ticker) {
  const now = Date.now();
  const cached = CACHE.get(ticker);
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  const url = `${API_BASE}/quote?ticker=${ticker}&interval=1d&range=3mo`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} untuk ${ticker}`);
  }

  const raw = await response.json();
  const candles = normalizeData(raw);
  CACHE.set(ticker, { data: candles, timestamp: now });
  return candles;
}

function normalizeData(raw) {
  try {
    const result = raw.chart.result[0];
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];
    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      const open = quote.open[i];
      const high = quote.high[i];
      const low = quote.low[i];
      const close = quote.close[i];
      const volume = quote.volume[i];
      if (open === null || close === null) continue;
      candles.push({
        timestamp: timestamps[i],
        open,
        high,
        low,
        close,
        volume: volume || 0,
      });
    }
    return candles;
  } catch (error) {
    console.error('Normalisasi gagal:', error);
    return [];
  }
}
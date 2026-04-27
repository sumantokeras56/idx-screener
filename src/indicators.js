// =====================================================
// indicators.js
// Menghitung semua indikator teknikal:
// return, volatilitas, volume, ADL, trend, mean reversion
// =====================================================

/**
 * @param {Array} candles - array { timestamp, open, high, low, close, volume }
 * @returns {Object} semua indikator
 */
export function computeIndicators(candles) {
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  // 1. Log return dan volatilitas 20
  const logReturns = [];
  for (let i = 1; i < closes.length; i++) {
    logReturns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const volatility20 = rollingStd(logReturns, 20);

  // Volatilitas 5 hari untuk deteksi ekspansi
  const shortVol = rollingStd(logReturns, 5);
  const volExpansion = shortVol.map((v, i) => {
    if (i < 19 || volatility20[i] === null) return false;
    return v > volatility20[i] * 1.5;
  });

  // 2. Volume intelligence
  const volMA20 = rollingMean(volumes, 20);
  const volSpikeRatio = volumes.map((v, i) => volMA20[i] ? v / volMA20[i] : 1);

  // 3. Accumulation Distribution Line (ADL)
  const adl = calculateADL(candles);

  // Divergence ADL vs price (20 hari terakhir)
  const adlSlope = linearRegressionSlope(adl.slice(-20), range(20));
  const priceSlope = linearRegressionSlope(closes.slice(-20), range(20));
  const adlPriceDivergence = adlSlope > 0 && priceSlope < 0;

  // 4. Trend & struktur
  const slope20 = linearRegressionSlope(closes.slice(-20), range(20));
  const breakout = detectBreakout(candles);
  const structure = marketStructure(candles);

  // 5. Mean reversion
  const ma20 = rollingMean(closes, 20);
  const std20 = rollingStd(closes, 20);
  const zScore = closes.map((c, i) => (c - ma20[i]) / (std20[i] || 1));

  return {
    logReturns,
    volatility20,
    volExpansion,
    volMA20,
    volSpikeRatio,
    adl,
    adlPriceDivergence,
    slope20,
    breakout,
    structure,
    zScore,
    ma20,
    // data mentah untuk modul selanjutnya
    closes,
    volumes,
    highs,
    lows,
  };
}

// ---------- Helpers ----------

function rollingMean(arr, period) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += arr[j];
    result.push(sum / period);
  }
  return result;
}

function rollingStd(arr, period) {
  const ma = rollingMean(arr, period);
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < period - 1 || ma[i] === null) { result.push(null); continue; }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumSq += Math.pow(arr[j] - ma[i], 2);
    }
    result.push(Math.sqrt(sumSq / period));
  }
  return result;
}

function linearRegressionSlope(y, x) {
  const n = y.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
  }
  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
}

function calculateADL(candles) {
  const adl = [0];
  for (let i = 1; i < candles.length; i++) {
    const { high, low, close, volume } = candles[i];
    const prevClose = candles[i - 1].close;
    const mfm = ((close - low) - (high - close)) / (high - low || 1);
    const mfv = mfm * volume;
    adl.push(adl[i - 1] + mfv);
  }
  return adl;
}

function detectBreakout(candles) {
  if (candles.length < 21) return false;
  const recent20 = candles.slice(-21, -1);
  const resistance = Math.max(...recent20.map(c => c.high));
  const last = candles[candles.length - 1];
  const avgVol = recent20.reduce((s, c) => s + c.volume, 0) / 20;
  return last.close > resistance && last.volume > avgVol * 1.2;
}

function marketStructure(candles) {
  if (candles.length < 10) return 'neutral';
  const last10 = candles.slice(-10);
  const highs = last10.map(c => c.high);
  const lows = last10.map(c => c.low);
  const prevHigh = highs[highs.length - 2];
  const currHigh = highs[highs.length - 1];
  const prevLow = lows[lows.length - 2];
  const currLow = lows[lows.length - 1];
  if (currHigh > prevHigh && currLow > prevLow) return 'bullish';
  if (currHigh < prevHigh && currLow < prevLow) return 'bearish';
  return 'neutral';
}

function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}
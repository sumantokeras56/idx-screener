// tailRisk.js - Realized Skewness, Kurtosis, EVT tail index, Structural Break

function mean(arr) { return arr.reduce((s, v) => s + v, 0) / arr.length; }
function std(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) * (v - m), 0) / arr.length);
}

export function computeRealizedSkewness(candles, period = 20) {
  const rets = [];
  for (let i = Math.max(1, candles.length - period); i < candles.length; i++) {
    rets.push(Math.log(candles[i].close / candles[i - 1].close));
  }
  if (rets.length < 3) return 0;
  const m = mean(rets);
  const s = std(rets);
  if (s === 0) return 0;
  const cubed = rets.reduce((sum, r) => sum + Math.pow((r - m) / s, 3), 0);
  return cubed / rets.length;
}

export function computeRealizedKurtosis(candles, period = 20) {
  const rets = [];
  for (let i = Math.max(1, candles.length - period); i < candles.length; i++) {
    rets.push(Math.log(candles[i].close / candles[i - 1].close));
  }
  if (rets.length < 4) return 0;
  const m = mean(rets);
  const s = std(rets);
  if (s === 0) return 0;
  const fourth = rets.reduce((sum, r) => sum + Math.pow((r - m) / s, 4), 0);
  return fourth / rets.length - 3;
}

export function computeEVT(candles, period = 60) {
  const rets = [];
  for (let i = Math.max(1, candles.length - period); i < candles.length; i++) {
    rets.push(Math.log(candles[i].close / candles[i - 1].close));
  }
  if (rets.length < 20) return { xi: 0, sigma: 0, heavyTail: false };

  // Fix: jangan mutate array asli
  const sorted = [...rets].sort((a, b) => a - b);
  const threshold = sorted[Math.floor(0.9 * sorted.length)];
  const exceedances = rets.filter(r => r > threshold);
  if (exceedances.length < 10) return { xi: 0, sigma: 0, heavyTail: false };
  const m = mean(exceedances);
  const v = exceedances.reduce((s, x) => s + (x - m) * (x - m), 0) / exceedances.length;
  const xi = 0.5 * (1 - (m * m) / v);
  const sigma = 0.5 * m * (1 + (m * m) / v);
  return { xi, sigma, heavyTail: xi > 0 };
}

export function computeStructuralBreak(candles) {
  const rets = [];
  for (let i = 1; i < candles.length; i++) {
    rets.push(Math.log(candles[i].close / candles[i - 1].close));
  }
  const n = rets.length;
  if (n < 15) return { fStat: 0, breakDetected: false, breakDirection: null };
  const windowB = rets.slice(-10);
  const windowA = rets.slice(-30, -10);
  const all = rets.slice(-30);
  const ssr = (arr) => {
    const m = mean(arr);
    return arr.reduce((s, v) => s + (v - m) * (v - m), 0);
  };
  const SSR_pooled = ssr(all);
  const SSR_A = ssr(windowA);
  const SSR_B = ssr(windowB);
  const k = 1;
  const f = ((SSR_pooled - SSR_A - SSR_B) / k) / ((SSR_A + SSR_B) / (all.length - 2 * k));
  let direction = null;
  if (f > 3.0) {
    const meanA = mean(windowA), meanB = mean(windowB);
    direction = meanB > meanA ? 'bullish' : 'bearish';
  }
  return { fStat: f, breakDetected: f > 3.0, breakDirection: direction };
}
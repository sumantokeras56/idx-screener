// informationMetrics.js - PER, Volume Persistence, Amihud, Return Entropy, LZ Complexity

function mean(arr) { return arr.reduce((s, v) => s + v, 0) / arr.length; }

export function computePriceEfficiencyRatio(candles, period = 10) {
  const slice = candles.slice(-period);
  if (slice.length < 2) return 0;
  const diff = Math.abs(slice[slice.length-1].close - slice[0].close);
  let path = 0;
  for (let i = 1; i < slice.length; i++) {
    path += Math.abs(slice[i].close - slice[i-1].close);
  }
  return path === 0 ? 0 : diff / path;
}

export function computeVolumeAnomalyPersistence(candles, window = 10) {
  if (candles.length < 20 + window) return 0;
  const vols = candles.map(c => c.volume);
  const ma20 = [];
  for (let i = 19; i < vols.length; i++) {
    let sum = 0;
    for (let j = i - 19; j <= i; j++) sum += vols[j];
    ma20.push(sum / 20);
  }
  let cnt = 0;
  const start = vols.length - window;
  for (let i = start; i < vols.length; i++) {
    if (vols[i] > ma20[i - 19]) cnt++;
  }
  return cnt / window;
}

export function computeAmihudIlliquidity(candles) {
  const illiq = [];
  for (let i = 1; i < candles.length; i++) {
    const r = Math.abs(Math.log(candles[i].close / candles[i-1].close));
    illiq.push(candles[i].volume === 0 ? 0 : r / candles[i].volume);
  }
  if (illiq.length < 40) return { illiqChange: 1, liquidityImproving: false };
  const now = mean(illiq.slice(-20));
  const past = mean(illiq.slice(-40, -20));
  const change = past === 0 ? 1 : now / past;
  return { illiqChange: change, liquidityImproving: change < 0.7 };
}

export function computeReturnEntropy(candles, period = 20, bins = 5) {
  const rets = [];
  for (let i = candles.length - period; i < candles.length; i++) {
    if (i <= 0) continue;
    rets.push(Math.log(candles[i].close / candles[i-1].close));
  }
  if (rets.length === 0) return 0;
  const min = Math.min(...rets), max = Math.max(...rets);
  const binSize = (max - min) / bins || 1e-10;
  const counts = Array(bins).fill(0);
  for (const r of rets) {
    const idx = Math.min(bins - 1, Math.floor((r - min) / binSize));
    counts[idx]++;
  }
  let entropy = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / rets.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function computeLZComplexity(candles, period = 30) {
  const slice = candles.slice(-period);
  if (slice.length < 2) return 1;
  const binary = [];
  for (let i = 1; i < slice.length; i++) {
    binary.push(slice[i].close > slice[i-1].close ? 1 : 0);
  }
  let i = 0, c = 1;
  const n = binary.length;
  while (i < n) {
    let k = 1;
    while (i + k <= n) {
      const sub = binary.slice(i, i + k);
      if (containsSeq(binary, sub, 0, i + k - 1)) k++;
      else break;
    }
    i += k;
    if (i < n) c++;
  }
  return c * Math.log(n) / n;
}

function containsSeq(arr, sub, start, end) {
  for (let i = start; i <= end - sub.length; i++) {
    let ok = true;
    for (let j = 0; j < sub.length; j++) {
      if (arr[i+j] !== sub[j]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}
// volatilityRegime.js - VRR, Range Compression, Variance Ratio, Realized Cov Decomp, Hurst (R/S)

function mean(arr) { return arr.reduce((s, v) => s + v, 0) / arr.length; }

function variance(arr) {
  const m = mean(arr);
  return arr.reduce((s, v) => s + (v - m) * (v - m), 0) / arr.length;
}

function realizedVol(returns, days) {
  const n = returns.length;
  if (n === 0) return 0;
  const sumSq = returns.reduce((s, r) => s + r * r, 0);
  return Math.sqrt(252 / days * sumSq);
}

export function detectVolatilityRegime(candles) {
  const rets = [];
  for (let i = 1; i < candles.length; i++) {
    rets.push(Math.log(candles[i].close / candles[i - 1].close));
  }
  const rvShort = realizedVol(rets.slice(-5), 5);
  const rvLong = realizedVol(rets.slice(-20), 20);
  const vrr = rvShort / (rvLong || 1e-10);
  let regime = 'normal';
  if (vrr < 0.7) regime = 'compression';
  else if (vrr > 1.3) regime = 'expansion';
  return { vrr, regime };
}

export function computeRangeCompression(candles) {
  const adr5 = mean(candles.slice(-5).map(c => c.high - c.low));
  const adr20 = mean(candles.slice(-20).map(c => c.high - c.low));
  const rcr = adr20 === 0 ? 1 : adr5 / adr20;
  return { rcr, compressed: rcr < 0.7 };
}

export function computeVarianceRatio(candles, q_vals = [2, 4, 8]) {
  const rets = [];
  for (let i = 1; i < candles.length; i++) {
    rets.push(Math.log(candles[i].close / candles[i - 1].close));
  }
  const var1 = variance(rets);
  const result = {};
  let trending = false;
  for (const q of q_vals) {
    const qrets = [];
    for (let i = q - 1; i < rets.length; i += q) {
      let cum = 0;
      for (let j = 0; j < q; j++) cum += rets[i - j];
      qrets.push(cum);
    }
    const varQ = variance(qrets);
    result['vr' + q] = q * var1 === 0 ? 1 : varQ / (q * var1);
    if (result['vr' + q] > 1.05) trending = true;
  }
  return { ...result, trending };
}

export function computeRealizedCovDecomposition(candles, period = 20) {
  const rets = [];
  for (let i = candles.length - period; i < candles.length; i++) {
    if (i <= 0) continue;
    rets.push(Math.log(candles[i].close / candles[i - 1].close));
  }
  const goodSq = rets.filter(r => r > 0).reduce((s, r) => s + r * r, 0);
  const badSq = rets.filter(r => r < 0).reduce((s, r) => s + r * r, 0);
  const n = rets.length;
  const goodVol = Math.sqrt(252 / n * goodSq);
  const badVol = Math.sqrt(252 / n * badSq);
  const denom = goodVol + badVol;
  const asymmetry = denom === 0 ? 0 : goodVol / denom;
  return { goodVol, badVol, asymmetry };
}

export function computeHurstExponent(candles, period = 30) {
  const rets = [];
  for (let i = 1; i < candles.length; i++) {
    rets.push(Math.log(candles[i].close / candles[i - 1].close));
  }
  const series = rets.slice(-period);
  const n = series.length;
  if (n < 8) return { hurst: 0.5, memory: 'random' };

  const sizes = [Math.floor(n / 4), Math.floor(n / 2), n].filter(s => s >= 4);
  const logRS = [], logN = [];

  for (const size of sizes) {
    const numChunks = Math.floor(n / size);
    let rsSum = 0;
    for (let c = 0; c < numChunks; c++) {
      const chunk = series.slice(c * size, (c + 1) * size);
      const chunkMean = mean(chunk);
      const cumDev = [];
      let cum = 0;
      for (const v of chunk) { cum += v - chunkMean; cumDev.push(cum); }
      const R = Math.max(...cumDev) - Math.min(...cumDev);
      const varianceChunk = chunk.reduce((s, v) => s + (v - chunkMean) ** 2, 0) / chunk.length;
      const S = Math.sqrt(varianceChunk);
      if (S > 0) rsSum += R / S;
    }
    const avgRS = rsSum / numChunks;
    if (avgRS > 0) { logRS.push(Math.log(avgRS)); logN.push(Math.log(size)); }
  }

  if (logRS.length < 2) return { hurst: 0.5, memory: 'random' };

  const lN = logN.length;
  let sx = 0, sy = 0, sxy = 0, sx2 = 0;
  for (let i = 0; i < lN; i++) {
    sx += logN[i]; sy += logRS[i];
    sxy += logN[i] * logRS[i]; sx2 += logN[i] * logN[i];
  }
  let hurst = (lN * sxy - sx * sy) / (lN * sx2 - sx * sx);
  hurst = Math.min(1, Math.max(0, hurst));
  const memory = hurst > 0.55 ? 'persistent' : hurst < 0.45 ? 'mean-reverting' : 'random';
  return { hurst, memory };
}
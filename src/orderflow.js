// orderflow.js - Net Money Flow, Imbalance, Tick Rule, Kyle Lambda, Roll Spread, PIN, NMF Autocorr

function linregSlope(y, x) {
  const n = y.length;
  if (n < 2) return 0;
  let sx = 0, sy = 0, sxy = 0, sx2 = 0;
  for (let i = 0; i < n; i++) {
    sx += x[i];
    sy += y[i];
    sxy += x[i] * y[i];
    sx2 += x[i] * x[i];
  }
  const denom = n * sx2 - sx * sx;
  return denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
}

export function computeNMF(candles) {
  const nmf = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const range = c.high - c.low;
    const body = c.close - c.open;
    const mfm = range === 0 ? 0 : body / range;
    nmf.push(mfm * c.volume);
  }
  let cum = 0;
  const cnmf = nmf.map(v => { cum += v; return cum; });
  const last10 = cnmf.slice(-10);
  const x = [...Array(last10.length).keys()];
  const slope = linregSlope(last10, x);
  return { nmf, cnmf, cnmfSlope: slope };
}

export function computeMicrostructureImbalance(candles, window = 10) {
  const slice = candles.slice(-window);
  let upVol = 0, downVol = 0;
  slice.forEach(c => {
    if (c.close > c.open) upVol += c.volume;
    else if (c.close < c.open) downVol += c.volume;
  });
  const total = upVol + downVol;
  return total === 0 ? 0 : (upVol - downVol) / total;
}

export function computeTickRuleProxy(candles, window = 10) {
  const slice = candles.slice(-window);
  const up = slice.filter(c => c.close > c.open).length;
  const down = slice.filter(c => c.close < c.open).length;
  const total = up + down;
  return total === 0 ? 0.5 : up / total;
}

export function computeKyleLambda(candles, nmf) {
  const n = Math.min(20, candles.length - 1);
  const dp = [], nv = [];
  for (let i = candles.length - n; i < candles.length; i++) {
    dp.push(candles[i].close - candles[i-1].close);
    nv.push(nmf[i]);
  }
  const lambda = linregSlope(dp, nv);
  const pn = Math.min(10, candles.length - n - 1);
  const old_dp = [], old_nv = [];
  for (let i = candles.length - n - pn; i < candles.length - n; i++) {
    if (i < 0) continue;
    old_dp.push(candles[i].close - candles[i-1].close);
    old_nv.push(nmf[i]);
  }
  const oldLambda = linregSlope(old_dp, old_nv);
  let trend = 'stable';
  if (oldLambda > 0 && lambda < oldLambda * 0.8) trend = 'decreasing';
  else if (oldLambda > 0 && lambda > oldLambda * 1.2) trend = 'increasing';
  return { lambda, lambdaTrend: trend };
}

export function computeRollSpread(candles, period = 20) {
  const rets = [];
  const start = Math.max(1, candles.length - period);
  for (let i = start; i < candles.length; i++) {
    rets.push(Math.log(candles[i].close / candles[i-1].close));
  }
  let cov = 0;
  for (let i = 0; i < rets.length - 1; i++) {
    cov += rets[i] * rets[i+1];
  }
  cov /= (rets.length - 1 || 1);
  const spread = 2 * Math.sqrt(Math.max(0, -cov));
  return { spread, spreadTrend: 'stable' };
}

export function computePINProxy(candles, nmf) {
  const n = Math.min(20, candles.length);
  const recentNMF = nmf.slice(-n);
  const totalVol = candles.slice(-n).reduce((s, c) => s + c.volume, 0);
  if (totalVol === 0) return 0;
  const absCNMF = Math.abs(recentNMF.reduce((s, v) => s + v, 0));
  return absCNMF / totalVol;
}

export function computeNMFAutocorrelation(nmf, lags = [1,2,3]) {
  const series = nmf.slice(-30);
  const n = series.length;
  if (n < 4) return { rho1: 0, rho2: 0, rho3: 0, persistent: false };
  const mean = series.reduce((s, v) => s + v, 0) / n;
  const denom = series.reduce((s, v) => s + (v - mean) * (v - mean), 0);
  if (denom === 0) return { rho1: 0, rho2: 0, rho3: 0, persistent: false };
  const result = {};
  for (const lag of lags) {
    let num = 0;
    for (let i = 0; i < n - lag; i++) {
      num += (series[i] - mean) * (series[i+lag] - mean);
    }
    result['rho' + lag] = num / denom;
  }
  const persistent = (result.rho1 || 0) > 0.2 && (result.rho2 || 0) > 0.1;
  return { ...result, persistent };
}
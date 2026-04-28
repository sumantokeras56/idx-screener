// scoring.js - 4-layer scoring + news layer, bug fix gapFillProbability

export function computeScore(ind, gap, sig, advanced, news = null) {
  const regime = computeRegimeScore(advanced);
  const flow   = computeFlowScore(advanced);
  const struct = computeStructScore(advanced, gap);
  const stat   = computeStatScore(advanced);
  const newsLyr = computeNewsScore(news);

  const raw = 0.26 * regime + 0.30 * flow + 0.17 * struct + 0.12 * stat + 0.15 * newsLyr;
  return Math.round(Math.min(100, Math.max(0, raw * 100)));
}

function computeRegimeScore(a) {
  let s = 0;
  if (a.regime === 'compression') s += 1.0;
  if (a.rcr < 0.7) s += 0.8;
  if (a.hurst > 0.5) s += 0.7;
  if (a.lzComplexity < 0.5) s += 0.6;
  return Math.min(1, s);
}

function computeFlowScore(a) {
  let s = 0;
  if (a.cnmfSlope > 0) s += 1.0;
  if (a.nmfPersistent) s += 0.9;
  if (a.imbalance > 0.3) s += 0.8;
  if (a.pin > 0.25) s += 0.7;
  if (a.kyleLambdaTrend === 'decreasing') s += 0.6;
  return Math.min(1, s);
}

function computeStructScore(a, gap) {
  let s = 0;
  // BUG FIX: gunakan gapFillProbability bukan gapFillProb
  if (gap.gapFillProbability != null && gap.gapFillProbability < 0.3) s += 1.0;
  if (a.trending) s += 0.8;
  if (a.structuralBreakBullish) s += 0.9;
  if (a.volPersistence > 0.6) s += 0.7;
  return Math.min(1, s);
}

function computeStatScore(a) {
  let s = 0;
  if (a.skew > 0.5) s += 0.8;
  if (a.asymmetry > 0.6) s += 0.7;
  if (a.heavyTail) s += 0.6;
  if (a.liquidityImproving) s += 0.5;
  if (a.entropy < 1.5) s += 0.5;
  return Math.min(1, s);
}

function computeNewsScore(news) {
  if (!news || news.articleCount === 0) return 0.5;
  return (news.newsScore + 1) / 2;
}
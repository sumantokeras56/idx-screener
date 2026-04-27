export function computeScore(ind, gap, sig) {
  const last = ind.closes.length - 1;

  let accScore = 0;
  if (sig.reasons.some(r => r.includes('Accumulation'))) accScore = 0.7;
  if (ind.adlPriceDivergence) accScore = 1.0;
  if (sig.reasons.some(r => r.includes('Stealth'))) accScore = 0.9;

  const volSpike = ind.volSpikeRatio[last];
  let volScore = Math.min(1, volSpike / 2.5);

  let gapScore = 0;
  if (gap.hasContinuation) gapScore = 1;
  else if (gap.hasFade) gapScore = 0.3;
  else if (gap.currentGapSignal === 'continuation') gapScore = 0.8;
  else if (gap.currentGapSignal === 'fade') gapScore = 0.4;
  else if (gap.lastGap) gapScore = 0.5;

  const slopeNorm = ind.slope20 / ind.closes[last];
  let trendScore = Math.max(0, Math.min(1, 0.5 + slopeNorm * 100));

  const lastVol = ind.volatility20[last] || 0.02;
  let volRiskScore = Math.max(0, Math.min(1, 1 - lastVol * 10));

  const absZ = Math.abs(ind.zScore[last]);
  let mrScore = absZ < 0.5 ? 1 : absZ < 1.5 ? 0.8 : absZ < 2 ? 0.5 : 0.2;

  const raw = 0.25 * accScore + 0.20 * volScore + 0.20 * gapScore + 0.15 * trendScore + 0.10 * volRiskScore + 0.10 * mrScore;
  return Math.round(Math.min(100, Math.max(0, raw * 100)));
}
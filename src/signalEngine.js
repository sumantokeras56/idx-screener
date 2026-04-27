export function generateSignal(ind, gap) {
  const last = ind.closes.length - 1;
  const latestVolSpike = ind.volSpikeRatio[last];
  const latestZScore = ind.zScore[last];
  const adlRising = ind.adl[last] > ind.adl[last - 1];
  const adlFalling = ind.adl[last] < ind.adl[last - 1];

  const divergenceAccumulation = ind.adlPriceDivergence;
  const sideways = Math.abs(ind.slope20 / ind.closes[last]) < 0.002;
  const stealthAccumulation = sideways && adlRising && latestVolSpike > 1.2;
  const accumulation = divergenceAccumulation || stealthAccumulation;

  const divergenceDistribution = adlFalling && ind.slope20 > 0;
  const volumeExhaustion = latestVolSpike > 1.5 && adlFalling && ind.structure === 'bearish';
  const distribution = divergenceDistribution || volumeExhaustion;

  const reasons = [];
  if (accumulation) reasons.push('Accumulation detected');
  if (stealthAccumulation) reasons.push('Stealth accumulation');
  if (distribution) reasons.push('Distribution detected');
  if (volumeExhaustion) reasons.push('Volume exhaustion');

  let signal = 'HOLD';
  let confidence = 'LOW';
  const buyConditions = [accumulation, ind.breakout, latestVolSpike > 1.3, gap.hasContinuation, Math.abs(latestZScore) < 1.5, adlRising].filter(Boolean).length;
  const sellConditions = [distribution, gap.hasFade, adlFalling, latestVolSpike < 0.7, gap.trapGap].filter(Boolean).length;

  if (buyConditions >= 4) { signal = 'BUY'; confidence = 'HIGH'; reasons.push('Breakout confirmed', 'Volume spike', 'Gap continuation'); }
  else if (buyConditions >= 3) { signal = 'BUY'; confidence = 'MEDIUM'; if (ind.breakout) reasons.push('Breakout confirmed'); }
  else if (accumulation && adlRising && gap.hasContinuation) { signal = 'BUY'; confidence = 'MEDIUM'; }
  else if (accumulation && latestZScore < -2) { signal = 'BUY'; confidence = 'LOW'; reasons.push('Oversold reversal potential'); }
  else if (sellConditions >= 4) { signal = 'SELL'; confidence = 'HIGH'; reasons.push('Distribution confirmed', 'Gap fade signal', 'Volume exhaustion'); }
  else if (sellConditions >= 3) { signal = 'SELL'; confidence = 'MEDIUM'; if (distribution) reasons.push('Distribution active'); if (gap.trapGap) reasons.push('Trap gap detected'); }
  else if (distribution && gap.hasFade) { signal = 'SELL'; confidence = 'MEDIUM'; }
  else if (gap.trapGap && adlFalling) { signal = 'SELL'; confidence = 'LOW'; reasons.push('Trap gap + ADL falling'); }

  return { signal, confidence, reasons: [...new Set(reasons)] };
}
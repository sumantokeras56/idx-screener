export function calculateRiskLevels(candles, sig, ind, gap) {
  const last = candles[candles.length - 1];
  const entry = last.close;

  const recent20 = candles.slice(-21, -1);
  const highPrices = recent20.map(c => c.high);
  const resistanceLevels = [...new Set(highPrices)].sort((a, b) => b - a);
  const tpTargets = [];
  for (const r of resistanceLevels) { if (r > entry) tpTargets.push(r); }

  for (const gapItem of gap.unfilledGaps || []) {
    if (gapItem.direction === 'down' && gapItem.gapLevel > entry) tpTargets.push(gapItem.gapLevel);
  }

  const atrVal = averageTrueRange(candles.slice(-20));
  tpTargets.push(entry + atrVal * 1.5);

  const uniqueTp = [...new Set(tpTargets)].sort((a, b) => a - b);
  const takeProfit = uniqueTp.filter(t => t > entry).slice(0, 2);
  if (takeProfit.length === 0) { takeProfit.push(entry * 1.03); takeProfit.push(entry * 1.06); }

  const lowPrices = recent20.map(c => c.low);
  const supportLevels = [...new Set(lowPrices)].sort((a, b) => a - b);
  let sl = 0;
  for (const s of supportLevels) { if (s < entry) { sl = s; break; } }
  if (!sl) sl = entry - atrVal * 2;
  if (entry - sl < atrVal) sl = entry - atrVal * 1.5;

  return { entry: Math.round(entry), take_profit: takeProfit.map(t => Math.round(t)), stop_loss: Math.round(sl) };
}

function averageTrueRange(candles) {
  if (candles.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i - 1].close), Math.abs(candles[i].low - candles[i - 1].close));
    sum += tr;
  }
  return sum / (candles.length - 1);
}
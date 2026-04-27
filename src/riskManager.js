// =====================================================
// riskManager.js
// Menghitung Entry, Take Profit, dan Stop Loss dinamis
// berdasarkan resistance, unfilled gaps, dan ATR
// =====================================================

/**
 * @param {Array} candles
 * @param {Object} sig - hasil generateSignal()
 * @param {Object} ind - hasil computeIndicators()
 * @param {Object} gap - hasil analyzeGap()
 * @returns {Object} { entry, take_profit, stop_loss }
 */
export function calculateRiskLevels(candles, sig, ind, gap) {
  const last = candles[candles.length - 1];
  const entry = last.close;

  // === TAKE PROFIT ===
  const tpTargets = [];

  // 1. Resistance terdekat dari 20 candle
  const recent20 = candles.slice(-21, -1);
  const highPrices = recent20.map(c => c.high);
  const resistanceLevels = [...new Set(highPrices)].sort((a, b) => b - a);
  for (const r of resistanceLevels) {
    if (r > entry) tpTargets.push(r);
  }

  // 2. Unfilled gap levels sebagai target
  for (const gapItem of gap.unfilledGaps || []) {
    if (gapItem.direction === 'down' && gapItem.gapLevel > entry) {
      tpTargets.push(gapItem.gapLevel);
    }
  }

  // 3. Volatility-based target (1.5x ATR)
  const atrVal = averageTrueRange(candles.slice(-20));
  tpTargets.push(entry + atrVal * 1.5);

  // Urutkan ascending, ambil 2 terdekat di atas entry
  const uniqueTp = [...new Set(tpTargets)].sort((a, b) => a - b);
  const takeProfit = uniqueTp.filter(t => t > entry).slice(0, 2);

  // Fallback kalau tidak ada TP
  if (takeProfit.length === 0) {
    takeProfit.push(entry * 1.03); // +3%
    takeProfit.push(entry * 1.06); // +6%
  }

  // === STOP LOSS ===
  // 1. Support terdekat dari 20 candle
  const lowPrices = recent20.map(c => c.low);
  const supportLevels = [...new Set(lowPrices)].sort((a, b) => a - b);
  let sl = 0;
  for (const s of supportLevels) {
    if (s < entry) { sl = s; break; }
  }

  // 2. Kalau tidak ada support, pakai ATR
  if (!sl) {
    sl = entry - atrVal * 2;
  }

  // 3. Pastikan SL tidak terlalu dekat (minimal 1x ATR)
  if (entry - sl < atrVal) {
    sl = entry - atrVal * 1.5;
  }

  return {
    entry: Math.round(entry),
    take_profit: takeProfit.map(t => Math.round(t)),
    stop_loss: Math.round(sl),
  };
}

function averageTrueRange(candles) {
  if (candles.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    sum += tr;
  }
  return sum / (candles.length - 1);
}
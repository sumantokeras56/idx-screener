// =====================================================
// signalEngine.js
// Menghasilkan sinyal BUY/SELL/HOLD berdasarkan:
// - Akumulasi/distribusi (ADL)
// - Breakout & struktur
// - Volume spike
// - Gap signal (continuation/fade)
// - Z-score (mean reversion)
// =====================================================

/**
 * @param {Object} ind - hasil computeIndicators()
 * @param {Object} gap - hasil analyzeGap()
 * @returns {Object} { signal, confidence, reasons }
 */
export function generateSignal(ind, gap) {
  const last = ind.closes.length - 1;

  // Ekstrak nilai terbaru
  const latestVolSpike = ind.volSpikeRatio[last];
  const latestZScore = ind.zScore[last];
  const adlRising = ind.adl[last] > ind.adl[last - 1];
  const adlFalling = ind.adl[last] < ind.adl[last - 1];
  const slope20 = ind.slope20;

  // === DETEKSI AKUMULASI ===
  // 1. Divergence: ADL naik tapi harga turun
  const divergenceAccumulation = ind.adlPriceDivergence;

  // 2. Stealth accumulation: sideways + ADL naik + volume spike
  const sideways = Math.abs(slope20 / ind.closes[last]) < 0.002; // < 0.2% per hari
  const stealthAccumulation = sideways && adlRising && latestVolSpike > 1.2;

  // 3. Akumulasi umum
  const accumulation = divergenceAccumulation || stealthAccumulation;

  // === DETEKSI DISTRIBUSI ===
  // 1. ADL turun + harga naik = divergence distribusi
  const divergenceDistribution = adlFalling && slope20 > 0;

  // 2. Volume exhaustion (spike tinggi + ADL turun)
  const volumeExhaustion = latestVolSpike > 1.5 && adlFalling && ind.structure === 'bearish';

  const distribution = divergenceDistribution || volumeExhaustion;

  // === BANGUN ALASAN ===
  const reasons = [];

  if (accumulation) reasons.push('Accumulation detected');
  if (divergenceAccumulation) reasons.push('ADL-price divergence (bullish)');
  if (stealthAccumulation) reasons.push('Stealth accumulation (sideways + rising ADL)');
  if (distribution) reasons.push('Distribution detected');
  if (divergenceDistribution) reasons.push('ADL-price divergence (bearish)');
  if (volumeExhaustion) reasons.push('Volume exhaustion');

  // === KEPUTUSAN SINYAL ===
  let signal = 'HOLD';
  let confidence = 'LOW';

  // --- BUY ---
  const buyConditions = [];
  if (accumulation) buyConditions.push('acc');
  if (ind.breakout) buyConditions.push('brk');
  if (latestVolSpike > 1.3) buyConditions.push('vol');
  if (gap.hasContinuation) buyConditions.push('gapCon');
  if (Math.abs(latestZScore) < 1.5) buyConditions.push('zOk');
  if (adlRising) buyConditions.push('adlUp');

  const buyScore = buyConditions.length;

  if (buyScore >= 4) {
    signal = 'BUY';
    confidence = 'HIGH';
    reasons.push('Breakout confirmed', 'Volume spike', 'Gap continuation');
  } else if (buyScore >= 3) {
    signal = 'BUY';
    confidence = 'MEDIUM';
    if (ind.breakout) reasons.push('Breakout confirmed');
    if (latestVolSpike > 1.3) reasons.push('Volume above average');
    if (gap.hasContinuation) reasons.push('Gap continuation');
  } else if (accumulation && adlRising && gap.hasContinuation) {
    signal = 'BUY';
    confidence = 'MEDIUM';
    reasons.push('Gap continuation');
  } else if (accumulation && latestZScore < -2) {
    // Oversold + accumulation = potential reversal BUY
    signal = 'BUY';
    confidence = 'LOW';
    reasons.push('Oversold reversal potential');
  }

  // --- SELL ---
  const sellConditions = [];
  if (distribution) sellConditions.push('dist');
  if (gap.hasFade) sellConditions.push('gapFade');
  if (adlFalling) sellConditions.push('adlDown');
  if (latestVolSpike < 0.7) sellConditions.push('lowVol');
  if (gap.trapGap) sellConditions.push('trap');

  const sellScore = sellConditions.length;

  if (sellScore >= 4) {
    signal = 'SELL';
    confidence = 'HIGH';
    reasons.push('Distribution confirmed', 'Gap fade signal', 'Volume exhaustion');
  } else if (sellScore >= 3) {
    signal = 'SELL';
    confidence = 'MEDIUM';
    if (distribution) reasons.push('Distribution active');
    if (gap.hasFade) reasons.push('Gap fade signal');
    if (gap.trapGap) reasons.push('Trap gap detected');
  } else if (distribution && gap.hasFade) {
    signal = 'SELL';
    confidence = 'MEDIUM';
  } else if (gap.trapGap && adlFalling) {
    signal = 'SELL';
    confidence = 'LOW';
    reasons.push('Trap gap + ADL falling');
  }

  // HOLD (default)
  if (signal === 'HOLD') {
    if (accumulation) reasons.push('Accumulation building - wait for confirmation');
    if (gap.currentGapSignal) reasons.push('Gap signal: ' + gap.currentGapSignal);
    if (latestZScore < -2) reasons.push('Oversold - monitor reversal');
    if (latestZScore > 2) reasons.push('Overbought - monitor pullback');
  }

  // Bersihkan alasan duplikat
  const uniqueReasons = [...new Set(reasons)];

  return {
    signal,
    confidence,
    reasons: uniqueReasons,
  };
}
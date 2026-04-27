// =====================================================
// gapEngine.js
// Analisis gap lengkap:
// - Klasifikasi gap (minor/moderate/strong/extreme)
// - Sinyal continuation / fade
// - Peluang gap fill (mean reversion)
// - Pelacakan unfilled gaps sebagai target harga
// - Deteksi fake breakout & trap gap
// =====================================================

/**
 * @param {Array} candles - array { timestamp, open, high, low, close, volume }
 * @returns {Object} gapAnalysis
 */
export function analyzeGap(candles) {
  if (candles.length < 2) {
    return emptyResult();
  }

  const gaps = [];
  const unfilledGaps = [];
  let fakeBreakout = false;
  let trapGap = false;

  for (let i = 1; i < candles.length; i++) {
    const prevClose = candles[i - 1].close;
    const currentOpen = candles[i].open;
    const gapPct = ((currentOpen - prevClose) / prevClose) * 100;
    const absGap = Math.abs(gapPct);

    // Klasifikasi
    let classification;
    if (absGap < 1) classification = 'minor';
    else if (absGap < 3) classification = 'moderate';
    else if (absGap < 5) classification = 'strong';
    else classification = 'extreme';

    const candle = candles[i];
    const volume = candle.volume;
    const avgVol = avgVolumeLast20(candles, i);

    // Komponen candle
    const close = candle.close;
    const high = candle.high;
    const low = candle.low;
    const open = candle.open;
    const body = Math.abs(close - open);
    const upperWick = high - Math.max(close, open);
    const lowerWick = Math.min(close, open) - low;

    // Rejection wick: gap tapi langsung ditolak
    const rejectionUp = gapPct > 0 && upperWick > body * 1.5 && close < open;
    const rejectionDown = gapPct < 0 && lowerWick > body * 1.5 && close > open;
    const rejection = rejectionUp || rejectionDown;

    // Sinyal
    let signal = null;
    if (absGap >= 1) {
      const strongCloseUp = gapPct > 0 && close > open && upperWick < body * 0.5;
      const strongCloseDown = gapPct < 0 && close < open && lowerWick < body * 0.5;
      const strongClose = strongCloseUp || strongCloseDown;

      if (volume > avgVol * 1.5 && strongClose && !rejection) {
        signal = 'continuation';
      } else if (volume < avgVol * 0.8 && rejection) {
        signal = 'fade';
      }
    }

    gaps.push({
      index: i,
      gapPct,
      classification,
      signal,
      volume,
      avgVol,
    });

    // Deteksi fake breakout (gap naik > resistance lalu kembali di bawah)
    if (i >= 20 && gapPct > 2) {
      const recent20High = Math.max(...candles.slice(i - 20, i).map(c => c.high));
      if (open > recent20High && close < recent20High * 0.98) {
        fakeBreakout = true;
      }
    }

    // Deteksi trap gap (gap besar, continuation tapi besoknya langsung reversal)
    if (i >= 2 && gaps[i - 2]?.signal === 'continuation' && absGap > 2) {
      if ((gaps[i - 2].gapPct > 0 && close < open) || (gaps[i - 2].gapPct < 0 && close > open)) {
        trapGap = true;
      }
    }

    // Lacak unfilled gaps (harga belum kembali ke level gap)
    if (absGap >= 1) {
      const gapLevel = prevClose;
      let filled = false;
      for (let j = i + 1; j < candles.length; j++) {
        if (gapPct > 0 && candles[j].low <= gapLevel) { filled = true; break; }
        if (gapPct < 0 && candles[j].high >= gapLevel) { filled = true; break; }
      }
      if (!filled) {
        unfilledGaps.push({
          gapIndex: i,
          gapLevel,
          direction: gapPct > 0 ? 'up' : 'down',
          pct: gapPct,
        });
      }
    }
  }

  const lastGap = gaps.length > 0 ? gaps[gaps.length - 1] : null;

  // Probabilitas gap fill: gap minor cenderung terisi
  let gapFillProbability = 0;
  if (lastGap && lastGap.classification === 'minor') gapFillProbability = 0.7;
  else if (lastGap && lastGap.classification === 'moderate') gapFillProbability = 0.5;
  else if (lastGap && lastGap.classification === 'strong') gapFillProbability = 0.3;
  else if (lastGap && lastGap.classification === 'extreme') gapFillProbability = 0.15;

  return {
    gaps,
    unfilledGaps,
    lastGap,
    currentGapSignal: lastGap ? lastGap.signal : null,
    currentGapClassification: lastGap ? lastGap.classification : null,
    hasContinuation: lastGap?.signal === 'continuation',
    hasFade: lastGap?.signal === 'fade',
    gapFillProbability,
    fakeBreakout,
    trapGap,
  };
}

function avgVolumeLast20(candles, currentIndex) {
  const start = Math.max(0, currentIndex - 20);
  const slice = candles.slice(start, currentIndex);
  if (slice.length === 0) return 1;
  const sum = slice.reduce((s, c) => s + c.volume, 0);
  return sum / slice.length;
}

function emptyResult() {
  return {
    gaps: [],
    unfilledGaps: [],
    lastGap: null,
    currentGapSignal: null,
    currentGapClassification: null,
    hasContinuation: false,
    hasFade: false,
    gapFillProbability: 0,
    fakeBreakout: false,
    trapGap: false,
  };
}
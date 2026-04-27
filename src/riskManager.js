// riskManager.js - v2 dengan RR minimal 1:1
export function calculateRiskLevels(candles, sig, ind, gap) {
  const last = candles[candles.length - 1];
  const entry = last.close;

  const atr = averageTrueRange(candles.slice(-20));

  // === KUMPULKAN KANDIDAT TAKE PROFIT ===
  const tpCandidates = [];

  // 1. Resistance dari 20 candle sebelumnya
  const recent20 = candles.slice(-21, -1);
  const highs = recent20.map(c => c.high);
  const uniqueHighs = [...new Set(highs)].sort((a,b) => a - b);
  for (const r of uniqueHighs) {
    if (r > entry + 0.5 * atr) tpCandidates.push(r); // minimal TP = 0.5 ATR
  }

  // 2. Unfilled gaps yang relevan
  for (const g of (gap.unfilledGaps || [])) {
    if (g.direction === 'down' && g.gapLevel > entry + 0.5 * atr) {
      tpCandidates.push(g.gapLevel);
    }
  }

  // 3. Target volatilitas
  tpCandidates.push(entry + 1.5 * atr);

  // Urutkan dan ambil 2 terdekat di atas entry
  const sortedTP = [...new Set(tpCandidates)].sort((a,b) => a - b);
  const validTP = sortedTP.filter(t => t > entry);

  // === STOP LOSS ===
  // Cari support terdekat di bawah entry
  const lows = recent20.map(c => c.low);
  const uniqueLows = [...new Set(lows)].sort((a,b) => a - b);
  let sl = 0;
  for (const l of uniqueLows) {
    if (l < entry) { sl = l; break; }
  }

  // Aturan SL:
  // - tidak boleh lebih dekat dari 1 ATR
  // - tidak boleh lebih jauh dari 2 ATR (kalau support jauh, batasi)
  // - jika tidak ada support, pakai 1.5 ATR di bawah entry
  if (!sl) {
    sl = entry - 1.5 * atr;
  } else {
    if (entry - sl < 1.0 * atr) {
      sl = entry - 1.5 * atr; // terlalu dekat → perlebar
    }
    if (entry - sl > 2.0 * atr) {
      sl = entry - 2.0 * atr; // terlalu jauh → batasi
    }
  }

  // === VALIDASI RR 1:1 ===
  // Ambil TP terkecil yang >= SL (risk) atau paling tidak selisihnya 1:1
  const risk = entry - sl;
  let finalTP = [];
  for (const tp of validTP) {
    if (tp - entry >= risk) {
      finalTP.push(tp);
      if (finalTP.length >= 2) break;
    }
  }

  // Fallback jika tidak ada yang memenuhi 1:1
  if (finalTP.length === 0) {
    finalTP.push(Math.round(entry + risk));      // minimal 1:1
    finalTP.push(Math.round(entry + risk * 1.5)); // 1:1.5
  }

  return {
    entry: Math.round(entry),
    take_profit: finalTP.slice(0,2).map(t => Math.round(t)),
    stop_loss: Math.round(sl)
  };
}

function averageTrueRange(candles) {
  if (candles.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i-1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    sum += tr;
  }
  return sum / (candles.length - 1);
}
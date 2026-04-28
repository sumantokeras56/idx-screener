// signalEngine.js - signal generation with advanced gating + news

export function generateSignal(ind, gap, advanced, news = null) {
  const reasons = [];
  const enoughData = ind.closes.length >= 20;
  if (!enoughData) {
    return { signal: 'HOLD', confidence: 'LOW', reasons };
  }

  // === NEWS HARD GATE ===
  if (news && news.newsScore < -0.6 && news.newsConfidence > 0.5) {
    reasons.push(`Sentimen berita sangat negatif (${news.newsScore.toFixed(2)})`);
    return { signal: 'HOLD', confidence: 'LOW', reasons };
  }

  if (advanced.regime === 'expansion') {
    reasons.push('Expansion regime - tidak entry');
    return { signal: 'HOLD', confidence: 'LOW', reasons };
  }
  if (advanced.cnmfSlope <= 0) {
    reasons.push('CNMF slope negatif');
    return { signal: 'HOLD', confidence: 'LOW', reasons };
  }

  const conds = [
    advanced.nmfPersistent,
    advanced.imbalance > 0.2,
    advanced.rcr < 0.7,
    advanced.per > 0.5,
    advanced.volPersistence > 0.5,
    advanced.structuralBreakBullish
  ].filter(Boolean).length;

  let signal = 'HOLD';
  let confidence = 'LOW';

  if (conds >= 3) {
    signal = 'BUY';
    confidence = 'MEDIUM';
    reasons.push('Persistent NMF flow', 'Compression/trending regime');
    const highConds = [
      advanced.pin > 0.3,
      advanced.kyleLambdaTrend === 'decreasing',
      advanced.hurst > 0.5,
      advanced.heavyTail
    ].filter(Boolean).length;
    if (highConds >= 3) {
      confidence = 'HIGH';
      reasons.push('Informed trader aktif', 'Structural break');
    }
  } else {
    reasons.push('Kondisi buy belum terpenuhi');
  }

  // === NEWS CONFIDENCE BOOST ===
  if (news && signal === 'BUY') {
    if (news.newsScore > 0.4 && news.newsConfidence > 0.4) {
      if (confidence === 'MEDIUM') confidence = 'HIGH';
      reasons.push(`Didukung sentimen berita positif (${news.newsScore.toFixed(2)})`);
    } else if (news.newsScore < -0.3 && news.newsConfidence > 0.4) {
      if (confidence === 'HIGH') confidence = 'MEDIUM';
      reasons.push('Perhatian: sentimen berita mixed');
    }
  }

  return { signal, confidence, reasons: [...new Set(reasons)] };
}
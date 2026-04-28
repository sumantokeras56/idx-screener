// newsSentiment.js - News sentiment engine

const BULLISH_WORDS = {
  'laba': 0.7, 'profit': 0.7, 'untung': 0.7, 'dividen': 0.8, 'rekor': 0.6,
  'naik': 0.5, 'meningkat': 0.6, 'pertumbuhan': 0.6, 'ekspansi': 0.5,
  'akuisisi': 0.4, 'merger': 0.3, 'kontrak': 0.5, 'proyek': 0.4,
  'pemulihan': 0.5, 'optimis': 0.6, 'target': 0.4, 'rekomendasi': 0.4,
  'beat': 0.7, 'exceeded': 0.6, 'record': 0.7, 'growth': 0.6,
  'acquisition': 0.4, 'dividend': 0.8, 'buyback': 0.6, 'upgrade': 0.7,
  'outperform': 0.7, 'bullish': 0.8
};

const BEARISH_WORDS = {
  'rugi': -0.8, 'merugi': -0.8, 'turun': -0.5, 'menurun': -0.6,
  'bangkrut': -1.0, 'pailit': -1.0, 'gagal': -0.7, 'default': -0.9,
  'suspensi': -0.8, 'delisting': -1.0, 'penyelidikan': -0.7,
  'korupsi': -0.9, 'fraud': -0.9, 'skandal': -0.8, 'masalah': -0.4,
  'penurunan': -0.6, 'kerugian': -0.8, 'pembatalan': -0.6,
  'loss': -0.7, 'decline': -0.6, 'miss': -0.6, 'below': -0.4,
  'downgrade': -0.8, 'bearish': -0.8, 'bankrupt': -1.0,
  'investigation': -0.6, 'lawsuit': -0.5
};

const DECAY_LAMBDA = {
  'earnings': 0.020,
  'corporate_action': 0.050,
  'macro': 0.015,
  'rumor': 0.100,
  'general': 0.030
};

export function classifyArticleCategory(text) {
  const t = text.toLowerCase();
  if (/laba|rugi|earnings|revenue|keuangan|laporan/.test(t)) return 'earnings';
  if (/dividen|rights issue|ipo|buyback|merger|akuisisi|spin.?off/.test(t)) return 'corporate_action';
  if (/bi rate|inflasi|fed|suku bunga|gdp|makro|ekonomi/.test(t)) return 'macro';
  if (/rumor|kabar|katanya|diduga|bocoran/.test(t)) return 'rumor';
  return 'general';
}

export function computeLexiconSentiment(text) {
  const words = text.toLowerCase().split(/\s+/);
  let scoreSum = 0;
  let count = 0;
  for (const word of words) {
    const cleaned = word.replace(/[^a-zA-Z]/g, '');
    if (BULLISH_WORDS[cleaned] !== undefined) {
      scoreSum += BULLISH_WORDS[cleaned]; count++;
    }
    if (BEARISH_WORDS[cleaned] !== undefined) {
      scoreSum += BEARISH_WORDS[cleaned]; count++;
    }
  }
  return count === 0 ? 0 : Math.max(-1, Math.min(1, scoreSum / count));
}

export function computeDecayWeight(publishedAt, category) {
  let deltaTHours;

  if (typeof publishedAt === 'string' && publishedAt.includes('T') && publishedAt.length === 15) {
    // Alpha Vantage format: "20240115T143000"
    const y = publishedAt.slice(0,4), mo = publishedAt.slice(4,6), d = publishedAt.slice(6,8);
    const h = publishedAt.slice(9,11), mi = publishedAt.slice(11,13);
    const pubDate = new Date(`${y}-${mo}-${d}T${h}:${mi}:00Z`);
    deltaTHours = (Date.now() - pubDate.getTime()) / 3600000;
  } else {
    const pubDate = new Date(publishedAt);
    deltaTHours = isNaN(pubDate) ? 48 : (Date.now() - pubDate.getTime()) / 3600000;
  }

  deltaTHours = Math.max(0, deltaTHours);
  const lambda = DECAY_LAMBDA[category] || DECAY_LAMBDA['general'];
  return Math.exp(-lambda * deltaTHours);
}

export function computeRelevanceScore(text, symbol) {
  const t = text.toLowerCase();
  const sym = symbol.toLowerCase();
  if (t.includes(sym)) return 1.0;
  if (/perbankan|banking/.test(t) && /bbca|bbri|bbni|bmri/.test(sym)) return 0.6;
  if (/energi|pertambangan|coal|mining/.test(t)) return 0.5;
  if (/bi rate|inflasi|ihsg/.test(t)) return 0.3;
  return 0.2;
}

export async function fetchNewsForTicker(ticker, avKey, ndKey) {
  const symbol = ticker.replace('.JK', '');
  const articles = [];

  const fetches = [];
  if (avKey) {
    fetches.push(
      fetch(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${ticker}&limit=20&apikey=${avKey}`)
        .then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          for (const item of (data.feed || [])) {
            const tickerSent = (item.ticker_sentiment || []).find(t => t.ticker === ticker);
            articles.push({
              title: item.title,
              publishedAt: item.time_published,
              source: 'alphavantage',
              rawScore: tickerSent ? parseFloat(tickerSent.ticker_sentiment_score) : null,
              relevanceScore: tickerSent ? parseFloat(tickerSent.relevance_score) : 0.3,
              category: classifyArticleCategory(item.title + ' ' + (item.summary || ''))
            });
          }
        }).catch(() => {})
    );
  }
  if (ndKey) {
    fetches.push(
      fetch(`https://newsdata.io/api/1/news?apikey=${ndKey}&q=${symbol}&language=id,en&country=id&size=10`)
        .then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          for (const item of (data.results || [])) {
            articles.push({
              title: item.title,
              publishedAt: item.pubDate,
              source: 'newsdata',
              rawScore: null,
              relevanceScore: computeRelevanceScore(item.title + ' ' + (item.description || ''), symbol),
              category: classifyArticleCategory(item.title + ' ' + (item.description || ''))
            });
          }
        }).catch(() => {})
    );
  }

  await Promise.allSettled(fetches);
  return articles;
}

export function aggregateNewsSentiment(articles) {
  if (!articles || articles.length === 0) {
    return { newsScore: 0, newsConfidence: 0, articleCount: 0, signalDispersion: 0 };
  }

  const weighted = [];
  for (const art of articles) {
    const rawScore = (art.rawScore !== null && !isNaN(art.rawScore))
      ? art.rawScore
      : computeLexiconSentiment(art.title);

    const decay = computeDecayWeight(art.publishedAt, art.category);
    const relevance = art.relevanceScore || 0.3;
    const weight = decay * relevance;
    if (weight > 0.01) {
      weighted.push({ score: rawScore, weight });
    }
  }

  if (weighted.length === 0) return { newsScore: 0, newsConfidence: 0, articleCount: 0, signalDispersion: 0 };

  let numerator = 0, denominator = 0;
  for (const { score, weight } of weighted) {
    const conviction = weight * Math.abs(score);
    numerator += score * conviction;
    denominator += conviction;
  }

  const rawAggregate = denominator === 0 ? 0 : numerator / denominator;

  const scores = weighted.map(w => w.score);
  const mean_ = scores.reduce((s, v) => s + v, 0) / scores.length;
  const std = Math.sqrt(scores.reduce((s, v) => s + (v - mean_) ** 2, 0) / scores.length);
  const dispersionPenalty = Math.min(1, 2 * std);

  const newsScore = rawAggregate * (1 - dispersionPenalty * 0.5);
  const newsConfidence = Math.min(1, weighted.length / 5) * (1 - dispersionPenalty);

  return {
    newsScore: Math.max(-1, Math.min(1, newsScore)),
    newsConfidence,
    articleCount: articles.length,
    signalDispersion: std
  };
}

export async function computeNewsSentiment(ticker, avKey, ndKey) {
  try {
    const articles = await fetchNewsForTicker(ticker, avKey, ndKey);
    return aggregateNewsSentiment(articles);
  } catch (e) {
    return { newsScore: 0, newsConfidence: 0, articleCount: 0, signalDispersion: 0, error: e.message };
  }
}
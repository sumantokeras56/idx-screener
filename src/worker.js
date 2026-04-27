import { fetchCandles } from './dataFetcher.js';
import { computeIndicators } from './indicators.js';
import { analyzeGap } from './gapEngine.js';
import { generateSignal } from './signalEngine.js';
import { computeScore } from './scoring.js';
import { calculateRiskLevels } from './riskManager.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // === Endpoint Screening Utama ===
    if (url.pathname === '/screen' && request.method === 'POST') {
      try {
        const body = await request.json();
        const tickers = body.tickers;
        if (!Array.isArray(tickers) || tickers.length === 0) {
          return Response.json({ error: 'Berikan array tickers' }, { status: 400 });
        }

        const results = [];
        for (const ticker of tickers) {
          try {
            const candles = await fetchCandles(ticker);
            if (!candles || candles.length < 20) {
              results.push({ ticker, error: 'Data tidak cukup (min 20 candle)' });
              continue;
            }

            const ind = computeIndicators(candles);
            const gap = analyzeGap(candles);
            const sig = generateSignal(ind, gap);
            const score = computeScore(ind, gap, sig);
            const risk = calculateRiskLevels(candles, sig, ind, gap);

            results.push({
              ticker,
              score,
              signal: sig.signal,
              confidence: sig.confidence,
              entry: risk.entry,
              take_profit: risk.take_profit,
              stop_loss: risk.stop_loss,
              reasons: sig.reasons,
            });
          } catch (e) {
            results.push({ ticker, error: e.message });
          }
        }

        return Response.json(results);
      } catch (e) {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
    }

    // === Endpoint Tes (GET) ===
    if (url.pathname === '/test') {
      const ticker = url.searchParams.get('ticker') || 'BBCA.JK';
      try {
        const candles = await fetchCandles(ticker);
        if (candles.length === 0) {
          return Response.json({ error: 'Data kosong' });
        }

        const ind = computeIndicators(candles);
        const gap = analyzeGap(candles);
        const sig = generateSignal(ind, gap);
        const score = computeScore(ind, gap, sig);
        const risk = calculateRiskLevels(candles, sig, ind, gap);

        return Response.json({
          ticker,
          score,
          signal: sig.signal,
          confidence: sig.confidence,
          reasons: sig.reasons,
          entry: risk.entry,
          take_profit: risk.take_profit,
          stop_loss: risk.stop_loss,
          // Detail tambahan
          lastClose: ind.closes[ind.closes.length - 1],
          zScore: ind.zScore[ind.closes.length - 1],
          volSpike: ind.volSpikeRatio[ind.closes.length - 1],
          structure: ind.structure,
          gapDetails: {
            currentSignal: gap.currentGapSignal,
            hasContinuation: gap.hasContinuation,
            hasFade: gap.hasFade,
            trapGap: gap.trapGap,
            unfilledGaps: gap.unfilledGaps?.length || 0,
          },
        });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // Default
    return new Response('IDX Stock Screener API - POST /screen dengan {"tickers":["BBCA.JK"]}', {
      status: 200,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    });
  },
};
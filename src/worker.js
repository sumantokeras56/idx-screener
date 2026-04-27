import { fetchCandles } from './datafetcher.js';
import { computeIndicators } from './indicators.js';
import { analyzeGap } from './gapEngine.js';
import { generateSignal } from './signalEngine.js';
import { computeScore } from './scoring.js';
import { calculateRiskLevels } from './riskManager.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // === Endpoint Screening (POST & GET) ===
    if (url.pathname === '/screen') {
      let tickers = [];

      if (request.method === 'POST') {
        try {
          const body = await request.json();
          tickers = body.tickers || [];
        } catch (e) {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
      } else if (request.method === 'GET') {
        const t = url.searchParams.get('tickers');
        if (t) tickers = t.split(',');
      }

      if (tickers.length === 0) {
        return Response.json({ error: 'Berikan tickers' }, { status: 400 });
      }

      const results = [];
      for (const ticker of tickers) {
        try {
          const candles = await fetchCandles(ticker);
          if (!candles || candles.length < 20) {
            results.push({ ticker, error: 'Data tidak cukup' });
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
            lastClose: ind.closes[ind.closes.length - 1],
            zScore: ind.zScore[ind.closes.length - 1],
            volSpike: Number(ind.volSpikeRatio[ind.closes.length - 1].toFixed(2)),
          });
        } catch (e) {
          results.push({ ticker, error: e.message });
        }
      }

      results.sort((a, b) => (b.score || 0) - (a.score || 0));
      return Response.json(results);
    }

    // === Endpoint Dashboard HTML ===
    if (url.pathname === '/dashboard') {
      return new Response(getDashboardHTML(), {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
      });
    }

    // Default
    return new Response(
      'IDX Stock Screener API\n' +
      'POST /screen dengan {"tickers":["BBCA.JK"]}\n' +
      'GET /screen?tickers=BBCA.JK,BBRI.JK\n' +
      'GET /dashboard untuk tampilan HTML',
      { status: 200 }
    );
  },
};

function getDashboardHTML() {
  var html = '<!DOCTYPE html>\n';
  html += '<html lang="id">\n';
  html += '<head>\n';
  html += '<meta charset="UTF-8">\n';
  html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  html += '<title>IDX Stock Screener Dashboard</title>\n';
  html += '<style>\n';
  html += '* { margin: 0; padding: 0; box-sizing: border-box; }\n';
  html += 'body { font-family: "Segoe UI", sans-serif; background: #0d1117; color: #c9d1d9; padding: 20px; }\n';
  html += '.container { max-width: 1400px; margin: 0 auto; }\n';
  html += 'h1 { text-align: center; margin-bottom: 20px; color: #58a6ff; }\n';
  html += '.controls { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }\n';
  html += 'input[type="text"] { flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #30363d; background: #161b22; color: #c9d1d9; font-size: 14px; }\n';
  html += 'button { padding: 12px 24px; border: none; border-radius: 8px; background: #238636; color: white; cursor: pointer; font-weight: 600; font-size: 14px; }\n';
  html += 'button:hover { background: #2ea043; }\n';
  html += '.signal-BUY { color: #3fb950; font-weight: bold; }\n';
  html += '.signal-SELL { color: #f85149; font-weight: bold; }\n';
  html += '.signal-HOLD { color: #d2991d; font-weight: bold; }\n';
  html += '.confidence-HIGH { color: #3fb950; }\n';
  html += '.confidence-MEDIUM { color: #d2991d; }\n';
  html += '.confidence-LOW { color: #f85149; }\n';
  html += 'table { width: 100%; border-collapse: collapse; background: #161b22; border-radius: 12px; overflow: hidden; }\n';
  html += 'th { background: #21262d; padding: 14px; text-align: left; font-weight: 600; color: #8b949e; }\n';
  html += 'td { padding: 12px 14px; border-top: 1px solid #30363d; }\n';
  html += 'tr:hover { background: #1c2128; }\n';
  html += '.error { color: #f85149; }\n';
  html += '.last-update { text-align: right; margin-top: 10px; font-size: 12px; color: #8b949e; }\n';
  html += '.score-bar { display: inline-block; width: 60px; height: 8px; background: #21262d; border-radius: 4px; overflow: hidden; vertical-align: middle; margin-right: 6px; }\n';
  html += '.score-fill { height: 100%; border-radius: 4px; }\n';
  html += '</style>\n';
  html += '</head>\n';
  html += '<body>\n';
  html += '<div class="container">\n';
  html += '<h1>IDX Stock Screener</h1>\n';
  html += '<div class="controls">\n';
  html += '<input type="text" id="tickerInput" placeholder="Masukkan ticker, pisahkan koma" value="BBCA.JK,BBRI.JK,TLKM.JK,ASII.JK,UNVR.JK,ICBP.JK,ADRO.JK,PGAS.JK,BBNI.JK,BMRI.JK,BRIS.JK,GOTO.JK,PTBA.JK,ANTM.JK,INDF.JK,KLBF.JK,HMSP.JK,CPIN.JK,SMGR.JK,EXCL.JK">\n';
  html += '<button onclick="scan()">Scan</button>\n';
  html += '</div>\n';
  html += '<div id="result"></div>\n';
  html += '<div class="last-update" id="lastUpdate"></div>\n';
  html += '</div>\n';
  html += '<script>\n';
  html += 'async function scan() {\n';
  html += 'var input = document.getElementById("tickerInput").value;\n';
  html += 'var tickers = input.split(",").map(function(s) { return s.trim(); }).filter(Boolean);\n';
  html += 'if (tickers.length === 0) return;\n';
  html += 'document.getElementById("result").innerHTML = "<p>Memuat data...</p>";\n';
  html += 'try {\n';
  html += 'var response = await fetch("/screen", {\n';
  html += 'method: "POST",\n';
  html += 'headers: { "Content-Type": "application/json" },\n';
  html += 'body: JSON.stringify({ tickers: tickers })\n';
  html += '});\n';
  html += 'var data = await response.json();\n';
  html += 'renderTable(data);\n';
  html += 'document.getElementById("lastUpdate").textContent = "Update: " + new Date().toLocaleTimeString();\n';
  html += '} catch (e) {\n';
  html += 'document.getElementById("result").innerHTML = "<p class=\\"error\\">Gagal mengambil data: " + e.message + "</p>";\n';
  html += '}\n';
  html += '}\n';
  html += 'function renderTable(data) {\n';
  html += 'var html = "<table><thead><tr><th>#</th><th>Ticker</th><th>Skor</th><th>Sinyal</th><th>Confidence</th><th>Entry</th><th>TP 1</th><th>TP 2</th><th>SL</th><th>Harga</th><th>Z-Score</th><th>Vol Spike</th><th>Alasan</th></tr></thead><tbody>";\n';
  html += 'data.forEach(function(row, i) {\n';
  html += 'if (row.error) {\n';
  html += 'html += "<tr><td>" + (i+1) + "</td><td>" + row.ticker + "</td><td colspan=\\"12\\" class=\\"error\\">" + row.error + "</td></tr>";\n';
  html += 'return;\n';
  html += '}\n';
  html += 'var scoreColor = row.score > 60 ? "#3fb950" : (row.score > 40 ? "#d2991d" : "#f85149");\n';
  html += 'html += "<tr>";\n';
  html += 'html += "<td>" + (i+1) + "</td>";\n';
  html += 'html += "<td><strong>" + row.ticker + "</strong></td>";\n';
  html += 'html += "<td><span class=\\"score-bar\\"><span class=\\"score-fill\\" style=\\"width:" + row.score + "%; background:" + scoreColor + ";\\"></span></span> " + row.score + "</td>";\n';
  html += 'html += "<td class=\\"signal-" + row.signal + "\\">" + row.signal + "</td>";\n';
  html += 'html += "<td class=\\"confidence-" + row.confidence + "\\">" + row.confidence + "</td>";\n';
  html += 'html += "<td>" + row.entry + "</td>";\n';
  html += 'html += "<td>" + (row.take_profit ? row.take_profit[0] : "-") + "</td>";\n';
  html += 'html += "<td>" + (row.take_profit ? row.take_profit[1] : "-") + "</td>";\n';
  html += 'html += "<td>" + row.stop_loss + "</td>";\n';
  html += 'html += "<td>" + (row.lastClose || "-") + "</td>";\n';
  html += 'html += "<td>" + (row.zScore ? row.zScore.toFixed(2) : "-") + "</td>";\n';
  html += 'html += "<td>" + (row.volSpike || "-") + "x</td>";\n';
  html += 'html += "<td>" + ((row.reasons || []).join(", ") || "-") + "</td>";\n';
  html += 'html += "</tr>";\n';
  html += '});\n';
  html += 'html += "</tbody></table>";\n';
  html += 'if (data.length === 0) html = "<p>Tidak ada data.</p>";\n';
  html += 'document.getElementById("result").innerHTML = html;\n';
  html += '}\n';
  html += 'window.addEventListener("load", function() {\n';
  html += 'setTimeout(scan, 500);\n';
  html += '});\n';
  html += '</script>\n';
  html += '</body>\n';
  html += '</html>';
  return html;
}
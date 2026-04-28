// Variabel global
var allTickers = [], cachedResults = [], batchSize = 50;

// ===== NETWORK STATUS =====
function updateNetStatus(online) {
  var d = document.getElementById("netDot"), t = document.getElementById("netText");
  if (online) { d.className = "net-dot"; t.textContent = "Koneksi Anda: Online 🟢"; }
  else { d.className = "net-dot offline"; t.textContent = "Koneksi Anda: Offline 🔴"; }
}
window.addEventListener("online", function() { updateNetStatus(true); });
window.addEventListener("offline", function() { updateNetStatus(false); });
updateNetStatus(navigator.onLine);

// ===== PWA =====
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() { navigator.serviceWorker.register("/sw.js").catch(function() {}); });
}

// ===== TICKER LOAD =====
async function loadTickers() {
  try {
    var r = await fetch("/tickers"), d = await r.json();
    allTickers = d.tickers || [];
    document.getElementById("statTotal").textContent = allTickers.length;
    var list = document.getElementById("tickerList");
    allTickers.forEach(function(t) {
      var o = document.createElement("option"); o.value = t; list.appendChild(o);
    });
    scanAll();
  } catch (e) { console.error(e); }
}

// ===== FILTER =====
function getPriceFilters() {
  return { min: parseFloat(document.getElementById("minPrice").value) || 0, max: parseFloat(document.getElementById("maxPrice").value) || Infinity };
}
function applyBCSOFilter(data) {
  if (!document.getElementById("bcsoToggle").checked) return data;
  return data.filter(function(r) {
    return r.signal === "BUY" && (r.volSpike > 1.2 || (r.reasons || []).some(function(x) {
      return x.toLowerCase().indexOf("gap") !== -1 || x.toLowerCase().indexOf("continuation") !== -1;
    }));
  });
}
function applyLocalFilters() {
  var f = getPriceFilters();
  var filtered = cachedResults.filter(function(r) {
    if (r.error) return true;
    var p = r.lastClose || r.entry;
    return p >= f.min && p <= f.max;
  });
  filtered = applyBCSOFilter(filtered);
  var buyCount = filtered.filter(function(r) { return r.signal === "BUY"; }).length;
  if (document.getElementById("bcsoToggle").checked) {
    document.getElementById("bcsoInfo").style.display = "inline";
    document.getElementById("bcsoCount").textContent = buyCount;
  } else { document.getElementById("bcsoInfo").style.display = "none"; }
  renderAll(filtered, buyCount);
}
document.getElementById("minPrice").addEventListener("input", applyLocalFilters);
document.getElementById("maxPrice").addEventListener("input", applyLocalFilters);
document.getElementById("bcsoToggle").addEventListener("change", applyLocalFilters);

// ===== SCAN ALL =====
async function scanAll() {
  if (allTickers.length === 0) return;
  var total = allTickers.length, allResults = [];
  var progBox = document.getElementById("progressBox"), progBar = document.getElementById("progressBar"), progTxt = document.getElementById("progressText");
  progBox.style.display = "block";
  document.getElementById("buySection").innerHTML = "";
  document.getElementById("resultTable").innerHTML = "";
  for (var i = 0; i < total; i += batchSize) {
    var batch = allTickers.slice(i, i + batchSize);
    var pct = Math.round((i / total) * 100);
    progBar.style.width = pct + "%";
    progTxt.innerHTML = "Memindai batch " + (Math.floor(i / batchSize) + 1) + " dari " + Math.ceil(total / batchSize) + " <span class=\"loading-dots\"><span></span><span></span><span></span></span>";
    try {
      var r = await fetch("/screen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tickers: batch, min_price: 0, max_price: Infinity }) });
      var d = await r.json();
      allResults = allResults.concat(d);
    } catch (e) {}
  }
  progBar.style.width = "100%"; progTxt.textContent = "Selesai!";
  setTimeout(function() { progBox.style.display = "none"; }, 1000);
  cachedResults = allResults;
  document.getElementById("statScanned").textContent = allResults.length;
  applyLocalFilters();

  // NOTIFIKASI: cek saham BUY confidence HIGH
  if (document.getElementById("notifyToggle").checked) {
    var buysHigh = allResults.filter(function(r) { return r.signal === "BUY" && r.confidence === "HIGH"; });
    if (buysHigh.length > 0 && Notification.permission === "granted") {
      buysHigh.forEach(function(b) {
        new Notification("🚀 AlphaScreener: " + b.ticker, { body: "BUY HIGH | Entry: " + b.entry + " | TP: " + b.take_profit[0], icon: "data:image/svg+xml;base64," + btoa(LOGO_SVG) });
      });
    }
  }
}

// ===== SCAN SELECTED =====
async function scanSelected() {
  var raw = document.getElementById("tickerInput").value.trim();
  if (!raw) return;
  var tickers = raw.split(",").map(function(s) { return s.trim().toUpperCase(); }).filter(Boolean);
  if (tickers.length === 0) return;
  var r = await fetch("/screen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tickers: tickers, min_price: 0, max_price: Infinity }) });
  var d = await r.json();
  d.forEach(function(row) {
    var idx = cachedResults.findIndex(function(rr) { return rr.ticker === row.ticker; });
    if (idx >= 0) cachedResults[idx] = row; else cachedResults.push(row);
  });
  applyLocalFilters();
}

// ===== CHECK IPO =====
async function checkIPO() {
  var newTickers = [], candidates = ["WBSA", "EMAS", "KISI"];
  for (var i = 0; i < candidates.length; i++) {
    var tk = candidates[i] + ".JK";
    if (allTickers.indexOf(tk) === -1) {
      try {
        var r = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/" + tk + "?interval=1d&range=1mo");
        if (r.ok) {
          var d = await r.json();
          if (d.chart && d.chart.result && d.chart.result.length > 0) {
            var len = d.chart.result[0].timestamp ? d.chart.result[0].timestamp.length : 0;
            newTickers.push({ ticker: tk, candles: len, warning: len < 20 ? "Data belum cukup (IPO baru, tunggu 1 bulan)" : null });
          }
        } else { newTickers.push({ ticker: tk, error: "HTTP " + r.status }); }
      } catch (e) { newTickers.push({ ticker: tk, error: e.message }); }
    }
  }
  if (newTickers.length === 0) {
    alert("Tidak ada IPO baru yang terdeteksi.\n\nSaham IPO akan otomatis ditambahkan setelah memiliki 20 candle historis.");
  } else {
    var msg = "Hasil pengecekan IPO:\n\n";
    newTickers.forEach(function(n) { msg += n.ticker + (n.error ? ": " + n.error : (n.warning ? ": " + n.warning : ": " + n.candles + " candle tersedia")) + "\n"; });
    msg += "\nSaham IPO akan otomatis ditambahkan ke daftar setelah memiliki 20 candle historis.";
    alert(msg);
  }
}

// ===== NEWS BADGE =====
function getNewsBadge(row) {
  if (row.newsScore == null) return "-";
  if (row.newsScore > 0.3) return "<span style=\"color:var(--green);\">📰 Positif</span>";
  if (row.newsScore < -0.3) return "<span style=\"color:var(--red);\">📰 Negatif</span>";
  return "<span style=\"color:var(--text2);\">📰 Netral</span>";
}

// ===== RENDER TABLE =====
function renderAll(data, buyCountOverride) {
  var sorted = data.slice().sort(function(a, b) { return (b.score || 0) - (a.score || 0); });
  var buyList = sorted.filter(function(r) { return r.signal === "BUY"; });
  var confOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  buyList.sort(function(a, b) { return (confOrder[a.confidence] || 0) - (confOrder[b.confidence] || 0); });
  document.getElementById("statBuy").textContent = (buyCountOverride !== undefined ? buyCountOverride : buyList.length);
  document.getElementById("statTime").textContent = new Date().toLocaleTimeString();

  var buyHTML = "";
  if (buyList.length === 0) {
    buyHTML = "<p style=\"color:var(--text2);\">😴 Tidak ada saham dengan sinyal BUY saat ini.</p>";
  } else {
    buyList.forEach(function(row) {
      buyHTML += "<div class=\"buy-card\"><strong>" + row.ticker + " (" + row.lastClose + ")</strong> — Skor " + row.score + " · <span class=\"confidence-" + row.confidence + "\">" + row.confidence + "</span><br><span style=\"font-size:13px;\">Entry: " + row.entry + " | TP1: " + (row.take_profit[0] || "-") + " | TP2: " + (row.take_profit[1] || "-") + " | SL: " + row.stop_loss + "</span><div class=\"meta\">" + (row.reasons || []).join(", ") + " · Sinyal berlaku untuk sesi perdagangan berikutnya.</div></div>";
    });
  }
  document.getElementById("buySection").innerHTML = "<div class=\"buy-section\"><h2>🛒 Rekomendasi BUY</h2>" + buyHTML + "</div>";

  var tableHTML = "<div class=\"table-wrap\"><table><thead><tr><th>#</th><th>Ticker</th><th>Skor</th><th>Sinyal</th><th>Confidence</th><th>Entry</th><th>TP1</th><th>TP2</th><th>SL</th><th>Harga</th><th>Z-Score</th><th>Vol Spike</th><th>Alasan</th><th>Berita</th></tr></thead><tbody>";
  sorted.forEach(function(row, i) {
    if (row.error) {
      tableHTML += "<tr><td>" + (i + 1) + "</td><td>" + row.ticker + "</td><td colspan=\"13\" class=\"error\">" + row.error + "</td></tr>"; return;
    }
    var sc = row.score > 60 ? "var(--green)" : (row.score > 40 ? "var(--amber)" : "var(--red)");
    tableHTML += "<tr><td>" + (i + 1) + "</td><td><strong>" + row.ticker + "</strong></td><td><span style=\"display:inline-block;width:50px;height:6px;background:var(--border);border-radius:3px;vertical-align:middle;margin-right:6px;\"><span style=\"display:block;height:100%;width:" + row.score + "%;background:" + sc + ";border-radius:3px;\"></span></span> " + row.score + "</td><td class=\"signal-" + row.signal + "\">" + row.signal + "</td><td class=\"confidence-" + row.confidence + "\">" + row.confidence + "</td><td>" + row.entry + "</td><td>" + (row.take_profit[0] || "-") + "</td><td>" + (row.take_profit[1] || "-") + "</td><td>" + row.stop_loss + "</td><td>" + (row.lastClose || "-") + "</td><td>" + (row.zScore ? row.zScore.toFixed(2) : "-") + "</td><td>" + row.volSpike + "x</td><td>" + ((row.reasons || []).join(", ") || "-") + "</td><td>" + getNewsBadge(row) + "</td></tr>";
  });
  tableHTML += "</tbody></table></div>";
  if (sorted.length === 0) tableHTML = "<p style=\"color:var(--text2);\">Tidak ada saham yang memenuhi filter.</p>";
  document.getElementById("resultTable").innerHTML = tableHTML;

  var newsScores = sorted.filter(function(r) { return r.newsScore != null && !isNaN(r.newsScore); });
  if (newsScores.length > 0) {
    var avg = newsScores.reduce(function(s, r) { return s + r.newsScore; }, 0) / newsScores.length;
    document.getElementById("statNews").textContent = (avg > 0 ? "🟢 " : (avg < 0 ? "🔴 " : "⚪ ")) + avg.toFixed(2);
  } else { document.getElementById("statNews").textContent = "-"; }
}

// ===== TAB SWITCHING =====
document.querySelectorAll(".tab-btn").forEach(function(btn) {
  btn.addEventListener("click", function() {
    document.querySelectorAll(".tab-btn").forEach(function(b) { b.style.color = "var(--text2)"; b.style.borderBottom = "3px solid transparent"; b.classList.remove("active"); });
    this.style.color = "var(--accent)"; this.style.borderBottom = "3px solid var(--accent)"; this.classList.add("active");
    var tab = this.getAttribute("data-tab");
    document.getElementById("screenerContent").style.display = tab === "screener" ? "block" : "none";
    document.getElementById("newsContent").style.display = tab === "news" ? "block" : "none";
    if (tab === "news" && !window.newsLoaded) { loadNews(); window.newsLoaded = true; }
  });
});

// ===== NEWS LOAD (Fitur 1: Auto-refresh) =====
window.newsLoaded = false;
var newsAutoRefresh = null;

async function loadNews(force) {
  var container = document.getElementById("newsList");
  container.innerHTML = "<p style=\"color:var(--text2);\">Memuat berita ekonomi terkini...</p>";
  try {
    var url = force ? "/news?force=1" : "/news";
    var resp = await fetch(url);
    var news = await resp.json().catch(function(){ return { error: "HTTP " + resp.status }; });
    if (news.error) throw new Error(news.error);

    document.getElementById("newsCount").textContent = news.length;
    document.getElementById("newsUpdated").textContent = new Date().toLocaleTimeString();

    var html = "";
    news.forEach(function(item) {
      html += "<div class=\"news-card\" style=\"background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:20px; box-shadow:var(--shadow);\">";
      html += "<h3 style=\"color:var(--text); margin-bottom:8px; font-size:16px;\">" + item.title + "</h3>";
      html += "<p style=\"color:var(--text2); font-size:13px; margin-bottom:8px;\">" + (item.summary || "") + "</p>";
      html += "<small style=\"color:var(--text2);\">" + (item.publishedAt || "") + " · " + (item.source || "") + "</small>";
      html += " · <a href=\"" + (item.url || "#") + "\" target=\"_blank\" style=\"color:var(--accent); text-decoration:none; font-weight:600;\">Baca →</a>";
      if (item.analysis) {
      var aIdx = news.indexOf(item);
      var divId = 'analysis-' + aIdx;
      var btnId = 'btn-analysis-' + aIdx;
      html += '<br><button id="' + btnId + '" style="margin-top:8px;padding:4px 14px;background:var(--accent);color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;" onclick="(function(){var d=document.getElementById(\'' + divId + '\');var b=document.getElementById(\'' + btnId + '\');if(d.style.display===\'none\'){d.style.display=\'block\';b.textContent=\'🔽 Sembunyikan Analisis\';}else{d.style.display=\'none\';b.textContent=\'🤖 Lihat Analisis AI\';}})();">🤖 Lihat Analisis AI</button>';
      html += '<div id="' + divId + '" style="display:none;margin-top:8px;padding:12px;background:#FFFFFF;border:1px solid #E0DED9;border-radius:8px;color:#333333;font-size:13px;line-height:1.6;">' + item.analysis + '</div>';
    }
      html += "</div>";
    });
    container.innerHTML = html;

    // Auto-refresh setiap 5 menit
    if (newsAutoRefresh) clearInterval(newsAutoRefresh);
    newsAutoRefresh = setInterval(function() { loadNews(true); }, 300000);
  } catch (e) {
    var errMsg = e.message || 'Tidak diketahui';
    var isQuota = errMsg.toLowerCase().includes('quota') || errMsg.includes('503') || errMsg.includes('503');
    container.innerHTML = '<div style="padding:20px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);text-align:center;">'
      + '<p style="color:var(--red);font-size:15px;font-weight:600;">⚠️ Berita tidak tersedia</p>'
      + '<p style="color:var(--text2);font-size:13px;margin-top:8px;">' + errMsg + '</p>'
      + '<button onclick="loadNews(true)" style="margin-top:12px;padding:8px 20px;background:var(--accent);color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:13px;font-weight:600;">🔄 Coba Lagi</button>'
      + '</div>';
  }
}

// ===== EXPORT CSV (Fitur 3) =====
document.getElementById("exportCSVBtn").addEventListener("click", async function() {
  var tickers = allTickers.slice(0, 50).join(",");
  window.open("/export?tickers=" + encodeURIComponent(tickers), "_blank");
});

// ===== PUSH NOTIFICATION (Fitur 4) =====
document.getElementById("notifyToggle").addEventListener("change", function() {
  if (this.checked) {
    if (Notification.permission === "denied") {
      alert("Notifikasi diblokir. Buka pengaturan browser untuk mengizinkan.");
      this.checked = false;
    } else if (Notification.permission === "default") {
      Notification.requestPermission().then(function(perm) {
        if (perm !== "granted") document.getElementById("notifyToggle").checked = false;
      });
    }
  }
});

// ===== INIT =====
document.getElementById("scanAllBtn").addEventListener("click", scanAll);
document.getElementById("scanInputBtn").addEventListener("click", scanSelected);
document.getElementById("checkIpoBtn").addEventListener("click", checkIPO);
window.addEventListener("load", function() {
  document.getElementById("tickerInput").value = "";
  loadTickers();
});
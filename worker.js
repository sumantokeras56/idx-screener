import { fetchCandles } from './datafetcher.js';
import { computeIndicators } from './indicators.js';
import { analyzeGap } from './gapEngine.js';
import { generateSignal } from './signalEngine.js';
import { computeScore } from './scoring.js';
import { calculateRiskLevels } from './riskManager.js';
import { computeNMF, computeMicrostructureImbalance, computeTickRuleProxy, computeKyleLambda, computeRollSpread, computePINProxy, computeNMFAutocorrelation } from './orderflow.js';
import { detectVolatilityRegime, computeRangeCompression, computeVarianceRatio, computeRealizedCovDecomposition, computeHurstExponent } from './volatilityRegime.js';
import { computePriceEfficiencyRatio, computeVolumeAnomalyPersistence, computeAmihudIlliquidity, computeReturnEntropy, computeLZComplexity } from './informationMetrics.js';
import { computeRealizedSkewness, computeRealizedKurtosis, computeEVT, computeStructuralBreak } from './tailRisk.js';
import { computeNewsSentiment } from './newsSentiment.js';

const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none"><defs><linearGradient id="g" x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#FF4747"/><stop offset="100%" stop-color="#FFFFFF"/></linearGradient></defs><circle cx="256" cy="130" r="70" fill="url(#g)"/><path d="M225,150 Q240,100 280,110 Q310,120 320,150 Q330,180 300,190 Q270,200 240,180 Q220,170 215,150Z" fill="none" stroke="#1A1A1A" stroke-width="3"/><path d="M245,120 Q265,80 300,90" fill="none" stroke="#1A1A1A" stroke-width="3"/><text x="256" y="280" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-weight="800" font-size="44" fill="#1A1A1A">ALPHASCREENER</text><text x="256" y="330" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-weight="700" font-size="30" fill="#D97757">IDX</text><text x="256" y="365" text-anchor="middle" font-family="Inter,Segoe UI,sans-serif" font-size="16" fill="#6B6B6B">Professional Screening Engine</text></svg>';

const DEFAULT_TICKERS = [
  "AALI.JK","ABMM.JK","ACES.JK","ACST.JK","ADES.JK","ADHI.JK","ADMF.JK","ADRO.JK","AGII.JK","AGRO.JK","AGRS.JK","AHAP.JK","AIMS.JK","AISA.JK","AKKU.JK","AKPI.JK","AKRA.JK","AKSI.JK","ALDO.JK","ALKA.JK","ALMI.JK","AMAG.JK","AMAN.JK","AMIN.JK","AMRT.JK","ANDI.JK","ANJT.JK","ANTM.JK","APEX.JK","APIC.JK","APII.JK","APLI.JK","APLN.JK","ARGO.JK","ARII.JK","ARKA.JK","ARNA.JK","ARTA.JK","ARTI.JK","ASBI.JK","ASDM.JK","ASGR.JK","ASII.JK","ASJT.JK","ASMI.JK","ASRI.JK","ATAP.JK","ATIC.JK","AUTO.JK","AYLS.JK","BABP.JK","BACA.JK","BALI.JK","BANK.JK","BAPI.JK","BATA.JK","BAYU.JK","BBCA.JK","BBHI.JK","BBKP.JK","BBLD.JK","BBNI.JK","BBRI.JK","BBRM.JK","BBTN.JK","BBYB.JK","BCAP.JK","BCIC.JK","BCIP.JK","BDMN.JK","BEBS.JK","BEKS.JK","BEST.JK","BHIT.JK","BIKA.JK","BIMA.JK","BIPP.JK","BIRD.JK","BISI.JK","BJBR.JK","BJTM.JK","BKDP.JK","BKSL.JK","BKSW.JK","BLTA.JK","BLTZ.JK","BMAS.JK","BMHS.JK","BMRI.JK","BMSR.JK","BMTR.JK","BNBR.JK","BNGA.JK","BNII.JK","BNLI.JK","BOLT.JK","BOSS.JK","BPFI.JK","BPII.JK","BPTR.JK","BRAM.JK","BRIS.JK","BRMS.JK","BRNA.JK","BRPT.JK","BSDE.JK","BSIM.JK","BSSR.JK","BTEL.JK","BTON.JK","BTPN.JK","BTPS.JK","BUDI.JK","BUKA.JK","BUKK.JK","BULL.JK","BUMI.JK","BUVA.JK","BVIC.JK","BWPT.JK","BYAN.JK","CAKK.JK","CAMP.JK","CANI.JK","CARE.JK","CASS.JK","CBMF.JK","CEKA.JK","CENT.JK","CFIN.JK","CINT.JK","CITA.JK","CITY.JK","CLAY.JK","CLEO.JK","CLPI.JK","CMNP.JK","CMPP.JK","CNKO.JK","CNTX.JK","COWL.JK","CPIN.JK","CPRI.JK","CPRO.JK","CSAP.JK","CTBN.JK","CTRA.JK","CTTH.JK","DADA.JK","DART.JK","DAYA.JK","DEAL.JK","DEFI.JK","DEWA.JK","DGIK.JK","DILD.JK","DKFT.JK","DLTA.JK","DMAS.JK","DMMX.JK","DNAR.JK","DOID.JK","DPNS.JK","DPUM.JK","DSFI.JK","DSNG.JK","DSSA.JK","DUTI.JK","DVLA.JK","DWGL.JK","DYAN.JK","EAST.JK","ECII.JK","EDGE.JK","EKAD.JK","ELSA.JK","ELTY.JK","EMDE.JK","EMTK.JK","ENRG.JK","EPMT.JK","ERAA.JK","ERTX.JK","ESSA.JK","ESTA.JK","ESTI.JK","ETWA.JK","EXCL.JK","FAST.JK","FASW.JK","FISH.JK","FITT.JK","FLMC.JK","FMII.JK","FORU.JK","FPNI.JK","FUTR.JK","GAMA.JK","GDST.JK","GDYR.JK","GEMS.JK","GGRM.JK","GHON.JK","GIAA.JK","GJTL.JK","GLVA.JK","GMTD.JK","GOLD.JK","GOLL.JK","GOOD.JK","GPRA.JK","GTBO.JK","GWSA.JK","GZCO.JK","HADE.JK","HALO.JK","HDFA.JK","HEAL.JK","HERO.JK","HEXA.JK","HITS.JK","HMSP.JK","HOME.JK","HOTL.JK","HRTA.JK","HRUM.JK","IATA.JK","IBFN.JK","IBST.JK","ICBP.JK","ICON.JK","IDPR.JK","IGAR.JK","IIKP.JK","IKAI.JK","IKBI.JK","IMAS.JK","IMPC.JK","INAF.JK","INAI.JK","INCF.JK","INCI.JK","INCO.JK","INDF.JK","INDR.JK","INDS.JK","INDX.JK","INKP.JK","INPC.JK","INPP.JK","INRU.JK","INTA.JK","INTD.JK","INTP.JK","IPOL.JK","ISAT.JK","ITMA.JK","ITMG.JK","JAST.JK","JAWA.JK","JAYA.JK","JECC.JK","JGLE.JK","JIHD.JK","JKON.JK","JPFA.JK","JRPT.JK","JSKY.JK","JSMR.JK","JSPT.JK","JTPE.JK","KAEF.JK","KARW.JK","KAYU.JK","KBRI.JK","KDSI.JK","KEEN.JK","KIAS.JK","KICI.JK","KIJA.JK","KKGI.JK","KLBF.JK","KOBX.JK","KOIN.JK","KONI.JK","KOPI.JK","KPIG.JK","KRAS.JK","KREN.JK","LABA.JK","LAND.JK","LAPD.JK","LCGP.JK","LCKM.JK","LEAD.JK","LINK.JK","LION.JK","LMAS.JK","LMPI.JK","LMSH.JK","LPCK.JK","LPGI.JK","LPIN.JK","LPKR.JK","LPLI.JK","LPPF.JK","LPPS.JK","LRNA.JK","LSIP.JK","LTLS.JK","LUCK.JK","MAGP.JK","MAIN.JK","MAPI.JK","MBAP.JK","MBSS.JK","MCAS.JK","MCOR.JK","MDKA.JK","MDLN.JK","MDRN.JK","MEDC.JK","MEGA.JK","MERK.JK","META.JK","MFMI.JK","MGNA.JK","MGRO.JK","MICE.JK","MIDI.JK","MIKA.JK","MINA.JK","MITI.JK","MKNT.JK","MLBI.JK","MLIA.JK","MLPT.JK","MMLP.JK","MNCN.JK","MOLI.JK","MPMX.JK","MPOW.JK","MPPA.JK","MRAT.JK","MREI.JK","MSIN.JK","MSKY.JK","MTDL.JK","MTEL.JK","MTFN.JK","MTLA.JK","MTRA.JK","MTWI.JK","MYOR.JK","MYTX.JK","NELY.JK","NICK.JK","NICL.JK","NIKL.JK","NIRO.JK","NISP.JK","NOBU.JK","NRCA.JK","NUSA.JK","NZIA.JK","OASA.JK","OBMD.JK","OCAP.JK","OKAS.JK","OLIV.JK","OMRE.JK","OPMS.JK","PACK.JK","PADA.JK","PADI.JK","PALM.JK","PAMG.JK","PANS.JK","PBID.JK","PBRX.JK","PBSA.JK","PCAR.JK","PDES.JK","PEGE.JK","PEHA.JK","PGAS.JK","PGLI.JK","PICO.JK","PJAA.JK","PKPK.JK","PLAS.JK","PLIN.JK","PMJS.JK","PMMP.JK","PNBN.JK","PNBS.JK","PNIN.JK","PNLF.JK","POLA.JK","POOL.JK","PORT.JK","POWR.JK","PPRE.JK","PRIM.JK","PSAB.JK","PSDN.JK","PSGO.JK","PTBA.JK","PTPP.JK","PTRO.JK","PURA.JK","PWON.JK","PYFA.JK","RAJA.JK","RALS.JK","RANC.JK","RBMS.JK","RDTX.JK","REAL.JK","RELI.JK","RIMO.JK","RISE.JK","RODA.JK","ROTI.JK","RUIS.JK","SAFE.JK","SAME.JK","SAPX.JK","SATU.JK","SCCO.JK","SCMA.JK","SDPC.JK","SDRA.JK","SFAN.JK","SGER.JK","SGRO.JK","SHID.JK","SHIP.JK","SIDO.JK","SILO.JK","SIMA.JK","SIMP.JK","SIPD.JK","SKBM.JK","SKLT.JK","SKYB.JK","SLIS.JK","SMBR.JK","SMCB.JK","SMDM.JK","SMDR.JK","SMGR.JK","SMKL.JK","SMMA.JK","SMMT.JK","SMRA.JK","SMRU.JK","SMSM.JK","SNLK.JK","SOCI.JK","SONA.JK","SOSS.JK","SPMA.JK","SPTO.JK","SQMI.JK","SRAJ.JK","SRIL.JK","SRSN.JK","SSIA.JK","SSTM.JK","STAR.JK","STTP.JK","SUGI.JK","SULI.JK","SUPR.JK","SWAT.JK","TAXI.JK","TBIG.JK","TBLA.JK","TCID.JK","TCPI.JK","TDPM.JK","TEBE.JK","TECH.JK","TELE.JK","TFAS.JK","TGKA.JK","TIFA.JK","TINS.JK","TIRA.JK","TIRT.JK","TKIM.JK","TLKM.JK","TMAS.JK","TMPO.JK","TNCA.JK","TOBA.JK","TOTL.JK","TOTO.JK","TOWR.JK","TPIA.JK","TPMA.JK","TRAM.JK","TRIL.JK","TRIM.JK","TRIO.JK","TRIS.JK","TRST.JK","TRUK.JK","TSPC.JK","TUGU.JK","UANG.JK","UCID.JK","UFOE.JK","ULTJ.JK","UNIC.JK","UNIT.JK","UNSP.JK","UNTR.JK","UNVR.JK","VICO.JK","VINS.JK","VIVA.JK","VOKS.JK","WAPO.JK","WEGE.JK","WEHA.JK","WICO.JK","WIIM.JK","WIKA.JK","WINS.JK","WMUU.JK","WOMF.JK","WOOD.JK","WSBP.JK","WSKT.JK","WTON.JK","YELO.JK","YPAS.JK","YULE.JK","ZBRA.JK"
];

let newsCache = { data: [], lastFetch: 0, TTL: 300000 };

// ==================== RSS FALLBACK ====================
const RSS_FEEDS = [
  { url: 'https://www.antaranews.com/rss/ekonomi.xml', source: 'Antara Ekonomi' },
  { url: 'https://www.antaranews.com/rss/ekonomi-bisnis.xml', source: 'Antara Bisnis' },
  { url: 'https://www.antaranews.com/rss/ekonomi-bursa.xml', source: 'Antara Bursa' },
  { url: 'https://www.cnbcindonesia.com/rss', source: 'CNBC Indonesia' },
];

function parseRssItems(xmlText, sourceName) {
  const items = [];
  if (!xmlText || typeof xmlText !== 'string') return items;
  if (xmlText.includes('<!DOCTYPE') || xmlText.includes('<html')) return items;

  const blocks = xmlText.split('<item>');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('</item>')[0];

    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    let title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';

    let link = '';
    const linkHref = block.match(/<link[^>]*href=["']([^"']+)["']/i);
    if (linkHref) link = linkHref[1];
    else {
      const linkMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      if (linkMatch) link = linkMatch[1].trim();
    }

    const descMatch = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    let description = descMatch ? descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';

    const pubMatch = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
    const pubDateStr = pubMatch ? pubMatch[1].trim() : '';

    if (title.length > 15) {
      let publishedAt = new Date().toISOString();
      try { if (pubDateStr) publishedAt = new Date(pubDateStr).toISOString(); } catch(e) {}

      let summary = description
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z#0-9]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 250);

      items.push({
        id: 'news_' + Math.random().toString(36).substr(2, 9),
        title,
        summary: summary || "Berita ekonomi Indonesia",
        publishedAt,
        source: sourceName,
        url: link || '#',
        category: 'general',
        sentiment: null,
        analysis: null
      });
    }
  }
  return items;
}

async function fetchFromRss() {
  for (const feed of RSS_FEEDS) {
    try {
      const resp = await fetch(feed.url, {
        headers: { 'User-Agent': 'AlphaScreener/1.0' },
        cf: { cacheTtl: 300 }
      });
      if (!resp.ok) continue;
      const xml = await resp.text();
      const items = parseRssItems(xml, feed.source);
      if (items.length > 0) return items;
    } catch (e) {
      console.error(`RSS ${feed.source} error:`, e.message);
    }
  }
  return [];
}

async function fetchLiveMacroNews(ndKey) {
  if (ndKey) {
    try {
      const params = new URLSearchParams({
        apikey: ndKey,
        q: 'ekonomi Indonesia OR IHSG OR bursa',
        country: 'id',
        language: 'id',
        size: '10'
      });
      const resp = await fetch(`https://newsdata.io/api/1/latest?${params}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 'success' && data.results?.length > 0) {
          return data.results.map(item => ({
            id: item.article_id || Math.random().toString(36).substr(2, 9),
            title: item.title || '',
            summary: item.description || '',
            publishedAt: item.pubDate || new Date().toISOString(),
            source: item.source_id || 'NewsData',
            url: item.link || '#',
            category: 'general',
            sentiment: null,
            analysis: null
          }));
        }
      }
    } catch (e) {
      console.error('NewsData error:', e.message);
    }
  }
  console.log('🔄 Menggunakan RSS fallback...');
  return await fetchFromRss();
}

async function enrichWithAI(articles, geminiKey, topN = 3) {
  if (!articles || articles.length === 0) return articles;

  const top = articles.slice(0, topN);

  // Coba Gemini
  if (geminiKey) {
    try {
      await Promise.allSettled(top.map(async (art) => {
        try {
          const prompt = `Analisis berita ekonomi berikut dalam 3-4 kalimat profesional dalam Bahasa Indonesia. Sebutkan dampak makro dan sektor yang terdampak:\n\nJudul: ${art.title}\nRingkasan: ${art.summary || ''}`;
          const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          const data = await resp.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text && text.length > 40) art.analysis = text.trim();
        } catch (e) {}
      }));
    } catch (e) {}
  }

  // Fallback penjelasan otomatis
  top.forEach(art => {
    if (!art.analysis || art.analysis.length < 30) {
      art.analysis = 
        `Berita ini membahas ${art.title.toLowerCase()}. ${art.summary || ''} ` +
        `Perkembangan ini dapat memengaruhi sentimen pasar saham dan keputusan investasi di sektor terkait. ` +
        `Investor disarankan untuk terus memantau informasi terbaru dan mempertimbangkan faktor risiko sebelum mengambil keputusan investasi.`;
    }
  });

  return articles;
}

function convertToCSV(results) {
  const headers = 'ticker,score,signal,confidence,entry,tp1,tp2,sl,lastClose,zScore,volSpike,regime,per,hurst,pin,imbalance,reasons';
  const rows = results.map(r => {
    if (r.error) return `${r.ticker},error,,,,,,,,,,,,,,${r.error}`;
    return `${r.ticker},${r.score},${r.signal},${r.confidence},${r.entry},${r.take_profit?.[0]||''},${r.take_profit?.[1]||''},${r.stop_loss},${r.lastClose},${r.zScore?.toFixed(2)},${r.volSpike},${r.regime},${r.per},${r.hurst},${r.pin},${r.imbalance},"${(r.reasons||[]).join('; ')}"`;
  });
  return headers + '\n' + rows.join('\n');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. PWA Manifest
    if (url.pathname === '/manifest.json') {
      return new Response(JSON.stringify({
        name: "AlphaScreener IDX", short_name: "AlphaScreener",
        description: "Professional quantitative IDX stock screening engine",
        start_url: "/dashboard", display: "standalone",
        background_color: "#FAF9F7", theme_color: "#D97757",
        icons: [{ src: "data:image/svg+xml;base64," + btoa(LOGO_SVG), sizes: "512x512", type: "image/svg+xml" }]
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Service Worker (tidak error lagi)
    if (url.pathname === '/sw.js') {
      return new Response(
        `const CACHE_NAME='alphascreener-v2';
self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil(clients.claim()); });
self.addEventListener('fetch',e=>{
  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{
      if(resp.ok && e.request.method==='GET'){
        return caches.open(CACHE_NAME).then(cache=>{cache.put(e.request,resp.clone());return resp;});
      }
      return resp;
    }))
  );
});`, { headers: { 'Content-Type': 'application/javascript' } });
    }

    // 3. Ticker list
    if (url.pathname === '/tickers') {
      return Response.json({ tickers: DEFAULT_TICKERS, total: DEFAULT_TICKERS.length });
    }

    // 4. Screening
    if (url.pathname === '/screen') {
      let tickers = [], minPrice = 0, maxPrice = Infinity;
      if (request.method === 'POST') {
        try { const body = await request.json(); tickers = body.tickers || []; minPrice = body.min_price || 0; maxPrice = body.max_price || Infinity; } catch (e) { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
      } else if (request.method === 'GET') {
        const t = url.searchParams.get('tickers'); if (t) tickers = t.split(',');
        minPrice = parseFloat(url.searchParams.get('min_price')) || 0; maxPrice = parseFloat(url.searchParams.get('max_price')) || Infinity;
      }
      if (tickers.length === 0) return Response.json({ error: 'Berikan tickers' }, { status: 400 });
      if (tickers.length > 50) tickers = tickers.slice(0, 50);

      const results = await batchedProcess(tickers, minPrice, maxPrice);

      if (env.AV_KEY && env.ND_KEY) {
        const topCandidates = results.filter(r => !r.error && r.score > 50).slice(0, 10);
        if (topCandidates.length > 0) {
          const newsResults = await Promise.allSettled(topCandidates.map(r => computeNewsSentiment(r.ticker, env.AV_KEY, env.ND_KEY)));
          topCandidates.forEach((item, idx) => {
            if (newsResults[idx].status === 'fulfilled') {
              const n = newsResults[idx].value;
              item.newsScore = n.newsScore ?? null;
              item.newsConfidence = n.newsConfidence ?? null;
              item.newsArticles = n.articleCount ?? 0;
            }
          });
        }
      }
      results.sort((a, b) => (b.score || 0) - (a.score || 0));
      return Response.json(results);
    }

    // 5. News Endpoint (with cache & RSS fallback)
    if (url.pathname === '/news') {
      const now = Date.now(), force = url.searchParams.get('force') === '1';
      if (!force && newsCache.data.length > 0 && (now - newsCache.lastFetch) < newsCache.TTL) {
        return Response.json(newsCache.data);
      }
      try {
        const articles = await fetchLiveMacroNews(env.ND_KEY);
        if (articles.length === 0) return Response.json({ error: 'Sumber berita sedang tidak tersedia.' });
        const enriched = await enrichWithAI(articles, env.GEMINI_API_KEY, 3);
        newsCache = { data: enriched, lastFetch: now, TTL: 300000 };
        return Response.json(enriched);
      } catch (e) {
        return Response.json({ error: 'Gagal memuat berita' }, { status: 500 });
      }
    }

    // Export
    if (url.pathname === '/export') {
      const t = url.searchParams.get('tickers'); const tickers = t ? t.split(',') : [];
      if (tickers.length === 0) return Response.json({ error: '?tickers=...' }, { status: 400 });
      const results = await batchedProcess(tickers.slice(0, 50), 0, Infinity);
      return new Response(convertToCSV(results), { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="alphascreener.csv"' } });
    }

    // Dashboard
    if (url.pathname === '/dashboard' || url.pathname === '/') {
      // AUTO CACHE-BUST: ganti angka BUILD_TIME setiap kali deploy
      // Contoh: '20260428_1' -> '20260428_2' -> dst
      const BUILD_TIME = '20260428_1';
      const resp = await env.ASSETS.fetch(new URL('/dashboard.html', request.url));
      let html = await resp.text();
      html = html
        .replace('/dashboard.css"', `/dashboard.css?v=${BUILD_TIME}"`)
        .replace('/dashboard.js"', `/dashboard.js?v=${BUILD_TIME}"`);
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    return new Response('AlphaScreener IDX API - OK', { status: 200 });
  }
};

// ==================== CORE PROCESSING ====================
async function processTicker(ticker, minPrice, maxPrice) {
  const candles = await fetchCandles(ticker);
  if (!candles || candles.length < 20) return { ticker, error: 'Data tidak cukup' };

  const ind = computeIndicators(candles);
  const gap = analyzeGap(candles);

  const nmfData = computeNMF(candles);
  const imbalance = computeMicrostructureImbalance(candles);
  const kyle = computeKyleLambda(candles, nmfData.nmf);
  const pin = computePINProxy(candles, nmfData.nmf);
  const nmfAuto = computeNMFAutocorrelation(nmfData.nmf);

  const regimeData = detectVolatilityRegime(candles);
  const rangeComp = computeRangeCompression(candles);
  const varianceRatio = computeVarianceRatio(candles);
  const covDecomp = computeRealizedCovDecomposition(candles);
  const hurstData = computeHurstExponent(candles);

  const per = computePriceEfficiencyRatio(candles);
  const volPersist = computeVolumeAnomalyPersistence(candles);
  const amihud = computeAmihudIlliquidity(candles);
  const entropy = computeReturnEntropy(candles);
  const lz = computeLZComplexity(candles);

  const skew = computeRealizedSkewness(candles);
  const evt = computeEVT(candles);
  const structBreak = computeStructuralBreak(candles);

  const advanced = {
    cnmfSlope: nmfData.cnmfSlope, imbalance,
    kyleLambdaTrend: kyle.lambdaTrend, pin,
    nmfPersistent: nmfAuto.persistent,
    regime: regimeData.regime, vrr: regimeData.vrr,
    rcr: rangeComp.rcr, trending: varianceRatio.trending,
    asymmetry: covDecomp.asymmetry, hurst: hurstData.hurst,
    per, volPersistence: volPersist, liquidityImproving: amihud.liquidityImproving,
    entropy, lzComplexity: lz, skew, heavyTail: evt.heavyTail,
    structuralBreakBullish: structBreak.breakDetected && structBreak.breakDirection === 'bullish'
  };

  const sig = generateSignal(ind, gap, advanced);
  const score = computeScore(ind, gap, sig, advanced);
  const lastClose = ind.closes[ind.closes.length - 1];

  if (lastClose < minPrice || lastClose > maxPrice) return null;

  const risk = calculateRiskLevels(candles, sig, ind, gap);
  return {
    ticker, score, signal: sig.signal, confidence: sig.confidence,
    entry: risk.entry, take_profit: risk.take_profit, stop_loss: risk.stop_loss,
    reasons: sig.reasons, lastClose,
    zScore: ind.zScore[ind.closes.length - 1],
    volSpike: Number(ind.volSpikeRatio[ind.closes.length - 1].toFixed(2)),
    regime: advanced.regime, vrr: advanced.vrr, cnmfSlope: advanced.cnmfSlope,
    per: advanced.per, hurst: advanced.hurst, pin: advanced.pin,
    imbalance: advanced.imbalance, lzComplexity: advanced.lzComplexity,
    newsScore: null, newsConfidence: null, newsArticles: 0
  };
}

async function batchedProcess(tickers, minPrice, maxPrice, batchSize = 6) {
  const results = [];
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(t => processTicker(t, minPrice, maxPrice)));
    results.push(...settled.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean));
  }
  return results;
}
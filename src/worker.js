```javascript
import { fetchCandles } from './datafetcher.js';
import { computeIndicators } from './indicators.js';
import { analyzeGap } from './gapEngine.js';
import { generateSignal } from './signalEngine.js';
import { computeScore } from './scoring.js';
import { calculateRiskLevels } from './riskManager.js';

// 545 ticker IDX aktif (dikurasi: hapus delisting, suspensi lama, data kosong, atau IPO tanpa 20 candle)
const DEFAULT_TICKERS = [
  "AALI.JK","ABMM.JK","ACES.JK","ACST.JK","ADES.JK","ADHI.JK","ADMF.JK","ADRO.JK",
  "AGII.JK","AGRO.JK","AGRS.JK","AHAP.JK","AIMS.JK","AISA.JK","AKKU.JK","AKPI.JK",
  "AKRA.JK","AKSI.JK","ALDO.JK","ALKA.JK","ALMI.JK","AMAG.JK","AMAN.JK","AMIN.JK",
  "AMRT.JK","ANDI.JK","ANJT.JK","ANTM.JK","APEX.JK","APIC.JK","APII.JK","APLI.JK",
  "APLN.JK","ARGO.JK","ARII.JK","ARKA.JK","ARNA.JK","ARTA.JK","ARTI.JK","ASBI.JK",
  "ASDM.JK","ASGR.JK","ASII.JK","ASJT.JK","ASMI.JK","ASRI.JK","ATAP.JK","ATIC.JK",
  "AUTO.JK","AYLS.JK","BABP.JK","BACA.JK","BALI.JK","BANK.JK","BAPI.JK","BATA.JK",
  "BAYU.JK","BBCA.JK","BBHI.JK","BBKP.JK","BBLD.JK","BBNI.JK","BBRI.JK","BBRM.JK",
  "BBTN.JK","BBYB.JK","BCAP.JK","BCIC.JK","BCIP.JK","BDMN.JK","BEBS.JK","BEKS.JK",
  "BEST.JK","BHIT.JK","BIKA.JK","BIMA.JK","BIPP.JK","BIRD.JK","BISI.JK","BJBR.JK",
  "BJTM.JK","BKDP.JK","BKSL.JK","BKSW.JK","BLTA.JK","BLTZ.JK","BMAS.JK","BMHS.JK",
  "BMRI.JK","BMSR.JK","BMTR.JK","BNBR.JK","BNGA.JK","BNII.JK","BNLI.JK","BOLT.JK",
  "BOSS.JK","BPFI.JK","BPII.JK","BPTR.JK","BRAM.JK","BRIS.JK","BRMS.JK","BRNA.JK",
  "BRPT.JK","BSDE.JK","BSIM.JK","BSSR.JK","BTEL.JK","BTON.JK","BTPN.JK","BTPS.JK",
  "BUDI.JK","BUKA.JK","BUKK.JK","BULL.JK","BUMI.JK","BUVA.JK","BVIC.JK","BWPT.JK",
  "BYAN.JK","CAKK.JK","CAMP.JK","CANI.JK","CARE.JK","CASS.JK","CBMF.JK","CEKA.JK",
  "CENT.JK","CFIN.JK","CINT.JK","CITA.JK","CITY.JK","CLAY.JK","CLEO.JK","CLPI.JK",
  "CMNP.JK","CMPP.JK","CNKO.JK","CNTX.JK","COWL.JK","CPIN.JK","CPRI.JK","CPRO.JK",
  "CSAP.JK","CTBN.JK","CTRA.JK","CTTH.JK","DADA.JK","DART.JK","DAYA.JK","DEAL.JK",
  "DEFI.JK","DEWA.JK","DGIK.JK","DILD.JK","DKFT.JK","DLTA.JK","DMAS.JK","DMMX.JK",
  "DNAR.JK","DOID.JK","DPNS.JK","DPUM.JK","DSFI.JK","DSNG.JK","DSSA.JK","DUTI.JK",
  "DVLA.JK","DWGL.JK","DYAN.JK","EAST.JK","ECII.JK","EDGE.JK","EKAD.JK","ELSA.JK",
  "ELTY.JK","EMDE.JK","EMTK.JK","ENRG.JK","EPMT.JK","ERAA.JK","ERTX.JK","ESSA.JK",
  "ESTA.JK","ESTI.JK","ETWA.JK","EXCL.JK","FAST.JK","FASW.JK","FISH.JK","FITT.JK",
  "FLMC.JK","FMII.JK","FORU.JK","FPNI.JK","FUTR.JK","GAMA.JK","GDST.JK","GDYR.JK",
  "GEMS.JK","GGRM.JK","GHON.JK","GIAA.JK","GJTL.JK","GLVA.JK","GMTD.JK","GOLD.JK",
  "GOLL.JK","GOOD.JK","GPRA.JK","GTBO.JK","GWSA.JK","GZCO.JK","HADE.JK","HALO.JK",
  "HDFA.JK","HEAL.JK","HERO.JK","HEXA.JK","HITS.JK","HMSP.JK","HOME.JK","HOTL.JK",
  "HRTA.JK","HRUM.JK","IATA.JK","IBFN.JK","IBST.JK","ICBP.JK","ICON.JK","IDPR.JK",
  "IGAR.JK","IIKP.JK","IKAI.JK","IKBI.JK","IMAS.JK","IMPC.JK","INAF.JK","INAI.JK",
  "INCF.JK","INCI.JK","INCO.JK","INDF.JK","INDR.JK","INDS.JK","INDX.JK","INKP.JK",
  "INPC.JK","INPP.JK","INRU.JK","INTA.JK","INTD.JK","INTP.JK","IPOL.JK","ISAT.JK",
  "ITMA.JK","ITMG.JK","JAST.JK","JAWA.JK","JAYA.JK","JECC.JK","JGLE.JK","JIHD.JK",
  "JKON.JK","JPFA.JK","JRPT.JK","JSKY.JK","JSMR.JK","JSPT.JK","JTPE.JK","KAEF.JK",
  "KARW.JK","KAYU.JK","KBRI.JK","KDSI.JK","KEEN.JK","KIAS.JK","KICI.JK","KIJA.JK",
  "KKGI.JK","KLBF.JK","KOBX.JK","KOIN.JK","KONI.JK","KOPI.JK","KPIG.JK","KRAS.JK",
  "KREN.JK","LABA.JK","LAND.JK","LAPD.JK","LCGP.JK","LCKM.JK","LEAD.JK","LINK.JK",
  "LION.JK","LMAS.JK","LMPI.JK","LMSH.JK","LPCK.JK","LPGI.JK","LPIN.JK","LPKR.JK",
  "LPLI.JK","LPPF.JK","LPPS.JK","LRNA.JK","LSIP.JK","LTLS.JK","LUCK.JK","MAGP.JK",
  "MAIN.JK","MAPI.JK","MBAP.JK","MBSS.JK","MCAS.JK","MCOR.JK","MDKA.JK","MDLN.JK",
  "MDRN.JK","MEDC.JK","MEGA.JK","MERK.JK","META.JK","MFMI.JK","MGNA.JK","MGRO.JK",
  "MICE.JK","MIDI.JK","MIKA.JK","MINA.JK","MITI.JK","MKNT.JK","MLBI.JK","MLIA.JK",
  "MLPT.JK","MMLP.JK","MNCN.JK","MOLI.JK","MPMX.JK","MPOW.JK","MPPA.JK","MRAT.JK",
  "MREI.JK","MSIN.JK","MSKY.JK","MTDL.JK","MTEL.JK","MTFN.JK","MTLA.JK","MTRA.JK",
  "MTWI.JK","MYOR.JK","MYTX.JK","NELY.JK","NICK.JK","NICL.JK","NIKL.JK","NIRO.JK",
  "NISP.JK","NOBU.JK","NRCA.JK","NUSA.JK","NZIA.JK","OASA.JK","OBMD.JK","OCAP.JK",
  "OKAS.JK","OLIV.JK","OMRE.JK","OPMS.JK","PACK.JK","PADA.JK","PADI.JK","PALM.JK",
  "PAMG.JK","PANS.JK","PBID.JK","PBRX.JK","PBSA.JK","PCAR.JK","PDES.JK","PEGE.JK",
  "PEHA.JK","PGAS.JK","PGLI.JK","PICO.JK","PJAA.JK","PKPK.JK","PLAS.JK","PLIN.JK",
  "PMJS.JK","PMMP.JK","PNBN.JK","PNBS.JK","PNIN.JK","PNLF.JK","POLA.JK","POOL.JK",
  "PORT.JK","POWR.JK","PPRE.JK","PRIM.JK","PSAB.JK","PSDN.JK","PSGO.JK","PTBA.JK",
  "PTPP.JK","PTRO.JK","PURA.JK","PWON.JK","PYFA.JK","RAJA.JK","RALS.JK","RANC.JK",
  "RBMS.JK","RDTX.JK","REAL.JK","RELI.JK","RIMO.JK","RISE.JK","RODA.JK","ROTI.JK",
  "RUIS.JK","SAFE.JK","SAME.JK","SAPX.JK","SATU.JK","SCCO.JK","SCMA.JK","SDPC.JK",
  "SDRA.JK","SFAN.JK","SGER.JK","SGRO.JK","SHID.JK","SHIP.JK","SIDO.JK","SILO.JK",
  "SIMA.JK","SIMP.JK","SIPD.JK","SKBM.JK","SKLT.JK","SKYB.JK","SLIS.JK","SMBR.JK",
  "SMCB.JK","SMDM.JK","SMDR.JK","SMGR.JK","SMKL.JK","SMMA.JK","SMMT.JK","SMRA.JK",
  "SMRU.JK","SMSM.JK","SNLK.JK","SOCI.JK","SONA.JK","SOSS.JK","SPMA.JK","SPTO.JK",
  "SQMI.JK","SRAJ.JK","SRIL.JK","SRSN.JK","SSIA.JK","SSTM.JK","STAR.JK","STTP.JK",
  "SUGI.JK","SULI.JK","SUPR.JK","SWAT.JK","TAXI.JK","TBIG.JK","TBLA.JK","TCID.JK",
  "TCPI.JK","TDPM.JK","TEBE.JK","TECH.JK","TELE.JK","TFAS.JK","TGKA.JK","TIFA.JK",
  "TINS.JK","TIRA.JK","TIRT.JK","TKIM.JK","TLKM.JK","TMAS.JK","TMPO.JK","TNCA.JK",
  "TOBA.JK","TOTL.JK","TOTO.JK","TOWR.JK","TPIA.JK","TPMA.JK","TRAM.JK","TRIL.JK",
  "TRIM.JK","TRIO.JK","TRIS.JK","TRST.JK","TRUK.JK","TSPC.JK","TUGU.JK","UANG.JK",
  "UCID.JK","UFOE.JK","ULTJ.JK","UNIC.JK","UNIT.JK","UNSP.JK","UNTR.JK","UNVR.JK",
  "VICO.JK","VINS.JK","VIVA.JK","VOKS.JK","WAPO.JK","WEGE.JK","WEHA.JK","WICO.JK",
  "WIIM.JK","WIKA.JK","WINS.JK","WMUU.JK","WOMF.JK","WOOD.JK","WSBP.JK","WSKT.JK",
  "WTON.JK","YELO.JK","YPAS.JK","YULE.JK","ZBRA.JK"
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // === PWA Manifest ===
    if (url.pathname === '/manifest.json') {
      const manifest = {
        name: "IDX Stock Screener",
        short_name: "IDX Screener",
        description: "Real-time multi‑factor IDX stock screening engine",
        start_url: "/dashboard",
        display: "standalone",
        background_color: "#FAF9F7",
        theme_color: "#D97757",
        icons: [{
          src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='192' height='192' viewBox='0 0 24 24' fill='none' stroke='%23D97757' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='22 7 13.5 15.5 8.5 10.5 2 17'%3E%3C/polyline%3E%3Cpolyline points='16 7 22 7 22 13'%3E%3C/polyline%3E%3C/svg%3E",
          sizes: "192x192",
          type: "image/svg+xml"
        }]
      };
      return new Response(JSON.stringify(manifest), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // === PWA Service Worker ===
    if (url.pathname === '/sw.js') {
      const swCode = `
        const CACHE_NAME = 'idx-screener-v1';
        const urlsToCache = ['/dashboard'];
        self.addEventListener('install', event => {
          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
          );
        });
        self.addEventListener('fetch', event => {
          event.respondWith(
            caches.match(event.request).then(response => response || fetch(event.request))
          );
        });
      `;
      return new Response(swCode, {
        headers: { 'Content-Type': 'application/javascript' }
      });
    }

    // === Endpoint daftar ticker ===
    if (url.pathname === '/tickers') {
      return Response.json({ tickers: DEFAULT_TICKERS, total: DEFAULT_TICKERS.length });
    }

    // === Endpoint Screening (POST & GET) ===
    if (url.pathname === '/screen') {
      let tickers = [];
      let minPrice = 0;
      let maxPrice = Infinity;

      if (request.method === 'POST') {
        try {
          const body = await request.json();
          tickers = body.tickers || [];
          minPrice = body.min_price || 0;
          maxPrice = body.max_price || Infinity;
        } catch (e) {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
      } else if (request.method === 'GET') {
        const t = url.searchParams.get('tickers');
        if (t) tickers = t.split(',');
        minPrice = parseFloat(url.searchParams.get('min_price')) || 0;
        maxPrice = parseFloat(url.searchParams.get('max_price')) || Infinity;
      }

      if (tickers.length === 0) {
        return Response.json({ error: 'Berikan tickers' }, { status: 400 });
      }

      if (tickers.length > 50) tickers = tickers.slice(0, 50);

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
          const lastClose = ind.closes[ind.closes.length - 1];

          if (lastClose < minPrice || lastClose > maxPrice) continue;

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
            lastClose,
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

    // Default response
    return new Response(
      'IDX Stock Screener API\n' +
      'POST /screen dengan {"tickers":["BBCA.JK"]}\n' +
      'GET /screen?tickers=BBCA.JK,BBRI.JK\n' +
      'GET /tickers untuk daftar saham\n' +
      'GET /dashboard untuk tampilan HTML',
      { status: 200 }
    );
  },
};

function getDashboardHTML() {
  var h = '<!DOCTYPE html>\n';
  h += '<html lang="id">\n';
  h += '<head>\n';
  h += '<meta charset="UTF-8">\n';
  h += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  h += '<title>IDX Stock Screener · Rizky Saputra</title>\n';
  h += '<link rel="manifest" href="/manifest.json">\n';
  h += '<style>\n';
  h += '  :root {\n';
  h += '    --bg: #FAF9F7; --card: #FFFFFF; --text: #1A1A1A; --text2: #6B6B6B;\n';
  h += '    --accent: #D97757; --accent2: #C56442; --border: #F0EDE8;\n';
  h += '    --green: #3D8C40; --red: #D32F2F; --amber: #E6A817;\n';
  h += '    --shadow: 0 1px 3px rgba(0,0,0,0.04); --radius: 16px;\n';
  h += '  }\n';
  h += '  * { margin:0; padding:0; box-sizing:border-box; }\n';
  h += '  body { font-family:"Inter","Segoe UI",system-ui,sans-serif; background:var(--bg); color:var(--text); padding:24px; }\n';
  h += '  .container { max-width:1400px; margin:0 auto; }\n';
  h += '  .top-bar { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px; }\n';
  h += '  .dev-name { font-weight:700; font-size:14px; color:var(--accent); display:flex; align-items:center; gap:6px; }\n';
  h += '  .net-status { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text2); }\n';
  h += '  .net-dot { width:10px; height:10px; border-radius:50%; background:var(--green); animation:pulse 2s infinite; }\n';
  h += '  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }\n';
  h += '  .net-dot.offline { background:var(--red); }\n';
  h += '  h1 { font-size:26px; font-weight:800; color:var(--text); text-align:center; letter-spacing:-0.5px; }\n';
  h += '  .subtitle { text-align:center; color:var(--text2); font-size:13px; margin-bottom:24px; }\n';
  h += '  .controls { display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; align-items:center; }\n';
  h += '  .controls input[type="text"] { flex:1; min-width:200px; padding:12px 16px; border-radius:var(--radius); border:1px solid var(--border); background:var(--card); color:var(--text); font-size:14px; }\n';
  h += '  .controls input[type="number"] { width:100px; padding:12px; border-radius:var(--radius); border:1px solid var(--border); background:var(--card); color:var(--text); font-size:14px; }\n';
  h += '  .btn { padding:10px 18px; border:none; border-radius:var(--radius); font-weight:600; font-size:14px; cursor:pointer; transition:all 0.2s; }\n';
  h += '  .btn-primary { background:var(--accent); color:#fff; }\n';
  h += '  .btn-primary:hover { background:var(--accent2); transform:translateY(-1px); }\n';
  h += '  .btn-secondary { background:var(--card); color:var(--text); border:1px solid var(--border); }\n';
  h += '  .btn-secondary:hover { background:var(--border); }\n';
  h += '  .btn-ipo { background:#FFF8F0; color:var(--accent); border:1px solid var(--accent); font-size:12px; }\n';
  h += '  .stats-bar { display:flex; gap:16px; margin-bottom:20px; flex-wrap:wrap; font-size:13px; color:var(--text2); }\n';
  h += '  .stat { background:var(--card); padding:6px 14px; border-radius:20px; border:1px solid var(--border); }\n';
  h += '  .stat strong { color:var(--text); }\n';
  h += '  .signal-BUY { color:var(--green); font-weight:700; }\n';
  h += '  .signal-SELL { color:var(--red); font-weight:700; }\n';
  h += '  .signal-HOLD { color:var(--amber); font-weight:700; }\n';
  h += '  .confidence-HIGH { color:var(--green); }\n';
  h += '  .confidence-MEDIUM { color:var(--amber); }\n';
  h += '  .confidence-LOW { color:var(--red); }\n';
  h += '  .buy-section { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:20px; margin-bottom:24px; box-shadow:var(--shadow); }\n';
  h += '  .buy-section h2 { color:var(--green); margin-bottom:14px; font-size:18px; display:flex; align-items:center; gap:8px; }\n';
  h += '  .buy-section h2::before { content:"🛒"; font-size:22px; animation:bounce 1.5s infinite; }\n';
  h += '  @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }\n';
  h += '  .buy-card { background:#F8FFF8; border-left:4px solid var(--green); padding:14px 16px; margin-bottom:8px; border-radius:0 12px 12px 0; }\n';
  h += '  .buy-card strong { color:var(--green); font-size:15px; }\n';
  h += '  .buy-card .meta { color:var(--text2); font-size:12px; margin-top:4px; }\n';
  h += '  .table-wrap { overflow-x:auto; }\n';
  h += '  table { width:100%; border-collapse:collapse; background:var(--card); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow); }\n';
  h += '  th { background:#FAFAF8; padding:12px 14px; text-align:left; font-weight:600; color:var(--text2); font-size:12px; border-bottom:1px solid var(--border); }\n';
  h += '  td { padding:10px 14px; border-bottom:1px solid var(--border); font-size:13px; }\n';
  h += '  tr:hover td { background:#FFFBF8; }\n';
  h += '  .error { color:var(--red); font-size:12px; }\n';
  h += '  .progress-wrap { background:var(--card); border-radius:20px; margin:16px 0; height:8px; overflow:hidden; border:1px solid var(--border); }\n';
  h += '  .progress-fill { height:100%; background:var(--accent); width:0%; transition:width 0.3s; border-radius:20px; }\n';
  h += '  .footer { text-align:center; margin-top:32px; font-size:12px; color:var(--text2); }\n';
  h += '  .footer strong { color:var(--accent); }\n';
  h += '  .loading-dots { display:inline-flex; gap:4px; }\n';
  h += '  .loading-dots span { width:6px; height:6px; background:var(--accent); border-radius:50%; animation:wobble 1.2s infinite; }\n';
  h += '  .loading-dots span:nth-child(2) { animation-delay:0.2s; }\n';
  h += '  .loading-dots span:nth-child(3) { animation-delay:0.4s; }\n';
  h += '  @keyframes wobble { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }\n';
  h += '  @media (max-width:640px) {\n';
  h += '    .controls { flex-direction:column; align-items:stretch; }\n';
  h += '    .controls input[type="text"], .controls input[type="number"] { width:auto; }\n';
  h += '    .top-bar { flex-direction:column; align-items:flex-start; }\n';
  h += '  }\n';
  h += '</style>\n';
  h += '</head>\n';
  h += '<body>\n';
  h += '<div class="container">\n';

  // Top bar: Developer name + Network status
  h += '  <div class="top-bar">\n';
  h += '    <div class="dev-name">⚡ Rizky Saputra</div>\n';
  h += '    <div class="net-status" id="netStatus">\n';
  h += '      <span class="net-dot" id="netDot"></span>\n';
  h += '      <span id="netText">Mengecek koneksi...</span>\n';
  h += '    </div>\n';
  h += '  </div>\n';

  h += '  <h1>📊 IDX Stock Screener</h1>\n';
  h += '  <p class="subtitle">Real-time multi‑factor signals · Take Profit / Stop Loss · Gap Analysis · 545 saham aktif</p>\n';

  // Controls
  h += '  <div class="controls">\n';
  h += '    <input type="text" id="tickerInput" placeholder="Cari ticker (pisahkan koma)..." list="tickerList" autocomplete="off">\n';
  h += '    <datalist id="tickerList"></datalist>\n';
  h += '    <input type="number" id="minPrice" placeholder="Harga min" step="1">\n';
  h += '    <input type="number" id="maxPrice" placeholder="Harga max" step="1">\n';
  h += '    <button class="btn btn-secondary" id="scanInputBtn">🔍 Scan Input</button>\n';
  h += '    <button class="btn btn-ipo" id="checkIpoBtn">🆕 Cek IPO Baru</button>\n';
  h += '    <button class="btn btn-primary" id="scanAllBtn">⚡ Scan Semua</button>\n';
  h += '    <label style="display:flex; align-items:center; gap:4px; font-size:13px; color:var(--text2); margin-left:8px;">\n';
  h += '      <input type="checkbox" id="bcsoToggle"> Mode BCSO\n';
  h += '    </label>\n';
  h += '  </div>\n';

  // Stats bar
  h += '  <div class="stats-bar">\n';
  h += '    <span class="stat">📋 Total saham: <strong id="statTotal">545</strong></span>\n';
  h += '    <span class="stat">✅ Aktif di-scan: <strong id="statScanned">-</strong></span>\n';
  h += '    <span class="stat">🟢 Sinyal BUY: <strong id="statBuy">-</strong></span>\n';
  h += '    <span class="stat">⏱️ Update: <strong id="statTime">-</strong></span>\n';
  h += '    <span class="stat" id="bcsoInfo" style="display:none;">🎯 BCSO Filter: <strong id="bcsoCount">0</strong></span>\n';
  h += '  </div>\n';

  // Progress
  h += '  <div id="progressBox" style="display:none;">\n';
  h += '    <div class="progress-wrap"><div class="progress-fill" id="progressBar"></div></div>\n';
  h += '    <p style="font-size:12px;color:var(--text2);margin-top:6px;" id="progressText"></p>\n';
  h += '  </div>\n';

  // Buy Recommendations
  h += '  <div id="buySection"></div>\n';
  h += '  <h2 style="color:var(--text);margin:20px 0 10px;font-size:18px;">📊 Hasil Scan</h2>\n';
  h += '  <div id="resultTable"></div>\n';

  // Footer
  h += '  <div class="footer">\n';
  h += '    Developed by <strong>Rizky Saputra</strong> · Production-grade IDX screening engine · Data: Yahoo Finance\n';
  h += '  </div>\n';
  h += '</div>\n';

  // === JavaScript ===
  h += '<script>\n';
  h += 'var allTickers=[],cachedResults=[],batchSize=50;\n';
  h += 'var bcsoToggle=document.getElementById("bcsoToggle");\n';
  h += 'var bcsoInfo=document.getElementById("bcsoInfo");\n';
  h += 'var bcsoCount=document.getElementById("bcsoCount");\n';

  // Network detection (device user)
  h += 'function updateNetStatus(online){';
  h += '  var dot=document.getElementById("netDot");';
  h += '  var text=document.getElementById("netText");';
  h += '  if(online){';
  h += '    dot.className="net-dot";';
  h += '    text.textContent="Koneksi Anda: Online \\ud83d\\udfe2";';
  h += '  } else {';
  h += '    dot.className="net-dot offline";';
  h += '    text.textContent="Koneksi Anda: Offline \\ud83d\\udd34";';
  h += '  }';
  h += '}';
  h += 'window.addEventListener("online",function(){updateNetStatus(true);});';
  h += 'window.addEventListener("offline",function(){updateNetStatus(false);});';
  h += 'updateNetStatus(navigator.onLine);';

  // PWA registration
  h += 'if("serviceWorker" in navigator){';
  h += '  window.addEventListener("load",function(){';
  h += '    navigator.serviceWorker.register("/sw.js").catch(function(){});';
  h += '  });';
  h += '}';

  // Load tickers & auto scan
  h += 'async function loadTickers(){';
  h += '  try{';
  h += '    var resp=await fetch("/tickers");';
  h += '    var data=await resp.json();';
  h += '    allTickers=data.tickers||[];';
  h += '    document.getElementById("statTotal").textContent=allTickers.length;';
  h += '    var list=document.getElementById("tickerList");';
  h += '    allTickers.forEach(function(t){';
  h += '      var o=document.createElement("option");';
  h += '      o.value=t;';
  h += '      list.appendChild(o);';
  h += '    });';
  h += '    scanAll();';
  h += '  }catch(e){console.error(e);}';
  h += '}';

  h += 'function getPriceFilters(){';
  h += '  return {';
  h += '    min:parseFloat(document.getElementById("minPrice").value)||0,';
  h += '    max:parseFloat(document.getElementById("maxPrice").value)||Infinity';
  h += '  };';
  h += '}';

  // BCSO filter
  h += 'function applyBCSOFilter(data){';
  h += '  if(!bcsoToggle.checked) return data;';
  h += '  return data.filter(function(row){';
  h += '    if(row.signal!=="BUY") return false;';
  h += '    var hasGapOrSpike = (row.reasons||[]).some(function(r){';
  h += '      return r.toLowerCase().indexOf("gap")!==-1 || r.toLowerCase().indexOf("continuation")!==-1;';
  h += '    }) || row.volSpike > 1.2;';
  h += '    return hasGapOrSpike;';
  h += '  });';
  h += '}';

  h += 'function applyLocalFilters(){';
  h += '  var f=getPriceFilters();';
  h += '  var filtered=cachedResults.filter(function(r){';
  h += '    if(r.error) return true;';
  h += '    var p=r.lastClose||r.entry;';
  h += '    return p>=f.min&&p<=f.max;';
  h += '  });';
  h += '  filtered=applyBCSOFilter(filtered);';
  h += '  var buyCount=filtered.filter(function(r){return r.signal==="BUY";}).length;';
  h += '  if(bcsoToggle.checked){';
  h += '    bcsoInfo.style.display="inline";';
  h += '    bcsoCount.textContent=buyCount;';
  h += '  } else {';
  h += '    bcsoInfo.style.display="none";';
  h += '  }';
  h += '  renderAll(filtered,buyCount);';
  h += '}';

  h += 'document.getElementById("minPrice").addEventListener("input",applyLocalFilters);';
  h += 'document.getElementById("maxPrice").addEventListener("input",applyLocalFilters);';
  h += 'bcsoToggle.addEventListener("change",applyLocalFilters);';

  // Scan all with batch
  h += 'async function scanAll(){';
  h += '  if(allTickers.length===0){';
  h += '    document.getElementById("buySection").innerHTML="<p>Memuat daftar saham...</p>";';
  h += '    return;';
  h += '  }';
  h += '  var total=allTickers.length;';
  h += '  var allResults=[];';
  h += '  var progBox=document.getElementById("progressBox");';
  h += '  var progBar=document.getElementById("progressBar");';
  h += '  var progTxt=document.getElementById("progressText");';
  h += '  progBox.style.display="block";';
  h += '  document.getElementById("buySection").innerHTML="";';
  h += '  document.getElementById("resultTable").innerHTML="";';
  h += '  for(var i=0;i<total;i+=batchSize){';
  h += '    var batch=allTickers.slice(i,i+batchSize);';
  h += '    var pct=Math.round((i/total)*100);';
  h += '    progBar.style.width=pct+"%";';
  h += '    progTxt.innerHTML="Memindai batch "+(Math.floor(i/batchSize)+1)+" dari "+Math.ceil(total/batchSize)+" <span class=\\"loading-dots\\"><span></span><span></span><span></span></span>";';
  h += '    try{';
  h += '      var r=await fetch("/screen",{';
  h += '        method:"POST",';
  h += '        headers:{"Content-Type":"application/json"},';
  h += '        body:JSON.stringify({tickers:batch,min_price:0,max_price:Infinity})';
  h += '      });';
  h += '      var d=await r.json();';
  h += '      allResults=allResults.concat(d);';
  h += '    }catch(e){}';
  h += '  }';
  h += '  progBar.style.width="100%";';
  h += '  progTxt.textContent="Selesai!";';
  h += '  setTimeout(function(){progBox.style.display="none";},1000);';
  h += '  cachedResults=allResults;';
  h += '  document.getElementById("statScanned").textContent=allResults.length;';
  h += '  applyLocalFilters();';
  h += '}';

  // Scan selected tickers
  h += 'async function scanSelected(){';
  h += '  var raw=document.getElementById("tickerInput").value.trim();';
  h += '  if(!raw) return;';
  h += '  var tickers=raw.split(",").map(function(s){return s.trim().toUpperCase();}).filter(Boolean);';
  h += '  if(tickers.length===0) return;';
  h += '  var r=await fetch("/screen",{';
  h += '    method:"POST",';
  h += '    headers:{"Content-Type":"application/json"},';
  h += '    body:JSON.stringify({tickers:tickers,min_price:0,max_price:Infinity})';
  h += '  });';
  h += '  var d=await r.json();';
  h += '  d.forEach(function(row){';
  h += '    var idx=cachedResults.findIndex(function(rr){return rr.ticker===row.ticker;});';
  h += '    if(idx>=0) cachedResults[idx]=row;';
  h += '    else cachedResults.push(row);';
  h += '  });';
  h += '  applyLocalFilters();';
  h += '}';

  // Cek IPO baru (contoh kandidat)
  h += 'async function checkIPO(){';
  h += '  var newTickers=[];';
  h += '  var candidates=["WBSA","EMAS","KISI"];';
  h += '  for(var i=0;i<candidates.length;i++){';
  h += '    var tk=candidates[i]+".JK";';
  h += '    if(allTickers.indexOf(tk)===-1){';
  h += '      try{';
  h += '        var r=await fetch("https://query1.finance.yahoo.com/v8/finance/chart/"+tk+"?interval=1d&range=1mo");';
  h += '        if(r.ok){';
  h += '          var d=await r.json();';
  h += '          if(d.chart&&d.chart.result&&d.chart.result.length>0){';
  h += '            var len=d.chart.result[0].timestamp?d.chart.result[0].timestamp.length:0;';
  h += '            newTickers.push({ticker:tk,candles:len,warning:len<20?"Data historis belum cukup (IPO baru, tunggu 1 bulan)":null});';
  h += '          }';
  h += '        } else { newTickers.push({ticker:tk,error:"HTTP "+r.status}); }';
  h += '      }catch(e){ newTickers.push({ticker:tk,error:e.message}); }';
  h += '    }';
  h += '  }';
  h += '  if(newTickers.length===0){';
  h += '    alert("Tidak ada IPO baru yang terdeteksi.\\n\\nSaham IPO akan otomatis ditambahkan setelah memiliki 20 candle historis.");';
  h += '  } else {';
  h += '    var msg="Hasil pengecekan IPO:\\n\\n";';
  h += '    newTickers.forEach(function(n){msg+=n.ticker+(n.error?": "+n.error:(n.warning?": "+n.warning:": "+n.candles+" candle tersedia"))+"\\n";});';
  h += '    msg+="\\nSaham IPO akan otomatis ditambahkan ke daftar setelah memiliki 20 candle historis.";';
  h += '    alert(msg);';
  h += '  }';
  h += '}';

  // Render all
  h += 'function renderAll(data,buyCountOverride){';
  h += '  var sorted=data.slice().sort(function(a,b){return(b.score||0)-(a.score||0);});';
  h += '  var buyList=sorted.filter(function(r){return r.signal==="BUY";});';
  h += '  var confOrder={HIGH:0,MEDIUM:1,LOW:2};';
  h += '  buyList.sort(function(a,b){return(confOrder[a.confidence]||0)-(confOrder[b.confidence]||0);});';
  h += '  document.getElementById("statBuy").textContent=(buyCountOverride!==undefined?buyCountOverride:buyList.length);';
  h += '  document.getElementById("statTime").textContent=new Date().toLocaleTimeString();';

  // Buy recommendations
  h += '  var buyHTML="";';
  h += '  if(buyList.length===0){';
  h += '    buyHTML="<p style=\\"color:var(--text2);\\">\\ud83d\\ude34 Tidak ada saham dengan sinyal BUY saat ini. Coba ubah filter harga.</p>";';
  h += '  } else {';
  h += '    buyList.forEach(function(row){';
  h += '      buyHTML+="<div class=\\"buy-card\\"><strong>"+row.ticker+" ("+row.lastClose+")</strong> \\u2014 Skor "+row.score+" \\u00b7 <span class=\\"confidence-"+row.confidence+"\\">"+row.confidence+"</span><br><span style=\\"font-size:13px;\\">Entry: "+row.entry+" | TP1: "+(row.take_profit[0]||"-")+" | TP2: "+(row.take_profit[1]||"-")+" | SL: "+row.stop_loss+"</span><div class=\\"meta\\">"+(row.reasons||[]).join(", ")+" \\u00b7 Sinyal berlaku untuk sesi perdagangan berikutnya.</div></div>";';
  h += '    });';
  h += '  }';
  h += '  document.getElementById("buySection").innerHTML="<div class=\\"buy-section\\"><h2>\\ud83d\\uded2 Rekomendasi BUY</h2>"+buyHTML+"</div>";';

  // Table
  h += '  var tableHTML="<div class=\\"table-wrap\\"><table><thead><tr><th>#</th><th>Ticker</th><th>Skor</th><th>Sinyal</th><th>Confidence</th><th>Entry</th><th>TP1</th><th>TP2</th><th>SL</th><th>Harga</th><th>Z-Score</th><th>Vol Spike</th><th>Alasan</th></tr></thead><tbody>";';
  h += '  sorted.forEach(function(row,i){';
  h += '    if(row.error){';
  h += '      tableHTML+="<tr><td>"+(i+1)+"</td><td>"+row.ticker+"</td><td colspan=\\"12\\" class=\\"error\\">"+row.error+"</td></tr>";';
  h += '      return;';
  h += '    }';
  h += '    var sc=row.score>60?"var(--green)":(row.score>40?"var(--amber)":"var(--red)");';
  h += '    tableHTML+="<tr><td>"+(i+1)+"</td><td><strong>"+row.ticker+"</strong></td><td><span style=\\"display:inline-block;width:50px;height:6px;background:var(--border);border-radius:3px;vertical-align:middle;margin-right:6px;\\"><span style=\\"display:block;height:100%;width:"+row.score+"%;background:"+sc+";border-radius:3px;\\"></span></span> "+row.score+"</td><td class=\\"signal-"+row.signal+"\\">"+row.signal+"</td><td class=\\"confidence-"+row.confidence+"\\">"+row.confidence+"</td><td>"+row.entry+"</td><td>"+(row.take_profit[0]||"-")+"</td><td>"+(row.take_profit[1]||"-")+"</td><td>"+row.stop_loss+"</td><td>"+(row.lastClose||"-")+"</td><td>"+(row.zScore?row.zScore.toFixed(2):"-")+"</td><td>"+row.volSpike+"x</td><td>"+((row.reasons||[]).join(", ")||"-")+"</td></tr>";';
  h += '  });';
  h += '  tableHTML+="</tbody></table></div>";';
  h += '  if(sorted.length===0) tableHTML="<p style=\\"color:var(--text2);\\">Tidak ada saham yang memenuhi filter.</p>";';
  h += '  document.getElementById("resultTable").innerHTML=tableHTML;';
  h += '}';

  // Event bindings
  h += 'document.getElementById("scanAllBtn").addEventListener("click",scanAll);';
  h += 'document.getElementById("scanInputBtn").addEventListener("click",scanSelected);';
  h += 'document.getElementById("checkIpoBtn").addEventListener("click",checkIPO);';

  // Start
  h += 'window.addEventListener("load",function(){';
  h += '  document.getElementById("tickerInput").value="";';
  h += '  loadTickers();';
  h += '});';
  h += '</script>\n';
  h += '</body>\n';
  h += '</html>';
  return h;
}
```
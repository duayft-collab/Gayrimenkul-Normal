/**
 * @file core/marketData.js
 * @description Canlı piyasa verisi — 2dk auto-refresh, K02 uyumlu (API key YOK)
 *
 * Kaynaklar (hepsi ücretsiz, CORS-open, key-less):
 * - Frankfurter (ECB bazlı): https://api.frankfurter.app
 * - Truncgil (TR finans): https://finans.truncgil.com/today.json
 * - CoinGecko (kripto): https://api.coingecko.com
 *
 * Fallback: localStorage cache + hata flag. Site asla donmaz.
 */

import { useStore } from '../store/app';
import { useAuthStore } from '../store/auth';
import { gunlukSnapshotKaydet } from './marketGecmis';

const CACHE_KEY = 'marketCache_v1';
const REFRESH_MS = 2 * 60 * 1000; // 2 dakika

/** Mutable global state — subscriber'lar useStore üzerinden okur */
export const marketState = {
  usd: null, eur: null, gbp: null, chf: null, jpy: null,
  altinGram: null, altinCeyrek: null, altinYarim: null, altinTam: null,
  gumusGram: null,
  btc: null, eth: null,
  bist100: null,
  enflasyon: 48.5,
  sonGuncelleme: null,
  hata: null,
  kaynak: [], // hangi API'ler çalıştı
  onceki: {}, // trend için
};

/** Cache'ten yükle */
function cacheYukle() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function cacheYaz(state) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {}
}

/** Store'a yaz — backward compat için eski field isimleri de sağlanır */
function storeYaz(state) {
  try {
    const store = useStore.getState();
    store.setMarketData?.({
      // Yeni format
      usd: state.usd, eur: state.eur, gbp: state.gbp, chf: state.chf, jpy: state.jpy,
      altinGram: state.altinGram, altinCeyrek: state.altinCeyrek,
      altinYarim: state.altinYarim, altinTam: state.altinTam,
      gumusGram: state.gumusGram,
      btc: state.btc, eth: state.eth,
      bist100: state.bist100, enflasyon: state.enflasyon,
      sonGuncelleme: state.sonGuncelleme,
      hata: state.hata,
      kaynak: state.kaynak,
      onceki: state.onceki,
      // Backward compat (eski field isimleri)
      usdTry:   state.usd     || 38.42,
      eurTry:   state.eur     || 41.85,
      goldGram: state.altinGram || 3850,
      btcTry:   state.btc     || 342000,
      bist100:  state.bist100 || 9840,
      inflation: state.enflasyon || 48.5,
    });
  } catch (e) {
    console.warn('[marketData] store yazma:', e.message);
  }
}

/** Önceki değerleri yedekle (trend hesabı için) */
function onceyiYedekle() {
  marketState.onceki = {
    usd: marketState.usd, eur: marketState.eur, gbp: marketState.gbp,
    altinGram: marketState.altinGram, gumusGram: marketState.gumusGram,
    btc: marketState.btc, bist100: marketState.bist100,
  };
}

const num = (v) => {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

/**
 * Ana fetch fonksiyonu — Promise.allSettled ile paralel, hata toleranslı
 */
export async function piyasaVerisiCek() {
  onceyiYedekle();
  const kaynak = [];

  const [frankfurter, truncgil, coingecko] = await Promise.allSettled([
    fetch('https://api.frankfurter.app/latest?from=USD&to=TRY,EUR,GBP,CHF,JPY')
      .then(r => r.ok ? r.json() : Promise.reject('frankfurter ' + r.status)),
    fetch('https://finans.truncgil.com/today.json')
      .then(r => r.ok ? r.json() : Promise.reject('truncgil ' + r.status)),
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=try')
      .then(r => r.ok ? r.json() : Promise.reject('coingecko ' + r.status)),
  ]);

  // 1) Frankfurter → Döviz (USD base)
  if (frankfurter.status === 'fulfilled' && frankfurter.value?.rates) {
    const r = frankfurter.value.rates;
    // USD base: r.TRY = USD cinsinden TRY
    if (r.TRY) {
      marketState.usd = r.TRY;
      if (r.EUR) marketState.eur = r.TRY / r.EUR; // EUR = USD/EUR × TRY/USD
      if (r.GBP) marketState.gbp = r.TRY / r.GBP;
      if (r.CHF) marketState.chf = r.TRY / r.CHF;
      if (r.JPY) marketState.jpy = r.TRY / r.JPY;
    }
    kaynak.push('frankfurter');
  } else {
    console.warn('[market] frankfurter:', frankfurter.reason);
  }

  // 2) Truncgil → Altın + gümüş + (döviz fallback)
  if (truncgil.status === 'fulfilled') {
    const t = truncgil.value || {};
    // Format değişken — birden fazla key dene
    const pick = (keys) => {
      for (const k of keys) {
        if (t[k]) {
          const v = t[k].Alış || t[k].Satış || t[k].alis || t[k].satis || t[k];
          const n = num(v);
          if (n != null) return n;
        }
      }
      return null;
    };
    marketState.altinGram   = pick(['gram-altin', 'GRA', 'gram_altin', 'altin-gram']) || marketState.altinGram;
    marketState.altinCeyrek = pick(['ceyrek-altin', 'ceyrek_altin', 'CEY']) || marketState.altinCeyrek;
    marketState.altinYarim  = pick(['yarim-altin', 'yarim_altin', 'YAR']) || marketState.altinYarim;
    marketState.altinTam    = pick(['tam-altin', 'tam_altin', 'TAM']) || marketState.altinTam;
    marketState.gumusGram   = pick(['gumus', 'GUM', 'silver-gram']) || marketState.gumusGram;
    // Döviz fallback
    if (!marketState.usd) marketState.usd = pick(['USD', 'usd']) || marketState.usd;
    if (!marketState.eur) marketState.eur = pick(['EUR', 'eur']) || marketState.eur;
    if (!marketState.gbp) marketState.gbp = pick(['GBP', 'gbp']) || marketState.gbp;
    kaynak.push('truncgil');
  } else {
    console.warn('[market] truncgil:', truncgil.reason);
  }

  // 3) CoinGecko → Kripto
  if (coingecko.status === 'fulfilled') {
    const c = coingecko.value || {};
    if (c.bitcoin?.try)  marketState.btc = c.bitcoin.try;
    if (c.ethereum?.try) marketState.eth = c.ethereum.try;
    kaynak.push('coingecko');
  } else {
    console.warn('[market] coingecko:', coingecko.reason);
  }

  // BIST100 — sabit fallback (scraping yok)
  if (marketState.bist100 == null) marketState.bist100 = 9840;

  marketState.sonGuncelleme = Date.now();
  marketState.kaynak = kaynak;
  marketState.hata = kaynak.length === 0 ? 'Tüm kaynaklar başarısız' : null;

  cacheYaz(marketState);
  storeYaz(marketState);

  // Günlük Firestore snapshot (idempotent — günde 1)
  try {
    const ws = useAuthStore.getState()?.user?.workspaceId;
    if (ws) await gunlukSnapshotKaydet(marketState, ws);
  } catch (e) { /* silent */ }

  return { ...marketState };
}

/** Uygulama mount'ta çağır — interval döndürür, cleanup için clearInterval */
export function piyasaOtomatikBaslat() {
  // Cache'ten mevcut veri yükle (flash avoidance)
  const cache = cacheYukle();
  if (cache) {
    Object.assign(marketState, cache);
    marketState.hata = 'cache';
    storeYaz(marketState);
  }
  // İlk fetch
  piyasaVerisiCek();
  // Her 2dk'da bir
  const id = setInterval(piyasaVerisiCek, REFRESH_MS);
  return id;
}

/** Trend — mevcut değer öncekiyle karşılaştırılır */
export function trend(k) {
  const yeni = marketState[k];
  const eski = marketState.onceki?.[k];
  if (yeni == null || eski == null) return 0;
  if (yeni > eski) return 1;
  if (yeni < eski) return -1;
  return 0;
}

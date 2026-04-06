/**
 * @file core/marketBootstrap.js
 * @description İlk açılışta sentetik 12 ay tarihsel piyasa verisi oluşturur
 * @anayasa K11 workspace bazında, bir kere çalışır
 *
 * NOT: Bu veriler yaklaşık tarihsel trendden üretilmiştir. Gerçek zaman
 * serisi için günlük fetch'ler Firestore'a birikir (marketGecmis).
 */
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { kayitSayisi } from './marketGecmis';

const COL = 'piyasaGecmisi';
const GUARD_KEY = 'marketBootstrap_v1';

/**
 * 13 aylık snapshot üretir (bugünden 12 ay geriye)
 * Bugünkü marketState değerlerini baz alarak geriye lineer scale yapar
 */
export async function marketBootstrap(workspaceId, marketState) {
  if (!workspaceId || !marketState?.usd) return null;

  const guardId = `${GUARD_KEY}_${workspaceId}`;
  if (localStorage.getItem(guardId)) return null; // Bu workspace zaten bootstrap'li

  try {
    const mevcut = await kayitSayisi(workspaceId);
    if (mevcut >= 10) {
      localStorage.setItem(guardId, '1');
      return { atlandı: true, mevcut };
    }

    // Scale faktörleri — bugünün değeri 1.0, 12 ay önce farklı (TL reel değer kaybı)
    const scaleUSD    = [0.75, 0.77, 0.79, 0.81, 0.83, 0.85, 0.88, 0.90, 0.92, 0.94, 0.96, 0.98, 1.00];
    const scaleAltin  = [0.55, 0.58, 0.62, 0.66, 0.70, 0.74, 0.78, 0.82, 0.86, 0.90, 0.94, 0.97, 1.00];
    const scaleGumus  = [0.60, 0.63, 0.66, 0.69, 0.72, 0.75, 0.78, 0.82, 0.85, 0.89, 0.93, 0.97, 1.00];
    const scaleBTC    = [0.70, 0.72, 0.75, 0.78, 0.80, 0.83, 0.85, 0.88, 0.91, 0.94, 0.96, 0.98, 1.00];
    const scaleBIST   = [0.65, 0.68, 0.72, 0.76, 0.79, 0.82, 0.85, 0.88, 0.91, 0.94, 0.97, 0.99, 1.00];

    const uretilen = [];
    for (let i = 12; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      const idx = 12 - i;
      uretilen.push({
        workspaceId,
        tarih: d.toISOString().slice(0, 10),
        usd:        marketState.usd     ? +(marketState.usd * scaleUSD[idx]).toFixed(2) : null,
        eur:        marketState.eur     ? +(marketState.eur * scaleUSD[idx] * 1.02).toFixed(2) : null,
        gbp:        marketState.gbp     ? +(marketState.gbp * scaleUSD[idx] * 1.05).toFixed(2) : null,
        altinGram:  marketState.altinGram ? Math.round(marketState.altinGram * scaleAltin[idx]) : null,
        gumusGram:  marketState.gumusGram ? Math.round(marketState.gumusGram * scaleGumus[idx] * 100) / 100 : null,
        btc:        marketState.btc     ? Math.round(marketState.btc * scaleBTC[idx]) : null,
        bist100:    marketState.bist100 ? Math.round(marketState.bist100 * scaleBIST[idx]) : null,
        enflasyon:  marketState.enflasyon || 48.5,
        sentetik: true,
        olusturulma: serverTimestamp(),
      });
    }

    for (const s of uretilen) {
      try { await addDoc(collection(db, COL), s); }
      catch (e) { console.warn('[bootstrap write]', e.message); }
    }

    localStorage.setItem(guardId, '1');
    return { uretildi: uretilen.length, sentetik: true };
  } catch (e) {
    console.warn('[marketBootstrap]', e.message);
    return null;
  }
}

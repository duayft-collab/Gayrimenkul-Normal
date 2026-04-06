/**
 * @file core/yatirimOnerisi.js
 * @description Basit kural tabanlı yatırım önerileri
 */
import { kiraArtisOrani, mulkToplamGetiri, enflasyonDonem, varlikGetiri } from './karsilastirma';

export const ONERI_TIP = {
  kira_artis:   { icon: '📈', renk: '#F59E0B', aciklik: 'yuksek' },
  mulk_alt:     { icon: '🔴', renk: '#EF4444', aciklik: 'orta' },
  mulk_ust:     { icon: '🏆', renk: '#22C55E', aciklik: 'bilgi' },
  gecikme:      { icon: '⚠️', renk: '#EF4444', aciklik: 'yuksek' },
  cesitlendir:  { icon: '🌍', renk: '#1B4F8A', aciklik: 'orta' },
  doviz:        { icon: '💱', renk: '#C9A84C', aciklik: 'orta' },
  enflasyon:    { icon: '📊', renk: '#8B5CF6', aciklik: 'bilgi' },
  portfoy_ust:  { icon: '🚀', renk: '#22C55E', aciklik: 'bilgi' },
  portfoy_alt:  { icon: '📉', renk: '#EF4444', aciklik: 'yuksek' },
};

function fmtYuzde(v) {
  if (v == null || isNaN(v)) return '—';
  return (v > 0 ? '+' : '') + v.toFixed(1) + '%';
}

/**
 * Kuralları çalıştır → öneriler listesi
 */
export function oneriUret({ mulkler, kiralar, odemeler, snapshots, bas, bit, marketState }) {
  const oneriler = [];
  const tufeOrani = enflasyonDonem(bas, bit);
  const altinOrani = varlikGetiri(snapshots, 'altinGram', bas, bit);
  const usdOrani = varlikGetiri(snapshots, 'usd', bas, bit);
  const bistOrani = varlikGetiri(snapshots, 'bist100', bas, bit);

  // 1) Kira reel getiri < -5% → TÜFE güncelle
  for (const k of (kiralar || [])) {
    if (k.isDeleted || k.durum !== 'dolu') continue;
    const kiraOrani = kiraArtisOrani(k, odemeler, bas, bit);
    const reelVsTufe = kiraOrani - tufeOrani;
    if (reelVsTufe < -5) {
      oneriler.push({
        tip: 'kira_artis',
        ...ONERI_TIP.kira_artis,
        baslik: 'Kira TÜFE\'nin gerisinde',
        mesaj: `Kira ${fmtYuzde(kiraOrani)} · TÜFE ${fmtYuzde(tufeOrani)} — reel kayıp ${fmtYuzde(reelVsTufe)}. Artış uygulayın.`,
        kiraId: k.id,
        link: 'rental',
      });
    }
  }

  // 2+3) Mülk vs altın
  for (const m of (mulkler || [])) {
    if (m.isDeleted) continue;
    const r = mulkToplamGetiri(m, odemeler, bas, bit);
    if (r.alisKurus === 0) continue;
    const mulkROI = r.roiYuzde;
    if (altinOrani > 0) {
      if (mulkROI < altinOrani) {
        oneriler.push({
          tip: 'mulk_alt',
          ...ONERI_TIP.mulk_alt,
          baslik: `${m.ad || 'Mülk'} altından düşük`,
          mesaj: `ROI ${fmtYuzde(mulkROI)} · Altın ${fmtYuzde(altinOrani)} — ${fmtYuzde(mulkROI - altinOrani)} geri`,
          link: 'portfolio',
        });
      } else if (mulkROI > altinOrani * 1.2) {
        oneriler.push({
          tip: 'mulk_ust',
          ...ONERI_TIP.mulk_ust,
          baslik: `${m.ad || 'Mülk'} mükemmel performans`,
          mesaj: `ROI ${fmtYuzde(mulkROI)} — altının ${(mulkROI / altinOrani).toFixed(1)}× üstü. Örnek yatırım.`,
          link: 'portfolio',
        });
      }
    }
  }

  // 4) 3 ay+ gecikmiş ödeme
  const gecikmeMap = {};
  const bugun = new Date();
  for (const o of (odemeler || [])) {
    if (o.isDeleted || o.durum !== 'bekliyor') continue;
    const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
    const fark = (bugun - v) / (1000 * 60 * 60 * 24);
    if (fark > 90) gecikmeMap[o.kiraciId] = (gecikmeMap[o.kiraciId] || 0) + 1;
  }
  for (const [kId, sayi] of Object.entries(gecikmeMap)) {
    oneriler.push({
      tip: 'gecikme',
      ...ONERI_TIP.gecikme,
      baslik: 'Uzun süreli gecikme',
      mesaj: `Bir kiracıda ${sayi} ödeme 90+ gün gecikmiş. Hukuki süreç değerlendirin.`,
      link: 'kiracilar',
    });
  }

  // 5) Coğrafi çeşitlendirme
  const ilSayac = {};
  const aktifMulkler = (mulkler || []).filter(m => !m.isDeleted);
  for (const m of aktifMulkler) {
    if (m.il) ilSayac[m.il] = (ilSayac[m.il] || 0) + 1;
  }
  const maksIl = Object.entries(ilSayac).sort((a, b) => b[1] - a[1])[0];
  if (maksIl && aktifMulkler.length > 0 && maksIl[1] / aktifMulkler.length > 0.5) {
    oneriler.push({
      tip: 'cesitlendir',
      ...ONERI_TIP.cesitlendir,
      baslik: 'Coğrafi yoğunlaşma',
      mesaj: `Portföyün %${Math.round(maksIl[1] / aktifMulkler.length * 100)}'i ${maksIl[0]}'da. Farklı bölgelere yatırım düşünün.`,
    });
  }

  // 6) Döviz kiralı mülk
  const dovizKiralar = (kiralar || []).filter(k => !k.isDeleted && k.paraBirim && k.paraBirim !== 'TRY');
  if (dovizKiralar.length > 0) {
    const kazanc = usdOrani > 0 ? `+${usdOrani.toFixed(1)}% USD değer kazandı` : `${usdOrani.toFixed(1)}% USD zayıfladı`;
    oneriler.push({
      tip: 'doviz',
      ...ONERI_TIP.doviz,
      baslik: `${dovizKiralar.length} döviz kiralı sözleşme`,
      mesaj: `Dönem kur etkisi: ${kazanc}. Kur farkı kazanç/kayıp raporu inceleyin.`,
      link: 'raporlar',
    });
  }

  // 7) BIST vs portföy
  if (bistOrani !== 0 && aktifMulkler.length > 0) {
    const portROIler = aktifMulkler.map(m => mulkToplamGetiri(m, odemeler, bas, bit).roiYuzde);
    const ortROI = portROIler.reduce((a, b) => a + b, 0) / portROIler.length;
    if (ortROI < bistOrani - 10) {
      oneriler.push({
        tip: 'portfoy_alt',
        ...ONERI_TIP.portfoy_alt,
        baslik: 'Portföy BIST\'in gerisinde',
        mesaj: `Ortalama ROI ${fmtYuzde(ortROI)} · BIST ${fmtYuzde(bistOrani)}. Gayrimenkul ağırlığını gözden geçirin.`,
        link: 'raporlar',
      });
    } else if (ortROI > bistOrani + 10) {
      oneriler.push({
        tip: 'portfoy_ust',
        ...ONERI_TIP.portfoy_ust,
        baslik: 'Portföy BIST\'i geçiyor',
        mesaj: `Ortalama ROI ${fmtYuzde(ortROI)} vs BIST ${fmtYuzde(bistOrani)}. Doğru yoldasın.`,
      });
    }
  }

  // 8) Yüksek enflasyon uyarısı
  if (tufeOrani > 40) {
    oneriler.push({
      tip: 'enflasyon',
      ...ONERI_TIP.enflasyon,
      baslik: 'Yüksek enflasyon dönemi',
      mesaj: `Kümülatif TÜFE ${fmtYuzde(tufeOrani)}. Taşınmaz ağırlığı koruyucu bir strateji.`,
    });
  }

  // Öncelik sırasına göre sırala
  const sira = { yuksek: 0, orta: 1, bilgi: 2 };
  oneriler.sort((a, b) => (sira[a.aciklik] || 3) - (sira[b.aciklik] || 3));
  return oneriler;
}

/**
 * @file core/karsilastirma.js
 * @description Kira vs enflasyon/altın/döviz reel performans hesapları
 * @anayasa K10 kuruş integer her para · K11 workspace filter
 *
 * Tüm getiri fonksiyonları % (ondalık değil, doğrudan yüzde: 40 = %40)
 */
import tufeData from '../data/tufe-enflasyon.json';
import { yakinSnapshot } from './marketGecmis';
import { odemeTlKurus } from './odemelerDb';

/* ═══ Yardımcılar ═══ */

function tarihAl(v) {
  if (!v) return null;
  if (v.toDate) return v.toDate();
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

function yuzdeFark(eski, yeni) {
  if (!eski || eski === 0) return 0;
  return ((yeni - eski) / eski) * 100;
}

/* ═══ ENFLASYON (TÜİK) ═══ */

/**
 * Dönem kümülatif enflasyonu — bileşik formül
 * bas/bit: Date
 */
export function enflasyonDonem(bas, bit) {
  if (!bas || !bit) return 0;
  const basD = new Date(bas);
  const bitD = new Date(bit);
  const aylik = tufeData.aylik || {};

  let carpim = 1;
  const kursoD = new Date(basD.getFullYear(), basD.getMonth(), 1);
  while (kursoD <= bitD) {
    const yil = kursoD.getFullYear().toString();
    const ay = kursoD.getMonth();
    const oran = aylik[yil]?.[ay];
    if (typeof oran === 'number') {
      carpim *= 1 + oran / 100;
    }
    kursoD.setMonth(kursoD.getMonth() + 1);
  }
  return (carpim - 1) * 100;
}

/* ═══ KİRA ARTIŞ ORANI ═══ */

/**
 * Kiranın bir dönemdeki artış yüzdesi.
 * Ödemeler collection'ından dönem içindeki kira ödemelerinin
 * tutar değişimini kullanır. Eğer ödeme yoksa baslangicTarihi/aylikKira fallback.
 */
export function kiraArtisOrani(kira, odemeler, bas, bit) {
  if (!kira) return 0;
  const kiraOdemeler = (odemeler || [])
    .filter(o => o.kiraId === kira.id && o.tip === 'kira' && !o.isDeleted)
    .map(o => ({
      ...o,
      _vade: tarihAl(o.vadeTarihi) || tarihAl(o.odemeTarihi),
    }))
    .filter(o => o._vade)
    .sort((a, b) => a._vade - b._vade);

  if (kiraOdemeler.length === 0) {
    // Fallback: kira başlangıç tarihi ile kıyas
    const basT = tarihAl(kira.baslangicTarihi);
    if (!basT || basT > bit) return 0;
    return 0; // Tek veri noktası — artış bilinmiyor
  }

  // Dönemde ilk ve son kira ödemesini bul
  const dönemIci = kiraOdemeler.filter(o => o._vade >= bas && o._vade <= bit);
  if (dönemIci.length < 2) {
    // Dönem dışında birden fazla varsa en yakınları al
    if (kiraOdemeler.length < 2) return 0;
    const ilk = kiraOdemeler[0];
    const son = kiraOdemeler[kiraOdemeler.length - 1];
    return yuzdeFark(odemeTlKurus(ilk), odemeTlKurus(son));
  }
  const ilk = dönemIci[0];
  const son = dönemIci[dönemIci.length - 1];
  return yuzdeFark(odemeTlKurus(ilk), odemeTlKurus(son));
}

/* ═══ VARLIK GETİRİSİ (piyasaGecmisi'nden) ═══ */

/**
 * snapshots: piyasaGecmisi'nden gelen liste (sıralı)
 * varlik: 'usd'|'eur'|'altinGram'|'gumusGram'|'btc'|'bist100'
 */
export function varlikGetiri(snapshots, varlik, bas, bit) {
  if (!snapshots?.length) return 0;
  const basSnap = yakinSnapshot(snapshots, bas);
  const bitSnap = yakinSnapshot(snapshots, bit);
  if (!basSnap || !bitSnap) return 0;
  const eski = basSnap[varlik];
  const yeni = bitSnap[varlik];
  if (!eski || !yeni) return 0;
  return yuzdeFark(eski, yeni);
}

/* ═══ REEL GETİRİ — Kira ─ Varlık ═══ */

export function reelGetiri(kiraOrani, varlikOrani) {
  // Basit fark: kiranın varlığın önünde/arkasında olduğu yüzde puan
  return kiraOrani - varlikOrani;
}

/* ═══ MÜLK TOPLAM GETİRİ (Değer + Kira - Gider) ═══ */

export function mulkToplamGetiri(mulk, odemeler, bas, bit) {
  if (!mulk) return { degerArtisiYuzde: 0, kiraTahsilKurus: 0, giderKurus: 0, toplamKarKurus: 0, roiYuzde: 0 };

  // Değer artışı: alış vs bugünkü. alisTarihi/alisFiyati yoksa 0.
  // Mevcut mülk modelinde buyPrice/currentPrice/fiyat alanları var.
  const alis = (mulk.buyPrice || 0) * 100; // kuruş
  const bugun = ((mulk.currentPrice || mulk.fiyat) || 0) * 100;
  let degerArtisiYuzde = 0;
  let degerArtisiKurus = 0;
  if (alis > 0) {
    degerArtisiKurus = bugun - alis;
    degerArtisiYuzde = (degerArtisiKurus / alis) * 100;
  }

  // Dönem kira tahsilatı
  const donemOdemeler = (odemeler || []).filter(o => {
    if (o.mulkId !== mulk.id) return false;
    if (o.isDeleted) return false;
    const v = tarihAl(o.vadeTarihi);
    if (!v) return false;
    return v >= bas && v <= bit;
  });
  const kiraTahsil = donemOdemeler
    .filter(o => o.tip === 'kira' && o.durum === 'odendi')
    .reduce((a, o) => a + odemeTlKurus(o), 0);
  const gider = donemOdemeler
    .filter(o => o.tip === 'gider' || o.tip === 'diger')
    .reduce((a, o) => a + odemeTlKurus(o), 0);

  const toplamKar = degerArtisiKurus + kiraTahsil - gider;
  const roiYuzde = alis > 0 ? (toplamKar / alis) * 100 : 0;

  return {
    degerArtisiYuzde,
    degerArtisiKurus,
    kiraTahsilKurus: kiraTahsil,
    giderKurus: gider,
    toplamKarKurus: toplamKar,
    roiYuzde,
    alisKurus: alis,
    guncelKurus: bugun,
  };
}

/* ═══ PORTFÖY SEVİYESİ ═══ */

/**
 * Dönemdeki portföy genel performansı
 */
export function portfoyGetiri({ mulkler, kiralar, odemeler, bas, bit }) {
  let toplamAlis = 0, toplamGuncel = 0, toplamKira = 0, toplamGider = 0;
  for (const m of (mulkler || [])) {
    if (m.isDeleted) continue;
    const r = mulkToplamGetiri(m, odemeler, bas, bit);
    toplamAlis += r.alisKurus;
    toplamGuncel += r.guncelKurus;
    toplamKira += r.kiraTahsilKurus;
    toplamGider += r.giderKurus;
  }
  const degerArtisiYuzde = toplamAlis > 0 ? ((toplamGuncel - toplamAlis) / toplamAlis) * 100 : 0;
  const toplamKar = (toplamGuncel - toplamAlis) + toplamKira - toplamGider;
  const roiYuzde = toplamAlis > 0 ? (toplamKar / toplamAlis) * 100 : 0;

  // Kira artış oranı — tüm kiraların ağırlıklı ortalaması
  let agirlikToplam = 0, oranCarpim = 0;
  for (const k of (kiralar || [])) {
    if (k.isDeleted) continue;
    const oran = kiraArtisOrani(k, odemeler, bas, bit);
    const agirlik = k.aylikKiraKurus || 1;
    oranCarpim += oran * agirlik;
    agirlikToplam += agirlik;
  }
  const kiraOrtOrani = agirlikToplam > 0 ? oranCarpim / agirlikToplam : 0;

  return {
    toplamAlisKurus: toplamAlis,
    toplamGuncelKurus: toplamGuncel,
    toplamKiraKurus: toplamKira,
    toplamGiderKurus: toplamGider,
    degerArtisiYuzde,
    roiYuzde,
    kiraOrtYuzde: kiraOrtOrani,
  };
}

/* ═══ ENDEKS (Grafik için baz 100) ═══ */

/**
 * Her varlık ve kira için aylık endeks üret (baz = 100)
 * Sonuç: [{ay: 'Oca 25', kira: 100, tufe: 100, altin: 100, usd: 100, bist: 100}, ...]
 */
export function endeksSerisi({ snapshots, kiralar, odemeler, bas, bit }) {
  const basD = new Date(bas);
  const bitD = new Date(bit);
  const seri = [];
  const kurso = new Date(basD.getFullYear(), basD.getMonth(), 1);

  // Baz değerler
  const basSnap = yakinSnapshot(snapshots, basD);
  const basUsd    = basSnap?.usd || 1;
  const basAltin  = basSnap?.altinGram || 1;
  const basGumus  = basSnap?.gumusGram || 1;
  const basBIST   = basSnap?.bist100 || 1;

  // Kira ağırlıklı baz
  let basKiraTl = 0, basKiraAdet = 0;
  for (const k of (kiralar || [])) {
    if (k.isDeleted) continue;
    const odm = (odemeler || [])
      .filter(o => o.kiraId === k.id && o.tip === 'kira' && !o.isDeleted)
      .sort((a, b) => (tarihAl(a.vadeTarihi) || 0) - (tarihAl(b.vadeTarihi) || 0));
    if (odm.length) {
      basKiraTl += odemeTlKurus(odm[0]);
      basKiraAdet++;
    }
  }
  const basKiraAvg = basKiraAdet > 0 ? basKiraTl / basKiraAdet : 1;

  let kumulatifTufe = 1;

  while (kurso <= bitD) {
    const yil = kurso.getFullYear().toString();
    const ay = kurso.getMonth();
    const tufeOran = tufeData.aylik?.[yil]?.[ay];
    if (typeof tufeOran === 'number') kumulatifTufe *= 1 + tufeOran / 100;

    const snap = yakinSnapshot(snapshots, kurso);
    const usd = snap?.usd || basUsd;
    const altin = snap?.altinGram || basAltin;
    const gumus = snap?.gumusGram || basGumus;
    const bist = snap?.bist100 || basBIST;

    // Bu aydaki ortalama kira
    let ayKiraTl = 0, ayKiraAdet = 0;
    for (const k of (kiralar || [])) {
      if (k.isDeleted) continue;
      const odm = (odemeler || []).filter(o => {
        if (o.kiraId !== k.id || o.tip !== 'kira' || o.isDeleted) return false;
        const v = tarihAl(o.vadeTarihi);
        if (!v) return false;
        return v.getFullYear() === kurso.getFullYear() && v.getMonth() === ay;
      });
      if (odm.length) {
        ayKiraTl += odemeTlKurus(odm[0]);
        ayKiraAdet++;
      }
    }
    const ayKiraAvg = ayKiraAdet > 0 ? ayKiraTl / ayKiraAdet : basKiraAvg;

    seri.push({
      ay: kurso.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
      kira:  basKiraAvg > 0 ? Math.round((ayKiraAvg / basKiraAvg) * 100) : 100,
      tufe:  Math.round(kumulatifTufe * 100),
      altin: basAltin > 0 ? Math.round((altin / basAltin) * 100) : 100,
      gumus: basGumus > 0 ? Math.round((gumus / basGumus) * 100) : 100,
      usd:   basUsd > 0 ? Math.round((usd / basUsd) * 100) : 100,
      bist:  basBIST > 0 ? Math.round((bist / basBIST) * 100) : 100,
    });

    kurso.setMonth(kurso.getMonth() + 1);
  }
  return seri;
}

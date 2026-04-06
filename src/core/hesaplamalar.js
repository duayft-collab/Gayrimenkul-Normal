/**
 * @file core/hesaplamalar.js
 * @description 44 profesyonel hesap makinesi — tümü saf fonksiyon
 * @anayasa K01 SRP · K02 offline (API yok) · K10 KURUŞ INTEGER
 *
 * Kurallar:
 * - Para: kuruş integer (₺1.500,50 = 150050)
 * - Yüzde: 0-100 sayı (0.2 değil 20)
 * - Hata/eksik girdi → 0 döner, asla NaN
 * - Yan etki YOK, deterministik
 */

const safe = (n) => {
  const v = Number(n);
  return isFinite(v) ? v : 0;
};
const r = Math.round;

/* ════════════════════════════════════════════════════
 * KATEGORİ A — KREDİ & ÖDEMELER (8)
 * ════════════════════════════════════════════════════ */

/** Eşit Taksitli Kredi (PMT formula) */
export function krediTaksitEKE(anaparaKurus, yillikFaizYuzde, ayVadesi) {
  const A = safe(anaparaKurus), Y = safe(yillikFaizYuzde), N = safe(ayVadesi);
  if (!A || !N) return { aylikTaksit: 0, toplamOdeme: 0, toplamFaiz: 0, plan: [] };
  const aylikR = (Y / 100) / 12;
  let aylik;
  if (aylikR === 0) {
    aylik = r(A / N);
  } else {
    const c = Math.pow(1 + aylikR, N);
    aylik = r(A * (aylikR * c) / (c - 1));
  }
  const toplam = aylik * N;
  const faiz = toplam - A;
  // Plan
  const plan = [];
  let kalan = A;
  for (let i = 1; i <= N; i++) {
    const faizAy = aylikR === 0 ? 0 : r(kalan * aylikR);
    const ana = aylik - faizAy;
    kalan = Math.max(0, kalan - ana);
    plan.push({ ay: i, taksit: aylik, ana, faiz: faizAy, kalan });
  }
  return { aylikTaksit: aylik, toplamOdeme: toplam, toplamFaiz: faiz, plan };
}

/** Erken ödeme — kalan vadenin yeniden hesabı */
export function krediErkenOdeme(kalanAnaKurus, kalanAy, yillikFaizYuzde, erkenKurus) {
  const K = safe(kalanAnaKurus), N = safe(kalanAy), Y = safe(yillikFaizYuzde), E = safe(erkenKurus);
  if (!K || !N || E <= 0) return { yeniKalan: K, kazancKurus: 0, yeniVade: N };
  const yeniKalan = Math.max(0, K - E);
  const eski = krediTaksitEKE(K, Y, N);
  const yeni = krediTaksitEKE(yeniKalan, Y, N);
  // Vade aynı tutulursa kazanç toplam faiz farkı
  const kazanc = eski.toplamFaiz - yeni.toplamFaiz;
  // Alternatif: aynı taksitle yeni vade
  const aylikR = (Y / 100) / 12;
  let yeniVadeHesap = N;
  if (aylikR > 0 && eski.aylikTaksit > 0 && yeniKalan > 0) {
    // n = -log(1 - r*PV/PMT) / log(1+r)
    const pmt = eski.aylikTaksit;
    const arg = 1 - (aylikR * yeniKalan) / pmt;
    if (arg > 0) {
      yeniVadeHesap = Math.ceil(-Math.log(arg) / Math.log(1 + aylikR));
    }
  }
  return { yeniKalan, kazancKurus: Math.max(0, kazanc), yeniVade: yeniVadeHesap };
}

/** Ödeme gücü — net gelir × %max - mevcut taksit */
export function krediOdemeGucu(netGelirKurus, mevcutTaksitKurus, maxOranYuzde = 40) {
  const G = safe(netGelirKurus), T = safe(mevcutTaksitKurus), O = safe(maxOranYuzde);
  if (!G) return 0;
  return Math.max(0, r((G * O / 100) - T));
}

/** Basit faiz */
export function faizBasit(anaKurus, yillikYuzde, gun) {
  const A = safe(anaKurus), Y = safe(yillikYuzde), G = safe(gun);
  if (!A || !Y || !G) return 0;
  return r(A * (Y / 100) * (G / 365));
}

/** Bileşik faiz (sonuç tutar) */
export function faizBilesik(anaKurus, yillikYuzde, yil, periyotPerYil = 12) {
  const A = safe(anaKurus), Y = safe(yillikYuzde), N = safe(yil), P = safe(periyotPerYil);
  if (!A || !N || !P) return A;
  const r2 = (Y / 100) / P;
  return r(A * Math.pow(1 + r2, P * N));
}

/** Efektif faiz (APR → APY) */
export function efektifFaiz(nominalYuzde, periyotSayisi) {
  const N = safe(nominalYuzde), P = safe(periyotSayisi);
  if (!N || !P) return 0;
  return (Math.pow(1 + (N / 100) / P, P) - 1) * 100;
}

/** Gecikme faizi (basit faiz mantığı) */
export function gecikmeFaizi(tutarKurus, gun, yillikYuzde) {
  return faizBasit(tutarKurus, yillikYuzde, gun);
}

/** Amortisman tablosu (krediTaksitEKE.plan'ı dön) */
export function amortismanTablosu(anaKurus, yillikFaizYuzde, vade) {
  return krediTaksitEKE(anaKurus, yillikFaizYuzde, vade).plan;
}

/* ════════════════════════════════════════════════════
 * KATEGORİ B — KİRA & GETİRİ (8)
 * ════════════════════════════════════════════════════ */

/** TÜFE bazlı kira artışı */
export function kiraArtisTufe(mevcutKiraKurus, tufeYuzde) {
  const M = safe(mevcutKiraKurus), T = safe(tufeYuzde);
  if (!M) return { yeniKira: 0, artisKurus: 0 };
  const yeni = r(M * (1 + T / 100));
  return { yeniKira: yeni, artisKurus: yeni - M };
}

/** Yasal kira artışı: son 12 ay TÜFE ortalaması (girdi: ortalama yüzde) */
export function kiraArtisYasal12Ay(mevcutKiraKurus, son12AyTufeOrtalamasi) {
  // Türkiye'de yasal sınır son 12 ay TÜFE ortalaması
  return kiraArtisTufe(mevcutKiraKurus, son12AyTufeOrtalamasi).yeniKira;
}

/** Kira getirisi yıllık % */
export function kiraGetirisiYillik(aylikKiraKurus, mulkDegeriKurus) {
  const A = safe(aylikKiraKurus), M = safe(mulkDegeriKurus);
  if (!M) return 0;
  return ((A * 12) / M) * 100;
}

/** Geri dönüş yılı (basit payback) */
export function geriDonusYili(mulkDegeriKurus, yillikNetKiraKurus) {
  const M = safe(mulkDegeriKurus), N = safe(yillikNetKiraKurus);
  if (!N) return 0;
  return M / N;
}

/** Cap Rate (NOI / değer) */
export function capRate(yillikNetGelirKurus, mulkDegeriKurus) {
  const N = safe(yillikNetGelirKurus), M = safe(mulkDegeriKurus);
  if (!M) return 0;
  return (N / M) * 100;
}

/** GRM — Gross Rent Multiplier */
export function grossRentMultiplier(mulkDegeriKurus, yillikBrutKurus) {
  const M = safe(mulkDegeriKurus), B = safe(yillikBrutKurus);
  if (!B) return 0;
  return M / B;
}

/** Reel kira getirisi (kira artış - tüfe) */
export function reelKiraGetirisi(kiraArtisYuzde, tufeYuzde) {
  return safe(kiraArtisYuzde) - safe(tufeYuzde);
}

/** Döviz bazlı kira (TL/kur) */
export function dovizBazliKira(aylikTLKurus, kur) {
  const A = safe(aylikTLKurus), K = safe(kur);
  if (!K) return 0;
  return r(A / K); // sonuç döviz cinsinden cent
}

/* ════════════════════════════════════════════════════
 * KATEGORİ C — VERGİ (6)
 * ════════════════════════════════════════════════════ */

/** Kira stopajı %20 (işyeri) */
export function kiraStopaji(brutKiraKurus, yuzde = 20) {
  const B = safe(brutKiraKurus), Y = safe(yuzde);
  const stopaj = r(B * Y / 100);
  return { stopaj, net: B - stopaj };
}

/** GMSİ — Gayrimenkul Sermaye İradı vergisi (basit kademeli) */
export function gmsiVergisi(yillikKiraKurus, istisnaKurus = 4_700_000) {
  // istisna 2026 default: 47.000 TL = 4_700_000 kuruş
  const Y = safe(yillikKiraKurus), I = safe(istisnaKurus);
  const matrah = Math.max(0, Y - I);
  if (matrah === 0) return { matrah: 0, vergi: 0 };
  // Türkiye 2026 gelir vergisi kademeli (yaklaşık)
  // 0-110.000 → 15%, 110.001-230.000 → 20%, 230.001-870.000 → 27%, üstü 35-40%
  const D = [
    [11_000_000, 0.15],
    [23_000_000, 0.20],
    [87_000_000, 0.27],
    [Infinity,   0.35],
  ];
  let kalan = matrah;
  let altSinir = 0;
  let vergi = 0;
  for (const [ust, oran] of D) {
    if (matrah <= ust) {
      vergi += r((matrah - altSinir) * oran);
      break;
    }
    vergi += r((ust - altSinir) * oran);
    altSinir = ust;
  }
  return { matrah, vergi };
}

/** Tapu harcı — alıcı %2 */
export function tapuHarciAlici(satisKurus, yuzde = 2) {
  return r(safe(satisKurus) * safe(yuzde) / 100);
}

/** Tapu harcı — satıcı %2 */
export function tapuHarciSatici(satisKurus, yuzde = 2) {
  return r(safe(satisKurus) * safe(yuzde) / 100);
}

/** Emlak vergisi yıllık (binde — 1319 SK) */
export function emlakVergisi(degerKurus, tur = 'konut') {
  // Konut binde 1, işyeri binde 2, arsa binde 3, arazi binde 1
  const D = safe(degerKurus);
  const oranlar = { konut: 1, isyeri: 2, arsa: 3, arazi: 1 };
  const o = oranlar[tur] || 1;
  return r(D * o / 1000);
}

/** KDV hesabı (dahil/hariç) */
export function kdvHesap(tutarKurus, yuzde = 20, mod = 'haric') {
  const T = safe(tutarKurus), Y = safe(yuzde);
  if (mod === 'dahil') {
    // T = brut, KDV içinde
    const net = r(T / (1 + Y / 100));
    return { net, kdv: T - net, brut: T };
  }
  // T = net, KDV ekle
  const kdv = r(T * Y / 100);
  return { net: T, kdv, brut: T + kdv };
}

/* ════════════════════════════════════════════════════
 * KATEGORİ D — İNŞAAT & KAT KARŞILIĞI (12)
 * ════════════════════════════════════════════════════ */

/** Emsal × parsel = max inşaat m² */
export function emsalHesap(parselM2, emsal) {
  return r(safe(parselM2) * safe(emsal));
}

/** TAKS × parsel = max taban alanı m² */
export function taksHesap(parselM2, taks) {
  return r(safe(parselM2) * safe(taks));
}

/** Kat karşılığı paylaşım hesabı */
export function katKarsiligiPaylasim({ parselM2, emsal, insaatMaliyetiKurus, satisM2Kurus, yukleniciPayiYuzde }) {
  const P = safe(parselM2), E = safe(emsal), I = safe(insaatMaliyetiKurus), S = safe(satisM2Kurus), Y = safe(yukleniciPayiYuzde);
  const toplamM2 = r(P * E);
  const yukleniciM2 = r(toplamM2 * Y / 100);
  const malsahibiM2 = toplamM2 - yukleniciM2;
  const toplamMaliyet = toplamM2 * I;
  const toplamSatis = toplamM2 * S;
  const yukleniciSatis = yukleniciM2 * S;
  const malsahibiSatis = malsahibiM2 * S;
  // Yüklenici karı = kendi payının satışı - tüm inşaat maliyeti
  const yukleniciKar = yukleniciSatis - toplamMaliyet;
  const malsahibiKar = malsahibiSatis; // arsa bedava varsayım
  return {
    toplamM2,
    yukleniciM2,
    malsahibiM2,
    toplamMaliyetKurus: toplamMaliyet,
    toplamSatisKurus: toplamSatis,
    yukleniciKarKurus: yukleniciKar,
    malsahibiKarKurus: malsahibiKar,
  };
}

/** İnşaat maliyeti m² (kategori bazlı, 2026 ortalama) */
export function insaatMaliyetiM2(kategori = 'orta') {
  // ekonomik 18.000 / orta 25.000 / lüks 40.000 ₺/m²
  const M = { ekonomik: 1_800_000, orta: 2_500_000, luks: 4_000_000 };
  return M[kategori] || M.orta;
}

/** Demir hesabı (kg/m²) */
export function demirHesap(insaatM2, kgPerM2 = 80, fiyatKurusPerKg = 2500) {
  const M = safe(insaatM2), K = safe(kgPerM2), F = safe(fiyatKurusPerKg);
  const kg = M * K;
  return { kg: r(kg), ton: +(kg / 1000).toFixed(2), maliyetKurus: r(kg * F) };
}

/** Beton hesabı (m³/m²) */
export function betonHesap(insaatM2, m3PerM2 = 0.35, fiyatKurusPerM3 = 250000) {
  const M = safe(insaatM2), K = safe(m3PerM2), F = safe(fiyatKurusPerM3);
  const m3 = M * K;
  const kamyon = Math.ceil(m3 / 8); // 8 m³ kamyon
  return { m3: +m3.toFixed(2), kamyon, maliyetKurus: r(m3 * F) };
}

/** Boya hesabı */
export function boyaHesap(alanM2, katSayisi = 2, litrePer10M2 = 1, fiyatKurusPerLitre = 30000) {
  const A = safe(alanM2), K = safe(katSayisi), L = safe(litrePer10M2), F = safe(fiyatKurusPerLitre);
  const litre = (A / 10) * L * K;
  return { litre: +litre.toFixed(1), maliyetKurus: r(litre * F) };
}

/** Fayans hesabı (fire payı dahil) */
export function fayansHesap(alanM2, firePayiYuzde = 10, fiyatKurusPerM2 = 35000) {
  const A = safe(alanM2), Y = safe(firePayiYuzde), F = safe(fiyatKurusPerM2);
  const m2Ham = A * (1 + Y / 100);
  return { m2Ham: +m2Ham.toFixed(1), maliyetKurus: r(m2Ham * F) };
}

/** Alçı sıva (kg/m² × kalınlık) */
export function alciSivaHesap(alanM2, kalinlikCm = 2, fiyatKurusPerKg = 1200) {
  const A = safe(alanM2), C = safe(kalinlikCm), F = safe(fiyatKurusPerKg);
  // ~10 kg/m² × cm
  const kg = A * 10 * C;
  return { kg: r(kg), maliyetKurus: r(kg * F) };
}

/** Kapı/pencere tahmini */
export function kapiPencereHesap(m2Yapi) {
  const M = safe(m2Yapi);
  // Yaklaşık: 100 m²'de ~5 kapı, 5 pencere
  const kapi = Math.ceil(M / 20);
  const pencere = Math.ceil(M / 20);
  // Kapı 800.000 / pencere 1.200.000 kuruş ortalama
  const maliyetKurus = kapi * 80_000_00 + pencere * 120_000_00;
  return { kapi, pencere, maliyetKurus };
}

/** Asansör (kat sayısına göre) */
export function asansorHesap(katSayisi) {
  const K = safe(katSayisi);
  if (K < 4) return { maliyetKurus: 0, yillikBakimKurus: 0, gerekli: false };
  // 4 kat üstü zorunlu, ~850.000 TL kurulum, ~36.000 TL/yıl bakım
  const maliyet = 85_000_000 + Math.max(0, K - 4) * 5_000_000;
  return {
    maliyetKurus: maliyet,
    yillikBakimKurus: 3_600_000,
    gerekli: true,
  };
}

/** Parsel bölme — eşit parça */
export function parselBolme(parselM2, bolumSayisi) {
  const P = safe(parselM2), B = safe(bolumSayisi);
  if (!B) return 0;
  return +(P / B).toFixed(2);
}

/* ════════════════════════════════════════════════════
 * KATEGORİ E — FATURA & GÜNLÜK (6)
 * ════════════════════════════════════════════════════ */

/** Elektrik faturası (kWh × tarife) */
export function elektrikFatura(kwh, tarifeKurusPerKwh = 195) {
  return r(safe(kwh) * safe(tarifeKurusPerKwh));
}

/** Doğalgaz faturası (m³ × tarife) */
export function dogalgazFatura(m3, tarifeKurusPerM3 = 950) {
  return r(safe(m3) * safe(tarifeKurusPerM3));
}

/** Su faturası (m³ × tarife) */
export function suFatura(m3, tarifeKurusPerM3 = 5000) {
  return r(safe(m3) * safe(tarifeKurusPerM3));
}

/** Aidat dağıtım — eşit/m²/kişi */
export function aidatBolustur(toplamAidatKurus, daireSayisi, mod = 'esit', daireler = []) {
  const T = safe(toplamAidatKurus), N = safe(daireSayisi);
  if (!T || !N) return 0;
  if (mod === 'esit') return r(T / N);
  if ((mod === 'm2' || mod === 'kisi') && Array.isArray(daireler) && daireler.length) {
    const toplamA = daireler.reduce((a, d) => a + safe(d), 0);
    if (!toplamA) return 0;
    // Her daire için ayrı dön
    return daireler.map(d => r(T * safe(d) / toplamA));
  }
  return r(T / N);
}

/** Emlakçı komisyonu (alıcı + satıcı + KDV) */
export function komisyonEmlak(satisKurus, aliciYuzde = 2, saticiYuzde = 2, kdvYuzde = 20) {
  const S = safe(satisKurus), A = safe(aliciYuzde), B = safe(saticiYuzde), K = safe(kdvYuzde);
  const aliciNet = r(S * A / 100);
  const saticiNet = r(S * B / 100);
  const aliciKdv = r(aliciNet * K / 100);
  const saticiKdv = r(saticiNet * K / 100);
  return {
    aliciKurus: aliciNet + aliciKdv,
    saticiKurus: saticiNet + saticiKdv,
    kdvTutarKurus: aliciKdv + saticiKdv,
    toplamKurus: aliciNet + saticiNet + aliciKdv + saticiKdv,
  };
}

/** Depozito iade hesabı */
export function depozitoIade(depozitoKurus, hasarKurus, temizlikKurus) {
  const D = safe(depozitoKurus), H = safe(hasarKurus), T = safe(temizlikKurus);
  return Math.max(0, D - H - T);
}

/* ════════════════════════════════════════════════════
 * KATEGORİ F — DİĞER (4)
 * ════════════════════════════════════════════════════ */

/** DASK primi (m² × yapı tipi × deprem bölgesi) */
export function daskPrimi(m2, yapiTipi = 'betonarme', depremBolgesi = 1) {
  // 2026 yaklaşık: betonarme bölge1: 2.50 ₺/m², bölge5: 0.80 ₺/m²
  // Yığma daha pahalı, çelik orta
  const M = safe(m2), B = safe(depremBolgesi);
  const tipKatsayi = { betonarme: 1.0, yigma: 1.4, celik: 1.2, ahsap: 1.6 };
  const bolgeOran = [3.20, 2.60, 2.00, 1.40, 0.80][Math.min(4, Math.max(0, B - 1))] || 2.0;
  const k = tipKatsayi[yapiTipi] || 1.0;
  // Sonuç ₺ cinsinden
  return r(M * bolgeOran * k * 100); // kuruş
}

/** Noter harcı (binde 9.48 — emlak satış sözleşmesi) */
export function noterHarciEmlak(tutarKurus) {
  return r(safe(tutarKurus) * 9.48 / 1000);
}

/** Taşıma maliyeti (mesafe × m³) */
export function tasimaMaliyeti(mesafeKm, m3Esya, asamaSayisi = 1) {
  const D = safe(mesafeKm), M = safe(m3Esya), A = safe(asamaSayisi);
  // Baz: km başı 80 ₺/m³ + asansörsüz kat çıkışı +500 ₺/aşama
  const kmMaliyet = D * M * 80_00; // kuruş
  const asamaMaliyet = A * 500_00;
  return r(kmMaliyet + asamaMaliyet);
}

/** Buy vs Rent (Al ya Da Kirala) */
export function buyVsRent({
  evDegeriKurus,
  aylikKiraKurus,
  yillikArtisYuzde = 5,
  alimGiderYuzde = 5,
  yatirimGetirisiYuzde = 10,
  yil = 10,
}) {
  const D = safe(evDegeriKurus), K = safe(aylikKiraKurus), A = safe(yillikArtisYuzde);
  const G = safe(alimGiderYuzde), Y = safe(yatirimGetirisiYuzde), N = safe(yil);

  // Kiralama: yıllık kira, %5 artış
  let kiraToplam = 0;
  let aylik = K;
  for (let i = 0; i < N; i++) {
    kiraToplam += aylik * 12;
    aylik = r(aylik * (1 + A / 100));
  }

  // Alım: değer + alım gideri - değer artışı (basitleştirilmiş)
  const alimGider = r(D * G / 100);
  const evGuncel = r(D * Math.pow(1 + A / 100, N));
  const degerArtisi = evGuncel - D;
  const alimToplam = D + alimGider - degerArtisi;

  // Yatırım fırsat maliyeti: kira-alım farkını yatırırsan
  const fark = kiraToplam - alimToplam;

  // Kırılma yılı: hangi yılda alım kiralamadan ucuz olur
  let kirilmaYili = 0;
  let kumKira = 0;
  let aylik2 = K;
  for (let i = 1; i <= 30; i++) {
    kumKira += aylik2 * 12;
    aylik2 = r(aylik2 * (1 + A / 100));
    const guncelEv = r(D * Math.pow(1 + A / 100, i));
    const guncelAlim = D + alimGider - (guncelEv - D);
    if (kumKira >= guncelAlim) {
      kirilmaYili = i;
      break;
    }
  }

  const karar = alimToplam < kiraToplam ? 'AL' : 'KİRALA';
  return {
    kiraToplamKurus: kiraToplam,
    alimToplamKurus: alimToplam,
    farkKurus: fark,
    karar,
    kirilmaYili,
  };
}

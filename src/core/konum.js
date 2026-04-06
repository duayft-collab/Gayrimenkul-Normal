/**
 * @file core/konum.js
 * @description Türkiye il/ilçe/bölge helper fonksiyonları
 * @anayasa K01 SRP — sadece lokasyon lookup
 */
import data from '../data/turkiye-il-ilce.json';

const _illerAlfabetik = [...data.iller].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

/** 81 il alfabetik sıralı isim listesi */
export function tumIller() {
  return _illerAlfabetik.map(i => i.ad);
}

/** Detaylı il listesi (plaka + bölge ile) */
export function tumIllerDetay() {
  return _illerAlfabetik.map(i => ({ plaka: i.plaka, ad: i.ad, bolge: i.bolge }));
}

/** Bir ilin ilçelerini Türkçe alfabetik sıralı döndür */
export function ilceleriGetir(ilAdi) {
  const il = data.iller.find(i => i.ad === ilAdi);
  if (!il) return [];
  return [...il.ilceler].sort((a, b) => a.localeCompare(b, 'tr'));
}

/** Plaka numarası döndür */
export function plakaGetir(ilAdi) {
  return data.iller.find(i => i.ad === ilAdi)?.plaka || null;
}

/** Bölge döndür (Marmara, Ege, Akdeniz, ...) */
export function bolgeGetir(ilAdi) {
  return data.iller.find(i => i.ad === ilAdi)?.bolge || null;
}

/** Bir bölgedeki tüm iller */
export function bolgedekiIller(bolge) {
  return _illerAlfabetik.filter(i => i.bolge === bolge).map(i => i.ad);
}

/** Bir il içinde ilçe ismi arama (fuzzy) */
export function ilceAra(sorgu) {
  if (!sorgu || sorgu.length < 2) return [];
  const q = sorgu.toLowerCase();
  const sonuc = [];
  for (const il of data.iller) {
    for (const ilce of il.ilceler) {
      if (ilce.toLowerCase().includes(q)) {
        sonuc.push({ il: il.ad, ilce, plaka: il.plaka });
      }
    }
  }
  return sonuc.slice(0, 50);
}

export const TURKIYE_BOLGELER = data._bolgeler || [];

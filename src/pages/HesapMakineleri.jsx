/**
 * @file pages/HesapMakineleri.jsx
 * @description 44 profesyonel hesap makinesi — kategorili grid + canlı hesap
 * @anayasa K01 SRP · K02 offline · K10 kuruş integer · K14 localStorage geçmiş
 */
import { useEffect, useMemo, useState } from 'react';
import { Topbar } from '../components/Layout';
import * as H from '../core/hesaplamalar';

/* ════════════ Format helpers ════════════ */
const tlToKurus = (tl) => Math.round((Number(tl) || 0) * 100);

const formatPara = (kurus) => {
  if (kurus == null || isNaN(kurus)) return '₺0';
  const tl = (kurus || 0) / 100;
  return '₺' + new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(tl);
};
const formatYuzde = (s) => {
  if (s == null || isNaN(s)) return '—';
  return '%' + new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(s);
};
const formatSayi = (s) => {
  if (s == null || isNaN(s)) return '—';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(s);
};
const formatM2 = (s) => formatSayi(s) + ' m²';

/* ════════════ Kategori renkleri ════════════ */
const KATEGORILER = {
  kredi:   { ad: 'Kredi & Ödemeler', ikon: '💳', renk: '#1B4F8A', gradBas: '#1B4F8A', gradBit: '#3B82F6' },
  kira:    { ad: 'Kira & Getiri',    ikon: '🏠', renk: '#22C55E', gradBas: '#16A34A', gradBit: '#22C55E' },
  vergi:   { ad: 'Vergi',            ikon: '📊', renk: '#EF4444', gradBas: '#DC2626', gradBit: '#EF4444' },
  insaat:  { ad: 'İnşaat & Kat Karşılığı', ikon: '🏗️', renk: '#F59E0B', gradBas: '#EA580C', gradBit: '#F59E0B' },
  fatura:  { ad: 'Fatura & Günlük',  ikon: '💡', renk: '#8B5CF6', gradBas: '#7C3AED', gradBit: '#8B5CF6' },
  diger:   { ad: 'Diğer',             ikon: '📎', renk: '#64748B', gradBas: '#475569', gradBit: '#64748B' },
};

/* ════════════ MAKINE REGISTRY (44 adet) ════════════
 * tipler: 'para' (TL→kuruş), 'yuzde', 'sayi', 'select'
 */
const MAKINELER = [
  /* ── KREDİ (8) ── */
  {
    id: 'krediTaksit',
    kategori: 'kredi',
    ad: 'Kredi Taksit (EKE)',
    ikon: '💳',
    aciklama: 'Eşit taksitli kredi — PMT formülü',
    girdiler: [
      { key: 'anapara', label: 'Anapara', tip: 'para', vars: 1000000 },
      { key: 'faiz', label: 'Yıllık Faiz', tip: 'yuzde', vars: 36 },
      { key: 'vade', label: 'Vade (ay)', tip: 'sayi', vars: 36 },
    ],
    hesapla: (g) => H.krediTaksitEKE(g.anapara, g.faiz, g.vade),
    sonuclar: [
      { key: 'aylikTaksit', label: 'Aylık Taksit', tip: 'para', vurgu: true },
      { key: 'toplamOdeme', label: 'Toplam Ödeme', tip: 'para' },
      { key: 'toplamFaiz',  label: 'Toplam Faiz',  tip: 'para' },
    ],
  },
  {
    id: 'krediErken',
    kategori: 'kredi',
    ad: 'Erken Ödeme',
    ikon: '⏩',
    aciklama: 'Erken ödeme yaptığında kazanç + yeni vade',
    girdiler: [
      { key: 'kalanAna', label: 'Kalan Anapara', tip: 'para', vars: 500000 },
      { key: 'kalanAy', label: 'Kalan Vade (ay)', tip: 'sayi', vars: 24 },
      { key: 'faiz', label: 'Yıllık Faiz', tip: 'yuzde', vars: 36 },
      { key: 'erken', label: 'Erken Ödeme', tip: 'para', vars: 100000 },
    ],
    hesapla: (g) => H.krediErkenOdeme(g.kalanAna, g.kalanAy, g.faiz, g.erken),
    sonuclar: [
      { key: 'yeniKalan', label: 'Yeni Kalan', tip: 'para' },
      { key: 'kazancKurus', label: 'Faiz Kazancı', tip: 'para', vurgu: true },
      { key: 'yeniVade', label: 'Yeni Vade', tip: 'sayi', birim: 'ay' },
    ],
  },
  {
    id: 'krediOdemeGucu',
    kategori: 'kredi',
    ad: 'Ödeme Gücü',
    ikon: '💪',
    aciklama: 'Maksimum kullanabileceğin aylık taksit (gelirin %40\'ı)',
    girdiler: [
      { key: 'gelir', label: 'Net Aylık Gelir', tip: 'para', vars: 50000 },
      { key: 'taksit', label: 'Mevcut Taksitler', tip: 'para', vars: 0 },
      { key: 'oran', label: 'Maks Oran', tip: 'yuzde', vars: 40 },
    ],
    hesapla: (g) => ({ deger: H.krediOdemeGucu(g.gelir, g.taksit, g.oran) }),
    sonuclar: [
      { key: 'deger', label: 'Maks Aylık Taksit', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'faizBasit',
    kategori: 'kredi',
    ad: 'Basit Faiz',
    ikon: '📈',
    aciklama: 'Vade gün bazlı basit faiz',
    girdiler: [
      { key: 'ana', label: 'Anapara', tip: 'para', vars: 100000 },
      { key: 'faiz', label: 'Yıllık Faiz', tip: 'yuzde', vars: 50 },
      { key: 'gun', label: 'Gün', tip: 'sayi', vars: 365 },
    ],
    hesapla: (g) => ({ faiz: H.faizBasit(g.ana, g.faiz, g.gun) }),
    sonuclar: [
      { key: 'faiz', label: 'Faiz Tutarı', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'faizBilesik',
    kategori: 'kredi',
    ad: 'Bileşik Faiz',
    ikon: '🔄',
    aciklama: 'Faizin faizi — uzun vadeli yatırım',
    girdiler: [
      { key: 'ana', label: 'Yatırım', tip: 'para', vars: 100000 },
      { key: 'faiz', label: 'Yıllık Faiz', tip: 'yuzde', vars: 30 },
      { key: 'yil', label: 'Yıl', tip: 'sayi', vars: 5 },
      { key: 'periyot', label: 'Yıllık Periyot', tip: 'sayi', vars: 12 },
    ],
    hesapla: (g) => ({ son: H.faizBilesik(g.ana, g.faiz, g.yil, g.periyot) }),
    sonuclar: [
      { key: 'son', label: 'Sonuç Tutar', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'efektifFaiz',
    kategori: 'kredi',
    ad: 'Efektif Faiz',
    ikon: '🎯',
    aciklama: 'APR → APY dönüşüm',
    girdiler: [
      { key: 'nominal', label: 'Nominal', tip: 'yuzde', vars: 36 },
      { key: 'periyot', label: 'Periyot/Yıl', tip: 'sayi', vars: 12 },
    ],
    hesapla: (g) => ({ efektif: H.efektifFaiz(g.nominal, g.periyot) }),
    sonuclar: [
      { key: 'efektif', label: 'Efektif Faiz', tip: 'yuzde', vurgu: true },
    ],
  },
  {
    id: 'gecikmeFaizi',
    kategori: 'kredi',
    ad: 'Gecikme Faizi',
    ikon: '⏰',
    aciklama: 'Vadesi geçen tutarın gecikme faizi',
    girdiler: [
      { key: 'tutar', label: 'Tutar', tip: 'para', vars: 50000 },
      { key: 'gun', label: 'Gecikme Gün', tip: 'sayi', vars: 30 },
      { key: 'faiz', label: 'Yıllık Faiz', tip: 'yuzde', vars: 60 },
    ],
    hesapla: (g) => ({ faiz: H.gecikmeFaizi(g.tutar, g.gun, g.faiz) }),
    sonuclar: [
      { key: 'faiz', label: 'Gecikme Faizi', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'amortismanTablo',
    kategori: 'kredi',
    ad: 'Amortisman Tablosu',
    ikon: '📋',
    aciklama: 'Aylık taksit + ana + faiz + kalan',
    girdiler: [
      { key: 'ana', label: 'Anapara', tip: 'para', vars: 1000000 },
      { key: 'faiz', label: 'Yıllık Faiz', tip: 'yuzde', vars: 36 },
      { key: 'vade', label: 'Vade (ay)', tip: 'sayi', vars: 24 },
    ],
    hesapla: (g) => ({ plan: H.amortismanTablosu(g.ana, g.faiz, g.vade) }),
    sonuclar: [
      { key: 'plan', label: 'Plan', tip: 'plan' },
    ],
  },

  /* ── KİRA (8) ── */
  {
    id: 'kiraTufe',
    kategori: 'kira',
    ad: 'Kira Artış (TÜFE)',
    ikon: '📈',
    aciklama: 'TÜFE oranıyla kira artışı',
    girdiler: [
      { key: 'mevcut', label: 'Mevcut Kira', tip: 'para', vars: 15000 },
      { key: 'tufe', label: 'TÜFE', tip: 'yuzde', vars: 48 },
    ],
    hesapla: (g) => H.kiraArtisTufe(g.mevcut, g.tufe),
    sonuclar: [
      { key: 'yeniKira', label: 'Yeni Kira', tip: 'para', vurgu: true },
      { key: 'artisKurus', label: 'Artış', tip: 'para' },
    ],
  },
  {
    id: 'kiraYasal',
    kategori: 'kira',
    ad: 'Yasal Artış (12 Ay TÜFE)',
    ikon: '⚖️',
    aciklama: 'Son 12 ay TÜFE ortalaması — yasal sınır',
    girdiler: [
      { key: 'mevcut', label: 'Mevcut Kira', tip: 'para', vars: 15000 },
      { key: 'ort', label: 'Son 12 Ay Ort. TÜFE', tip: 'yuzde', vars: 42 },
    ],
    hesapla: (g) => ({ yeni: H.kiraArtisYasal12Ay(g.mevcut, g.ort) }),
    sonuclar: [
      { key: 'yeni', label: 'Yasal Maks Yeni Kira', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'kiraGetirisi',
    kategori: 'kira',
    ad: 'Kira Getirisi (Yıllık)',
    ikon: '🏠',
    aciklama: 'Aylık kira → yıllık % getiri',
    girdiler: [
      { key: 'aylik', label: 'Aylık Kira', tip: 'para', vars: 15000 },
      { key: 'deger', label: 'Mülk Değeri', tip: 'para', vars: 3000000 },
    ],
    hesapla: (g) => ({ yuzde: H.kiraGetirisiYillik(g.aylik, g.deger) }),
    sonuclar: [
      { key: 'yuzde', label: 'Yıllık Getiri', tip: 'yuzde', vurgu: true },
    ],
  },
  {
    id: 'geriDonus',
    kategori: 'kira',
    ad: 'Geri Dönüş Yılı',
    ikon: '⏳',
    aciklama: 'Mülk değerini kaç yılda kira ile çıkarırsın',
    girdiler: [
      { key: 'deger', label: 'Mülk Değeri', tip: 'para', vars: 3000000 },
      { key: 'yillik', label: 'Yıllık Net Kira', tip: 'para', vars: 180000 },
    ],
    hesapla: (g) => ({ yil: H.geriDonusYili(g.deger, g.yillik) }),
    sonuclar: [
      { key: 'yil', label: 'Geri Dönüş', tip: 'sayi', birim: 'yıl', vurgu: true },
    ],
  },
  {
    id: 'capRate',
    kategori: 'kira',
    ad: 'Cap Rate',
    ikon: '🎯',
    aciklama: 'Net Operating Income / Değer',
    girdiler: [
      { key: 'noi', label: 'Yıllık Net Gelir', tip: 'para', vars: 180000 },
      { key: 'deger', label: 'Mülk Değeri', tip: 'para', vars: 3000000 },
    ],
    hesapla: (g) => ({ cap: H.capRate(g.noi, g.deger) }),
    sonuclar: [
      { key: 'cap', label: 'Cap Rate', tip: 'yuzde', vurgu: true },
    ],
  },
  {
    id: 'grm',
    kategori: 'kira',
    ad: 'GRM (Gross Rent Multiplier)',
    ikon: '📐',
    aciklama: 'Mülk değeri / yıllık brüt kira',
    girdiler: [
      { key: 'deger', label: 'Mülk Değeri', tip: 'para', vars: 3000000 },
      { key: 'brut', label: 'Yıllık Brüt Kira', tip: 'para', vars: 180000 },
    ],
    hesapla: (g) => ({ grm: H.grossRentMultiplier(g.deger, g.brut) }),
    sonuclar: [
      { key: 'grm', label: 'GRM', tip: 'sayi', vurgu: true },
    ],
  },
  {
    id: 'reelKira',
    kategori: 'kira',
    ad: 'Reel Kira Getirisi',
    ikon: '📉',
    aciklama: 'Kira artışı - TÜFE = reel getiri',
    girdiler: [
      { key: 'kira', label: 'Kira Artışı', tip: 'yuzde', vars: 48 },
      { key: 'tufe', label: 'TÜFE', tip: 'yuzde', vars: 50 },
    ],
    hesapla: (g) => ({ reel: H.reelKiraGetirisi(g.kira, g.tufe) }),
    sonuclar: [
      { key: 'reel', label: 'Reel Getiri', tip: 'yuzde', vurgu: true },
    ],
  },
  {
    id: 'dovizKira',
    kategori: 'kira',
    ad: 'Döviz Bazlı Kira',
    ikon: '💱',
    aciklama: 'TL kirayı dövize çevir',
    girdiler: [
      { key: 'tl', label: 'Aylık Kira (TL)', tip: 'para', vars: 15000 },
      { key: 'kur', label: 'Kur (TL/Döviz)', tip: 'sayi', vars: 38.5 },
    ],
    hesapla: (g) => ({ doviz: H.dovizBazliKira(g.tl, g.kur) }),
    sonuclar: [
      { key: 'doviz', label: 'Döviz Cinsinden', tip: 'para', vurgu: true },
    ],
  },

  /* ── VERGİ (6) ── */
  {
    id: 'kiraStopaji',
    kategori: 'vergi',
    ad: 'Kira Stopajı',
    ikon: '✂️',
    aciklama: 'İşyeri kira stopajı %20',
    girdiler: [
      { key: 'brut', label: 'Brüt Kira', tip: 'para', vars: 25000 },
      { key: 'oran', label: 'Stopaj Oranı', tip: 'yuzde', vars: 20 },
    ],
    hesapla: (g) => H.kiraStopaji(g.brut, g.oran),
    sonuclar: [
      { key: 'stopaj', label: 'Stopaj', tip: 'para' },
      { key: 'net', label: 'Net Kira', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'gmsi',
    kategori: 'vergi',
    ad: 'GMSİ Vergisi',
    ikon: '📋',
    aciklama: 'Gayrimenkul Sermaye İradı — kademeli',
    girdiler: [
      { key: 'yillik', label: 'Yıllık Kira', tip: 'para', vars: 180000 },
      { key: 'istisna', label: 'İstisna', tip: 'para', vars: 47000 },
    ],
    hesapla: (g) => H.gmsiVergisi(g.yillik, g.istisna),
    sonuclar: [
      { key: 'matrah', label: 'Matrah', tip: 'para' },
      { key: 'vergi', label: 'Tahmini Vergi', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'tapuAlici',
    kategori: 'vergi',
    ad: 'Tapu Harcı (Alıcı)',
    ikon: '📝',
    aciklama: 'Alıcı tapu harcı %2',
    girdiler: [
      { key: 'satis', label: 'Satış Bedeli', tip: 'para', vars: 3000000 },
      { key: 'oran', label: 'Oran', tip: 'yuzde', vars: 2 },
    ],
    hesapla: (g) => ({ harc: H.tapuHarciAlici(g.satis, g.oran) }),
    sonuclar: [
      { key: 'harc', label: 'Harç', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'tapuSatici',
    kategori: 'vergi',
    ad: 'Tapu Harcı (Satıcı)',
    ikon: '📝',
    aciklama: 'Satıcı tapu harcı %2',
    girdiler: [
      { key: 'satis', label: 'Satış Bedeli', tip: 'para', vars: 3000000 },
      { key: 'oran', label: 'Oran', tip: 'yuzde', vars: 2 },
    ],
    hesapla: (g) => ({ harc: H.tapuHarciSatici(g.satis, g.oran) }),
    sonuclar: [
      { key: 'harc', label: 'Harç', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'emlakVergi',
    kategori: 'vergi',
    ad: 'Emlak Vergisi',
    ikon: '🏛️',
    aciklama: '1319 SK — yıllık emlak vergisi',
    girdiler: [
      { key: 'deger', label: 'Mülk Değeri', tip: 'para', vars: 3000000 },
      { key: 'tur', label: 'Tür', tip: 'select', vars: 'konut',
        secenekler: [
          { value: 'konut', label: 'Konut (‰1)' },
          { value: 'isyeri', label: 'İşyeri (‰2)' },
          { value: 'arsa', label: 'Arsa (‰3)' },
          { value: 'arazi', label: 'Arazi (‰1)' },
        ] },
    ],
    hesapla: (g) => ({ vergi: H.emlakVergisi(g.deger, g.tur) }),
    sonuclar: [
      { key: 'vergi', label: 'Yıllık Vergi', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'kdv',
    kategori: 'vergi',
    ad: 'KDV Hesaplama',
    ikon: '💯',
    aciklama: 'Dahil/Hariç KDV ayrıştırma',
    girdiler: [
      { key: 'tutar', label: 'Tutar', tip: 'para', vars: 100000 },
      { key: 'oran', label: 'KDV Oranı', tip: 'yuzde', vars: 20 },
      { key: 'mod', label: 'Mod', tip: 'select', vars: 'haric',
        secenekler: [
          { value: 'haric', label: 'KDV Hariç' },
          { value: 'dahil', label: 'KDV Dahil' },
        ] },
    ],
    hesapla: (g) => H.kdvHesap(g.tutar, g.oran, g.mod),
    sonuclar: [
      { key: 'net', label: 'Net', tip: 'para' },
      { key: 'kdv', label: 'KDV', tip: 'para' },
      { key: 'brut', label: 'Brüt', tip: 'para', vurgu: true },
    ],
  },

  /* ── İNŞAAT (12) ── */
  {
    id: 'emsal',
    kategori: 'insaat',
    ad: 'Emsal Hesabı',
    ikon: '📐',
    aciklama: 'Parsel × emsal = max inşaat m²',
    girdiler: [
      { key: 'parsel', label: 'Parsel m²', tip: 'sayi', vars: 1000 },
      { key: 'emsal', label: 'Emsal', tip: 'sayi', vars: 2 },
    ],
    hesapla: (g) => ({ insaat: H.emsalHesap(g.parsel, g.emsal) }),
    sonuclar: [
      { key: 'insaat', label: 'Maks İnşaat', tip: 'sayi', birim: 'm²', vurgu: true },
    ],
  },
  {
    id: 'taks',
    kategori: 'insaat',
    ad: 'TAKS Hesabı',
    ikon: '🟦',
    aciklama: 'Parsel × TAKS = taban alanı',
    girdiler: [
      { key: 'parsel', label: 'Parsel m²', tip: 'sayi', vars: 1000 },
      { key: 'taks', label: 'TAKS', tip: 'sayi', vars: 0.4 },
    ],
    hesapla: (g) => ({ taban: H.taksHesap(g.parsel, g.taks) }),
    sonuclar: [
      { key: 'taban', label: 'Taban Alanı', tip: 'sayi', birim: 'm²', vurgu: true },
    ],
  },
  {
    id: 'katKarsi',
    kategori: 'insaat',
    ad: 'Kat Karşılığı Paylaşım',
    ikon: '🤝',
    aciklama: 'Yüklenici/mal sahibi paylaşımı + kar',
    girdiler: [
      { key: 'parselM2', label: 'Parsel m²', tip: 'sayi', vars: 1000 },
      { key: 'emsal', label: 'Emsal', tip: 'sayi', vars: 2 },
      { key: 'insaatMaliyetiKurus', label: 'İnşaat Maliyeti m²', tip: 'para', vars: 25000 },
      { key: 'satisM2Kurus', label: 'Satış m²', tip: 'para', vars: 60000 },
      { key: 'yukleniciPayiYuzde', label: 'Yüklenici Payı', tip: 'yuzde', vars: 50 },
    ],
    hesapla: (g) => H.katKarsiligiPaylasim(g),
    sonuclar: [
      { key: 'toplamM2', label: 'Toplam İnşaat', tip: 'sayi', birim: 'm²' },
      { key: 'yukleniciM2', label: 'Yüklenici m²', tip: 'sayi', birim: 'm²' },
      { key: 'malsahibiM2', label: 'Mal Sahibi m²', tip: 'sayi', birim: 'm²' },
      { key: 'yukleniciKarKurus', label: 'Yüklenici Kâr', tip: 'para', vurgu: true },
      { key: 'malsahibiKarKurus', label: 'Mal Sahibi Değer', tip: 'para' },
    ],
  },
  {
    id: 'insaatM2',
    kategori: 'insaat',
    ad: 'İnşaat Maliyeti m²',
    ikon: '💰',
    aciklama: 'Kategori bazlı 2026 ortalama',
    girdiler: [
      { key: 'kategori', label: 'Kategori', tip: 'select', vars: 'orta',
        secenekler: [
          { value: 'ekonomik', label: 'Ekonomik' },
          { value: 'orta', label: 'Orta' },
          { value: 'luks', label: 'Lüks' },
        ] },
    ],
    hesapla: (g) => ({ m2: H.insaatMaliyetiM2(g.kategori) }),
    sonuclar: [
      { key: 'm2', label: 'm² Maliyet', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'demir',
    kategori: 'insaat',
    ad: 'Demir Hesabı',
    ikon: '🔩',
    aciklama: 'kg/m² × inşaat alanı',
    girdiler: [
      { key: 'm2', label: 'İnşaat m²', tip: 'sayi', vars: 200 },
      { key: 'kg', label: 'kg/m²', tip: 'sayi', vars: 80 },
      { key: 'fiyat', label: '₺/kg', tip: 'para', vars: 25 },
    ],
    hesapla: (g) => H.demirHesap(g.m2, g.kg, g.fiyat),
    sonuclar: [
      { key: 'kg', label: 'Toplam', tip: 'sayi', birim: 'kg' },
      { key: 'ton', label: 'Ton', tip: 'sayi', birim: 'ton' },
      { key: 'maliyetKurus', label: 'Maliyet', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'beton',
    kategori: 'insaat',
    ad: 'Beton Hesabı',
    ikon: '🧱',
    aciklama: 'm³/m² + kamyon sayısı',
    girdiler: [
      { key: 'm2', label: 'İnşaat m²', tip: 'sayi', vars: 200 },
      { key: 'm3', label: 'm³/m²', tip: 'sayi', vars: 0.35 },
      { key: 'fiyat', label: '₺/m³', tip: 'para', vars: 2500 },
    ],
    hesapla: (g) => H.betonHesap(g.m2, g.m3, g.fiyat),
    sonuclar: [
      { key: 'm3', label: 'Toplam', tip: 'sayi', birim: 'm³' },
      { key: 'kamyon', label: 'Kamyon', tip: 'sayi', birim: 'adet' },
      { key: 'maliyetKurus', label: 'Maliyet', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'boya',
    kategori: 'insaat',
    ad: 'Boya Hesabı',
    ikon: '🎨',
    aciklama: 'Litre + maliyet',
    girdiler: [
      { key: 'alan', label: 'Alan m²', tip: 'sayi', vars: 200 },
      { key: 'kat', label: 'Kat Sayısı', tip: 'sayi', vars: 2 },
      { key: 'l', label: 'Litre/10m²', tip: 'sayi', vars: 1 },
      { key: 'fiyat', label: '₺/litre', tip: 'para', vars: 300 },
    ],
    hesapla: (g) => H.boyaHesap(g.alan, g.kat, g.l, g.fiyat),
    sonuclar: [
      { key: 'litre', label: 'Litre', tip: 'sayi', birim: 'L' },
      { key: 'maliyetKurus', label: 'Maliyet', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'fayans',
    kategori: 'insaat',
    ad: 'Fayans Hesabı',
    ikon: '🟫',
    aciklama: 'Fire payı dahil',
    girdiler: [
      { key: 'alan', label: 'Alan m²', tip: 'sayi', vars: 50 },
      { key: 'fire', label: 'Fire', tip: 'yuzde', vars: 10 },
      { key: 'fiyat', label: '₺/m²', tip: 'para', vars: 350 },
    ],
    hesapla: (g) => H.fayansHesap(g.alan, g.fire, g.fiyat),
    sonuclar: [
      { key: 'm2Ham', label: 'Toplam m²', tip: 'sayi', birim: 'm²' },
      { key: 'maliyetKurus', label: 'Maliyet', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'alci',
    kategori: 'insaat',
    ad: 'Alçı Sıva',
    ikon: '🪣',
    aciklama: 'kg + maliyet',
    girdiler: [
      { key: 'alan', label: 'Alan m²', tip: 'sayi', vars: 200 },
      { key: 'cm', label: 'Kalınlık (cm)', tip: 'sayi', vars: 2 },
      { key: 'fiyat', label: '₺/kg', tip: 'para', vars: 12 },
    ],
    hesapla: (g) => H.alciSivaHesap(g.alan, g.cm, g.fiyat),
    sonuclar: [
      { key: 'kg', label: 'Toplam', tip: 'sayi', birim: 'kg' },
      { key: 'maliyetKurus', label: 'Maliyet', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'kapiPencere',
    kategori: 'insaat',
    ad: 'Kapı/Pencere Tahmini',
    ikon: '🚪',
    aciklama: '100m²\'de ~5 kapı + 5 pencere',
    girdiler: [
      { key: 'm2', label: 'Yapı m²', tip: 'sayi', vars: 200 },
    ],
    hesapla: (g) => H.kapiPencereHesap(g.m2),
    sonuclar: [
      { key: 'kapi', label: 'Kapı', tip: 'sayi', birim: 'adet' },
      { key: 'pencere', label: 'Pencere', tip: 'sayi', birim: 'adet' },
      { key: 'maliyetKurus', label: 'Maliyet', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'asansor',
    kategori: 'insaat',
    ad: 'Asansör',
    ikon: '🛗',
    aciklama: '4 kat üstü zorunlu',
    girdiler: [
      { key: 'kat', label: 'Kat Sayısı', tip: 'sayi', vars: 5 },
    ],
    hesapla: (g) => H.asansorHesap(g.kat),
    sonuclar: [
      { key: 'maliyetKurus', label: 'Kurulum', tip: 'para', vurgu: true },
      { key: 'yillikBakimKurus', label: 'Yıllık Bakım', tip: 'para' },
    ],
  },
  {
    id: 'parselBolme',
    kategori: 'insaat',
    ad: 'Parsel Bölme',
    ikon: '✂️',
    aciklama: 'Eşit bölüm m²',
    girdiler: [
      { key: 'parsel', label: 'Parsel m²', tip: 'sayi', vars: 1000 },
      { key: 'bolum', label: 'Bölüm Sayısı', tip: 'sayi', vars: 4 },
    ],
    hesapla: (g) => ({ bolum: H.parselBolme(g.parsel, g.bolum) }),
    sonuclar: [
      { key: 'bolum', label: 'Her Bölüm', tip: 'sayi', birim: 'm²', vurgu: true },
    ],
  },

  /* ── FATURA (6) ── */
  {
    id: 'elektrik',
    kategori: 'fatura',
    ad: 'Elektrik Faturası',
    ikon: '⚡',
    aciklama: 'kWh × tarife',
    girdiler: [
      { key: 'kwh', label: 'Tüketim kWh', tip: 'sayi', vars: 250 },
      { key: 'tarife', label: 'Tarife', tip: 'para', vars: 1.95 },
    ],
    hesapla: (g) => ({ tutar: H.elektrikFatura(g.kwh, g.tarife) }),
    sonuclar: [
      { key: 'tutar', label: 'Fatura', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'dogalgaz',
    kategori: 'fatura',
    ad: 'Doğalgaz Faturası',
    ikon: '🔥',
    aciklama: 'm³ × tarife',
    girdiler: [
      { key: 'm3', label: 'Tüketim m³', tip: 'sayi', vars: 150 },
      { key: 'tarife', label: 'Tarife', tip: 'para', vars: 9.50 },
    ],
    hesapla: (g) => ({ tutar: H.dogalgazFatura(g.m3, g.tarife) }),
    sonuclar: [
      { key: 'tutar', label: 'Fatura', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'su',
    kategori: 'fatura',
    ad: 'Su Faturası',
    ikon: '💧',
    aciklama: 'm³ × tarife',
    girdiler: [
      { key: 'm3', label: 'Tüketim m³', tip: 'sayi', vars: 12 },
      { key: 'tarife', label: 'Tarife', tip: 'para', vars: 50 },
    ],
    hesapla: (g) => ({ tutar: H.suFatura(g.m3, g.tarife) }),
    sonuclar: [
      { key: 'tutar', label: 'Fatura', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'aidat',
    kategori: 'fatura',
    ad: 'Aidat Bölüştürme',
    ikon: '🏢',
    aciklama: 'Eşit / m² / kişi',
    girdiler: [
      { key: 'toplam', label: 'Toplam Aidat', tip: 'para', vars: 50000 },
      { key: 'daire', label: 'Daire Sayısı', tip: 'sayi', vars: 20 },
    ],
    hesapla: (g) => ({ daireBasi: H.aidatBolustur(g.toplam, g.daire, 'esit') }),
    sonuclar: [
      { key: 'daireBasi', label: 'Daire Başına', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'komisyon',
    kategori: 'fatura',
    ad: 'Emlakçı Komisyonu',
    ikon: '🤝',
    aciklama: 'Alıcı + Satıcı + KDV',
    girdiler: [
      { key: 'satis', label: 'Satış Bedeli', tip: 'para', vars: 3000000 },
      { key: 'aliciYuzde', label: 'Alıcı %', tip: 'yuzde', vars: 2 },
      { key: 'saticiYuzde', label: 'Satıcı %', tip: 'yuzde', vars: 2 },
      { key: 'kdvYuzde', label: 'KDV %', tip: 'yuzde', vars: 20 },
    ],
    hesapla: (g) => H.komisyonEmlak(g.satis, g.aliciYuzde, g.saticiYuzde, g.kdvYuzde),
    sonuclar: [
      { key: 'aliciKurus', label: 'Alıcı (KDV dahil)', tip: 'para' },
      { key: 'saticiKurus', label: 'Satıcı (KDV dahil)', tip: 'para' },
      { key: 'toplamKurus', label: 'Toplam Komisyon', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'depozito',
    kategori: 'fatura',
    ad: 'Depozito İade',
    ikon: '💰',
    aciklama: 'Depozito - hasar - temizlik',
    girdiler: [
      { key: 'dep', label: 'Depozito', tip: 'para', vars: 30000 },
      { key: 'hasar', label: 'Hasar', tip: 'para', vars: 0 },
      { key: 'temizlik', label: 'Temizlik', tip: 'para', vars: 0 },
    ],
    hesapla: (g) => ({ iade: H.depozitoIade(g.dep, g.hasar, g.temizlik) }),
    sonuclar: [
      { key: 'iade', label: 'İade Edilecek', tip: 'para', vurgu: true },
    ],
  },

  /* ── DİĞER (4) ── */
  {
    id: 'dask',
    kategori: 'diger',
    ad: 'DASK Primi',
    ikon: '🏚️',
    aciklama: 'Zorunlu deprem sigortası',
    girdiler: [
      { key: 'm2', label: 'm²', tip: 'sayi', vars: 120 },
      { key: 'tip', label: 'Yapı Tipi', tip: 'select', vars: 'betonarme',
        secenekler: [
          { value: 'betonarme', label: 'Betonarme' },
          { value: 'yigma', label: 'Yığma' },
          { value: 'celik', label: 'Çelik' },
          { value: 'ahsap', label: 'Ahşap' },
        ] },
      { key: 'bolge', label: 'Deprem Bölgesi (1-5)', tip: 'sayi', vars: 1 },
    ],
    hesapla: (g) => ({ prim: H.daskPrimi(g.m2, g.tip, g.bolge) }),
    sonuclar: [
      { key: 'prim', label: 'Yıllık Prim', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'noter',
    kategori: 'diger',
    ad: 'Noter Harcı (Emlak)',
    ikon: '📜',
    aciklama: 'Binde 9.48 emlak satış sözleşmesi',
    girdiler: [
      { key: 'tutar', label: 'Tutar', tip: 'para', vars: 3000000 },
    ],
    hesapla: (g) => ({ harc: H.noterHarciEmlak(g.tutar) }),
    sonuclar: [
      { key: 'harc', label: 'Noter Harcı', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'tasima',
    kategori: 'diger',
    ad: 'Taşıma Maliyeti',
    ikon: '🚚',
    aciklama: 'Mesafe + m³ + aşama',
    girdiler: [
      { key: 'km', label: 'Mesafe (km)', tip: 'sayi', vars: 30 },
      { key: 'm3', label: 'Eşya m³', tip: 'sayi', vars: 25 },
      { key: 'asama', label: 'Aşama', tip: 'sayi', vars: 2 },
    ],
    hesapla: (g) => ({ maliyet: H.tasimaMaliyeti(g.km, g.m3, g.asama) }),
    sonuclar: [
      { key: 'maliyet', label: 'Tahmini Maliyet', tip: 'para', vurgu: true },
    ],
  },
  {
    id: 'buyVsRent',
    kategori: 'diger',
    ad: 'Al ya da Kirala (Buy vs Rent)',
    ikon: '⚖️',
    aciklama: 'N yıl sonunda hangisi karlı',
    girdiler: [
      { key: 'evDegeriKurus', label: 'Ev Değeri', tip: 'para', vars: 3000000 },
      { key: 'aylikKiraKurus', label: 'Aylık Kira', tip: 'para', vars: 15000 },
      { key: 'yillikArtisYuzde', label: 'Yıllık Artış', tip: 'yuzde', vars: 5 },
      { key: 'alimGiderYuzde', label: 'Alım Gider', tip: 'yuzde', vars: 5 },
      { key: 'yatirimGetirisiYuzde', label: 'Yatırım Getirisi', tip: 'yuzde', vars: 10 },
      { key: 'yil', label: 'Yıl', tip: 'sayi', vars: 10 },
    ],
    hesapla: (g) => H.buyVsRent(g),
    sonuclar: [
      { key: 'kiraToplamKurus', label: 'Kira Toplamı', tip: 'para' },
      { key: 'alimToplamKurus', label: 'Alım Net Maliyeti', tip: 'para' },
      { key: 'farkKurus', label: 'Fark', tip: 'para' },
      { key: 'kirilmaYili', label: 'Kırılma Yılı', tip: 'sayi', birim: 'yıl' },
      { key: 'karar', label: 'Tavsiye', tip: 'metin', vurgu: true },
    ],
  },
];

/* ════════════ Generic CalculatorCard ════════════ */

function CalculatorCard({ makine }) {
  const kategoriRenk = KATEGORILER[makine.kategori] || KATEGORILER.diger;
  const [girdiler, setGirdiler] = useState(() => {
    // Geçmişten son değerleri yükle
    try {
      const son = JSON.parse(localStorage.getItem(`hesap_${makine.id}_son`) || 'null');
      if (son) return son;
    } catch {}
    const ilk = {};
    for (const g of makine.girdiler) ilk[g.key] = g.vars;
    return ilk;
  });

  const sonuc = useMemo(() => {
    try {
      // Para tipindeki girdileri kuruşa çevir
      const hesapGirdileri = {};
      for (const g of makine.girdiler) {
        const ham = girdiler[g.key];
        if (g.tip === 'para') hesapGirdileri[g.key] = tlToKurus(ham);
        else if (g.tip === 'yuzde' || g.tip === 'sayi') hesapGirdileri[g.key] = Number(ham) || 0;
        else hesapGirdileri[g.key] = ham;
      }
      return makine.hesapla(hesapGirdileri);
    } catch (e) {
      console.warn('[hesap]', makine.id, e);
      return {};
    }
  }, [girdiler, makine]);

  const setGirdi = (key, val) => {
    setGirdiler(g => {
      const yeni = { ...g, [key]: val };
      try { localStorage.setItem(`hesap_${makine.id}_son`, JSON.stringify(yeni)); } catch {}
      return yeni;
    });
  };

  const formatSonuc = (s, key) => {
    const cikti = makine.sonuclar.find(x => x.key === key);
    if (!cikti) return '—';
    if (cikti.tip === 'para') return formatPara(s);
    if (cikti.tip === 'yuzde') return formatYuzde(s);
    if (cikti.tip === 'sayi') return formatSayi(s) + (cikti.birim ? ' ' + cikti.birim : '');
    if (cikti.tip === 'metin') return s;
    return s;
  };

  const kopyala = () => {
    const ozet = makine.sonuclar.map(c => `${c.label}: ${formatSonuc(sonuc[c.key], c.key)}`).join('\n');
    navigator.clipboard.writeText(`${makine.ad}\n${ozet}`);
  };

  const gecmisKaydet = () => {
    try {
      const key = `hesap_${makine.id}_gecmis`;
      const onceki = JSON.parse(localStorage.getItem(key) || '[]');
      const yeni = [{ ts: Date.now(), girdiler, sonuc }, ...onceki].slice(0, 10);
      localStorage.setItem(key, JSON.stringify(yeni));
    } catch {}
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: '1.2rem' }}>{makine.ikon}</span>
        <div style={{ flex: 1, fontFamily: 'var(--serif)', fontWeight: 700, fontSize: '.95rem' }}>{makine.ad}</div>
      </div>
      {makine.aciklama && (
        <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginBottom: 12 }}>{makine.aciklama}</div>
      )}

      {/* Girdiler */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {makine.girdiler.map(g => (
          <div key={g.key}>
            <label style={{ fontSize: '.65rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>
              {g.label}
            </label>
            {g.tip === 'select' ? (
              <select className="select" value={girdiler[g.key]} onChange={e => setGirdi(g.key, e.target.value)} style={{ padding: '6px 8px', fontSize: '.78rem' }}>
                {g.secenekler.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            ) : (
              <input
                type="number"
                step={g.tip === 'yuzde' ? '0.1' : '1'}
                value={girdiler[g.key] ?? ''}
                onChange={e => setGirdi(g.key, e.target.value)}
                className="input"
                style={{ padding: '6px 8px', fontSize: '.82rem' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Sonuç paneli */}
      <div style={{
        background: `linear-gradient(135deg, ${kategoriRenk.gradBas}26, ${kategoriRenk.gradBit}11)`,
        border: `1px solid ${kategoriRenk.renk}40`,
        borderRadius: 8, padding: 12, marginBottom: 10,
      }}>
        {makine.sonuclar.map(c => {
          const val = sonuc[c.key];
          if (c.tip === 'plan') {
            return (
              <details key={c.key} style={{ fontSize: '.7rem' }}>
                <summary style={{ cursor: 'pointer', color: kategoriRenk.renk, fontWeight: 600 }}>
                  Planı göster ({Array.isArray(val) ? val.length : 0} ay)
                </summary>
                <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 6 }}>
                  <table style={{ width: '100%', fontSize: '.65rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)' }}>
                      <tr><th style={{ padding: 3 }}>Ay</th><th>Taksit</th><th>Ana</th><th>Faiz</th><th>Kalan</th></tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(val) ? val : []).slice(0, 60).map(p => (
                        <tr key={p.ay}>
                          <td style={{ padding: 2 }}>{p.ay}</td>
                          <td style={{ padding: 2 }}>{formatPara(p.taksit)}</td>
                          <td style={{ padding: 2 }}>{formatPara(p.ana)}</td>
                          <td style={{ padding: 2 }}>{formatPara(p.faiz)}</td>
                          <td style={{ padding: 2 }}>{formatPara(p.kalan)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          }
          return (
            <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', alignItems: 'baseline' }}>
              <span style={{ fontSize: '.7rem', color: 'var(--muted)' }}>{c.label}:</span>
              <b style={{
                fontSize: c.vurgu ? '1.1rem' : '.82rem',
                color: c.vurgu ? kategoriRenk.renk : 'var(--text)',
                fontWeight: c.vurgu ? 700 : 500,
              }}>
                {formatSonuc(val, c.key)}
              </b>
            </div>
          );
        })}
      </div>

      {/* Aksiyonlar */}
      <div style={{ display: 'flex', gap: 4, marginTop: 'auto' }}>
        <button className="btn btn-sm btn-ghost" onClick={kopyala} title="Kopyala">📋</button>
        <button className="btn btn-sm btn-ghost" onClick={gecmisKaydet} title="Kaydet">💾</button>
      </div>
    </div>
  );
}

/* ════════════ Ana sayfa ════════════ */

export default function HesapMakineleri() {
  const [secilenKategori, setSecilenKategori] = useState('tumu');
  const [arama, setArama] = useState('');

  const filtreli = useMemo(() => {
    let l = MAKINELER;
    if (secilenKategori !== 'tumu') l = l.filter(m => m.kategori === secilenKategori);
    if (arama) {
      const q = arama.toLowerCase();
      l = l.filter(m =>
        m.ad.toLowerCase().includes(q) ||
        (m.aciklama || '').toLowerCase().includes(q)
      );
    }
    return l;
  }, [secilenKategori, arama]);

  const sayilar = useMemo(() => {
    const s = { tumu: MAKINELER.length };
    for (const k of Object.keys(KATEGORILER)) {
      s[k] = MAKINELER.filter(m => m.kategori === k).length;
    }
    return s;
  }, []);

  return (
    <div>
      <Topbar title="🧮 Profesyonel Hesap Makineleri" />
      <div className="page" style={{ paddingBottom: 100 }}>
        {/* Üst başlık + arama */}
        <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>
              {MAKINELER.length} Profesyonel Hesap Makinesi
            </div>
            <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>Offline · Kuruş integer · 2026 standartları</div>
          </div>
          <input
            className="input"
            placeholder="🔍 Makine ara..."
            value={arama}
            onChange={e => setArama(e.target.value)}
            style={{ marginLeft: 'auto', maxWidth: 280 }}
          />
        </div>

        {/* Kategori sekmeleri */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto',
          paddingBottom: 4,
        }}>
          <button
            onClick={() => setSecilenKategori('tumu')}
            className={`btn btn-sm ${secilenKategori === 'tumu' ? 'btn-gold' : 'btn-ghost'}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            TÜMÜ ({sayilar.tumu})
          </button>
          {Object.entries(KATEGORILER).map(([id, k]) => (
            <button
              key={id}
              onClick={() => setSecilenKategori(id)}
              className={`btn btn-sm ${secilenKategori === id ? 'btn-gold' : 'btn-ghost'}`}
              style={{ whiteSpace: 'nowrap' }}
            >
              {k.ikon} {k.ad.split(' ')[0].toUpperCase()} ({sayilar[id]})
            </button>
          ))}
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 14,
        }}>
          {filtreli.map(m => <CalculatorCard key={m.id} makine={m} />)}
        </div>

        {filtreli.length === 0 && (
          <div className="empty">
            <div className="empty-ico">🧮</div>
            <div className="empty-title">Sonuç bulunamadı</div>
          </div>
        )}
      </div>
    </div>
  );
}

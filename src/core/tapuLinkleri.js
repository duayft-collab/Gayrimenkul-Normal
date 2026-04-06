/**
 * @file core/tapuLinkleri.js
 * @description Tapu toplama link yönetimi — token üretim, doğrulama, kullanım sayacı
 * @anayasa K02 public token · K06 soft delete · K11 workspace
 */
import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs, query, where,
  serverTimestamp, increment
} from 'firebase/firestore';
import { db } from './firebase';

const COL = 'tapuToplamaLinkleri';

function yeniToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return 'tpl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/**
 * Yeni link oluştur
 */
export async function linkOlustur({
  workspaceId, olusturan,
  tip = 'tek_kullanim',
  aliciEmail = '',
  aliciAd = '',
  mesaj = '',
  sureGun = 7,
  maxKullanim = null,
}) {
  const token = yeniToken();
  const sonKullanim = new Date(Date.now() + sureGun * 24 * 60 * 60 * 1000);

  const ref = await addDoc(collection(db, COL), {
    workspaceId,
    token,
    tip,
    olusturan: {
      uid: olusturan?.uid || null,
      email: olusturan?.email || null,
      adSoyad: olusturan?.name || olusturan?.adSoyad || 'bilinmiyor',
    },
    aliciEmail: (aliciEmail || '').toLowerCase().trim(),
    aliciAd: aliciAd || '',
    mesaj: mesaj || '',
    sonKullanimTarihi: sonKullanim,
    aktif: true,
    kullanilanSayi: 0,
    maxKullanim: tip === 'tek_kullanim' ? 1 : (maxKullanim || null),
    olusturulma: serverTimestamp(),
    isDeleted: false,
  });

  return { id: ref.id, token, sonKullanim };
}

/**
 * Public — token geçerli mi?
 * { valid: true, link } veya { valid: false, reason }
 */
export async function linkKontrol(token) {
  if (!token) return { valid: false, reason: 'Token yok' };
  try {
    const q = query(
      collection(db, COL),
      where('token', '==', token),
      where('aktif', '==', true),
    );
    const snap = await getDocs(q);
    if (snap.empty) return { valid: false, reason: 'Link bulunamadı veya iptal edildi' };
    const link = { id: snap.docs[0].id, ...snap.docs[0].data() };
    if (link.isDeleted) return { valid: false, reason: 'Link silinmiş' };
    // Süre kontrolü
    if (link.sonKullanimTarihi) {
      const bitis = link.sonKullanimTarihi.toDate
        ? link.sonKullanimTarihi.toDate()
        : new Date(link.sonKullanimTarihi);
      if (bitis.getTime() < Date.now()) {
        return { valid: false, reason: 'Linkin süresi dolmuş' };
      }
    }
    // Kullanım limiti
    if (link.maxKullanim && link.kullanilanSayi >= link.maxKullanim) {
      return { valid: false, reason: 'Link kullanım limitine ulaştı' };
    }
    return { valid: true, link };
  } catch (e) {
    console.error('[linkKontrol]', e);
    return { valid: false, reason: 'Link doğrulanamadı: ' + e.message };
  }
}

/**
 * Link kullanıldı işaretle — sayaç artır, tek_kullanim ise pasif
 */
export async function linkKullanildiIsaretle(linkId, tip) {
  try {
    const updates = {
      kullanilanSayi: increment(1),
      sonKullanimZaman: serverTimestamp(),
    };
    if (tip === 'tek_kullanim') {
      updates.aktif = false;
    }
    await updateDoc(doc(db, COL, linkId), updates);
  } catch (e) {
    console.warn('[linkKullanildiIsaretle]', e.message);
  }
}

/**
 * Workspace içindeki tüm linkleri listele
 */
export async function linkleriListele(workspaceId) {
  try {
    const q = query(
      collection(db, COL),
      where('workspaceId', '==', workspaceId),
      where('isDeleted', '==', false),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.olusturulma?.seconds || 0) - (a.olusturulma?.seconds || 0));
  } catch (e) {
    console.error('[linkleriListele]', e);
    return [];
  }
}

/**
 * Link iptal
 */
export async function linkIptalEt(linkId, user) {
  try {
    await updateDoc(doc(db, COL, linkId), {
      aktif: false,
      iptalZaman: serverTimestamp(),
      iptalEden: user?.name || 'bilinmiyor',
    });
  } catch (e) {
    throw new Error('İptal edilemedi: ' + e.message);
  }
}

/**
 * Tam public URL üret
 */
export function linkPublicUrl(token) {
  const base = window.location.origin + window.location.pathname;
  // Hash tabanlı — login'i bypass'lar
  return `${base}#/tapu-form/${token}`;
}

/**
 * QR kod görsel URL (qrserver.com public API, key yok)
 */
export function qrKodUrl(publicUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(publicUrl)}`;
}

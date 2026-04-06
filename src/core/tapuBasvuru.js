/**
 * @file core/tapuBasvuru.js
 * @description Tapu başvurusu CRUD + dosya upload + mülke dönüştürme
 * @anayasa K06 soft delete · K11 workspace · K14 log
 */
import {
  collection, doc, addDoc, updateDoc, getDocs, query, where,
  serverTimestamp
} from 'firebase/firestore';
import { ref as sref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { logKaydet } from './auditLog';

const COL = 'tapuBasvurulari';

/** TP-YYYYMMDD-XXXX referans numarası üret */
export function referansNoUret() {
  const d = new Date();
  const yil = d.getFullYear();
  const ay = String(d.getMonth() + 1).padStart(2, '0');
  const gun = String(d.getDate()).padStart(2, '0');
  const rastgele = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
  return `TP-${yil}${ay}${gun}-${rastgele}`;
}

/** Public — token altına dosya yükle, URL listesi döndür */
export async function tapuDosyalariYukle(workspaceId, token, files) {
  const MAX_BOYUT = 10 * 1024 * 1024;
  const IZINLI = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const sonuc = [];
  for (const f of files || []) {
    if (!f) continue;
    if (f.size > MAX_BOYUT) throw new Error(`${f.name}: 10 MB üstü`);
    if (!IZINLI.includes(f.type)) throw new Error(`${f.name}: izinli tip değil`);
    const temizAd = f.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const yol = `tapu-basvurulari/${workspaceId}/${token}/${Date.now()}_${temizAd}`;
    const r = sref(storage, yol);
    const snap = await uploadBytes(r, f, { customMetadata: { orijinalAd: f.name } });
    const url = await getDownloadURL(snap.ref);
    sonuc.push({
      url,
      ad: f.name,
      boyut: f.size,
      tip: f.type,
      yol,
    });
  }
  return sonuc;
}

/** Public — formdan başvuru kaydet */
export async function basvuruKaydet({ link, formData, dosyalar }) {
  const referansNo = referansNoUret();
  const payload = {
    workspaceId: link.workspaceId,
    linkId: link.id,
    token: link.token,
    referansNo,
    yukleyenAd: formData.yukleyenAd || '',
    yukleyenTelefon: formData.yukleyenTelefon || '',
    yukleyenEmail: (formData.yukleyenEmail || '').toLowerCase().trim(),
    tapuTuru: formData.tapuTuru || 'diger',
    il: formData.il || '',
    ilce: formData.ilce || '',
    mahalle: formData.mahalle || '',
    ada: formData.ada || '',
    parsel: formData.parsel || '',
    acikAdres: formData.acikAdres || '',
    tapuTarihi: formData.tapuTarihi || null,
    tapuNo: formData.tapuNo || '',
    yuzOlcumM2: Number(formData.yuzOlcumM2) || 0,
    hisseOrani: formData.hisseOrani || '',
    cins: formData.cins || '',
    dosyalar: dosyalar || [],
    notlar: formData.notlar || '',
    durum: 'alindi',
    olusturulma: serverTimestamp(),
    inceleyen: null,
    isDeleted: false,
  };
  const ref = await addDoc(collection(db, COL), payload);
  return { id: ref.id, referansNo, ...payload };
}

/** Admin — başvuruları listele */
export async function basvuruListele(workspaceId, filtre = {}) {
  try {
    const q = query(
      collection(db, COL),
      where('workspaceId', '==', workspaceId),
      where('isDeleted', '==', false),
    );
    const snap = await getDocs(q);
    let liste = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (filtre.durum) liste = liste.filter(b => b.durum === filtre.durum);
    return liste.sort((a, b) => (b.olusturulma?.seconds || 0) - (a.olusturulma?.seconds || 0));
  } catch (e) {
    console.error('[basvuruListele]', e);
    return [];
  }
}

/** Başvuru durumunu güncelle */
export async function basvuruGuncelle(workspaceId, user, id, yeniDurum, not = null) {
  try {
    await updateDoc(doc(db, COL, id), {
      durum: yeniDurum,
      inceleyen: {
        uid: user?.uid || null,
        email: user?.email || null,
        adSoyad: user?.name || 'bilinmiyor',
      },
      incelemeZaman: serverTimestamp(),
      incelemeNot: not,
    });
    logKaydet({
      workspaceId, user,
      tip: 'update',
      entityTip: 'tapu_basvuru',
      entityId: id,
      entityAd: 'Başvuru durum',
      yeniDeger: { durum: yeniDurum },
    });
  } catch (e) {
    throw new Error('Güncellenemedi: ' + e.message);
  }
}

/** Başvuruyu soft delete */
export async function basvuruSil(workspaceId, user, id) {
  try {
    await updateDoc(doc(db, COL, id), {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: user?.name || 'bilinmiyor',
    });
    logKaydet({ workspaceId, user, tip: 'delete', entityTip: 'tapu_basvuru', entityId: id });
  } catch (e) {
    throw new Error('Silinemedi: ' + e.message);
  }
}

/**
 * Başvuruyu mülke dönüştür — mulkler collection'a ekle
 * Dosya URL'leri medya galerisine kopyalanmaz (referans kalır),
 * başvuru status 'onaylandi' yapılır.
 */
export async function basvurudanMulkOlustur(workspaceId, user, basvuru) {
  try {
    const mulkPayload = {
      workspaceId,
      ad: `${basvuru.tapuTuru || 'Taşınmaz'} · ${basvuru.il || ''} ${basvuru.ilce || ''}`.trim(),
      tur: basvuru.tapuTuru || 'diger',
      durum: 'sahip',
      il: basvuru.il || '',
      ilce: basvuru.ilce || '',
      mahalle: basvuru.mahalle || '',
      ada: basvuru.ada || '',
      parsel: basvuru.parsel || '',
      fullAdres: basvuru.acikAdres || '',
      alan: Number(basvuru.yuzOlcumM2) || 0,
      fiyat: 0,
      aylikKira: 0,
      notlar: `Tapu başvurusundan aktarıldı · Ref: ${basvuru.referansNo}\n${basvuru.notlar || ''}`,
      kaynakTapuBasvuru: basvuru.id,
      kaynakReferans: basvuru.referansNo,
      kaynakDosyalar: basvuru.dosyalar || [],
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, 'mulkler'), mulkPayload);

    // Başvuru durumunu güncelle
    await updateDoc(doc(db, COL, basvuru.id), {
      durum: 'onaylandi',
      mulkeDonusturuldu: true,
      mulkId: ref.id,
      inceleyen: {
        uid: user?.uid || null,
        email: user?.email || null,
        adSoyad: user?.name || 'bilinmiyor',
      },
      incelemeZaman: serverTimestamp(),
    });

    logKaydet({
      workspaceId, user,
      tip: 'create',
      entityTip: 'mulk',
      entityId: ref.id,
      entityAd: mulkPayload.ad,
      notlar: `Tapu başvurusundan oluşturuldu: ${basvuru.referansNo}`,
    });

    return { mulkId: ref.id, basvuruId: basvuru.id };
  } catch (e) {
    console.error('[basvurudanMulkOlustur]', e);
    throw new Error('Mülke dönüştürülemedi: ' + e.message);
  }
}

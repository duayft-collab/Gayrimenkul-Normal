/**
 * @file core/marketGecmis.js
 * @description Piyasa verisi günlük snapshot + sorgulama
 * @anayasa K11 workspace · K02 sadece kamu fiyat verisi
 *
 * Firestore: piyasaGecmisi
 * { tarih:'YYYY-MM-DD', workspaceId, usd, eur, altinGram, gumusGram, btc, bist100, sentetik, olusturulma }
 * İdempotent: günde 1 yazım (localStorage guard)
 */
import {
  collection, addDoc, query, where, getDocs, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const COL = 'piyasaGecmisi';

function bugunStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Günde 1 snapshot — idempotent */
export async function gunlukSnapshotKaydet(marketState, workspaceId) {
  if (!workspaceId) return;
  if (!marketState?.usd && !marketState?.altinGram) return; // veri yok, skip
  const bugun = bugunStr();
  const guard = `piyasaSnapshot_${workspaceId}_${bugun}`;
  if (localStorage.getItem(guard)) return; // bugün zaten yazıldı

  try {
    await addDoc(collection(db, COL), {
      workspaceId,
      tarih: bugun,
      usd: marketState.usd || null,
      eur: marketState.eur || null,
      gbp: marketState.gbp || null,
      altinGram: marketState.altinGram || null,
      altinCeyrek: marketState.altinCeyrek || null,
      gumusGram: marketState.gumusGram || null,
      btc: marketState.btc || null,
      eth: marketState.eth || null,
      bist100: marketState.bist100 || null,
      enflasyon: marketState.enflasyon || null,
      sentetik: false,
      olusturulma: serverTimestamp(),
    });
    localStorage.setItem(guard, '1');
  } catch (e) {
    console.warn('[gunlukSnapshotKaydet]', e.message);
  }
}

/** Dönem içindeki snapshotlar — sıralı */
export async function snapshotlariGetir(workspaceId, bas, bit) {
  try {
    const q = query(
      collection(db, COL),
      where('workspaceId', '==', workspaceId),
    );
    const snap = await getDocs(q);
    let liste = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (bas) {
      const b = typeof bas === 'string' ? bas : bas.toISOString().slice(0, 10);
      liste = liste.filter(s => (s.tarih || '') >= b);
    }
    if (bit) {
      const b = typeof bit === 'string' ? bit : bit.toISOString().slice(0, 10);
      liste = liste.filter(s => (s.tarih || '') <= b);
    }
    return liste.sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''));
  } catch (e) {
    console.error('[snapshotlariGetir]', e.message);
    return [];
  }
}

/** Tarih bazında en yakın snapshot'ı bul */
export function yakinSnapshot(snapshotlar, hedefTarih) {
  if (!snapshotlar?.length) return null;
  const hedef = typeof hedefTarih === 'string' ? hedefTarih : hedefTarih.toISOString().slice(0, 10);
  let enYakin = snapshotlar[0];
  let minFark = Math.abs(new Date(enYakin.tarih) - new Date(hedef));
  for (const s of snapshotlar) {
    const fark = Math.abs(new Date(s.tarih) - new Date(hedef));
    if (fark < minFark) {
      minFark = fark;
      enYakin = s;
    }
  }
  return enYakin;
}

/** Kayıt sayısı — bootstrap kontrolü için */
export async function kayitSayisi(workspaceId) {
  try {
    const q = query(collection(db, COL), where('workspaceId', '==', workspaceId));
    const snap = await getDocs(q);
    return snap.size;
  } catch {
    return 0;
  }
}

/**
 * @file core/emailGonder.js
 * @description E-posta gönderim — Firebase Extension "Trigger Email" üzerinden
 * @anayasa K02 — API KEY/SMTP kimlik bilgileri FRONTEND'DE YOK
 *
 * Nasıl çalışır:
 * - Frontend 'mail' collection'a yazar
 * - Firebase Extension "Trigger Email from Firestore" doküman oluşunca
 *   SMTP üzerinden gönderir (server-side)
 * - Extension kurulmamışsa doküman Firestore'da kalır, console uyarı
 *
 * Kurulum: Firebase Console → Extensions → "Trigger Email from Firestore"
 * Gmail App Password ile yapılandırılabilir (5 dk).
 */
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const MAIL_COL = 'mail';

/**
 * Raw email gönder — mail collection'a yazar, extension tetiklenir
 */
export async function emailGonder({ to, subject, html, text = null, cc = null, bcc = null }) {
  if (!to) {
    console.warn('[emailGonder] alıcı yok, atlandı');
    return null;
  }
  try {
    const payload = {
      to: Array.isArray(to) ? to : [to],
      message: {
        subject: subject || '(konusuz)',
        html: html || '',
      },
      createdAt: serverTimestamp(),
    };
    if (text) payload.message.text = text;
    if (cc) payload.cc = Array.isArray(cc) ? cc : [cc];
    if (bcc) payload.bcc = Array.isArray(bcc) ? bcc : [bcc];

    const ref = await addDoc(collection(db, MAIL_COL), payload);
    console.info('[emailGonder] mail collection\'a yazıldı:', ref.id);
    console.info('⚠ Firebase Extension "Trigger Email from Firestore" kurulmamışsa e-posta gönderilmez. Mail collection\'da bekler.');
    return ref.id;
  } catch (e) {
    console.error('[emailGonder]', e);
    return null;
  }
}

/* ══════════ HTML Template'ler ══════════ */

const TEMEL_STIL = `
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; background: #f4f4f7; }
  .wrap { max-width: 600px; margin: 20px auto; padding: 0; }
  .kart { background: #0B0B0F; color: #fff; padding: 32px; border-radius: 12px; }
  .header { border-bottom: 2px solid #C9A84C; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { color: #C9A84C; margin: 0; font-size: 24px; }
  .header p { color: #888; margin: 4px 0 0; font-size: 12px; }
  h2 { color: #fff; font-size: 20px; }
  p { color: #ccc; line-height: 1.6; }
  .info { background: #1a1a20; padding: 16px; border-radius: 8px; border-left: 3px solid #C9A84C; margin: 16px 0; }
  .info b { color: #C9A84C; }
  .foot { color: #666; font-size: 11px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #2a2a30; text-align: center; }
  .btn { display: inline-block; background: #C9A84C; color: #0B0B0F; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; margin-top: 12px; }
`;

const esc = (s) => String(s || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

/**
 * Yükleyen kişiye onay e-postası
 */
export function yukleyenOnayHtml({ yukleyenAd, referansNo, tapuTuru, il, ilce, mahalle, ada, parsel, tarih }) {
  return `
<!doctype html><html><head><meta charset="utf-8"><style>${TEMEL_STIL}</style></head><body>
<div class="wrap">
  <div class="kart">
    <div class="header">
      <h1>🏛️ Gayrimenkul Pro</h1>
      <p>Duay Global Trade · AI Property OS</p>
    </div>
    <h2>✅ Tapu bilgileriniz alındı</h2>
    <p>Sayın <b style="color:#fff">${esc(yukleyenAd)}</b>,</p>
    <p>Gönderdiğiniz tapu bilgileri sistemimize başarıyla kaydedildi. Ekibimiz incelemeye alacak ve gerektiğinde sizinle iletişime geçecektir.</p>
    <div class="info">
      <div><b>Referans No:</b> ${esc(referansNo)}</div>
      <div><b>Tapu Türü:</b> ${esc(tapuTuru)}</div>
      <div><b>Konum:</b> ${esc(il)} / ${esc(ilce)}${mahalle ? ' / ' + esc(mahalle) : ''}</div>
      ${ada || parsel ? `<div><b>Ada/Parsel:</b> ${esc(ada)} / ${esc(parsel)}</div>` : ''}
      ${tarih ? `<div><b>Tapu Tarihi:</b> ${esc(tarih)}</div>` : ''}
    </div>
    <p style="color:#888;font-size:12px">Bu referans numarasını saklayın, ileride iletişim için kullanabilirsiniz.</p>
    <div class="foot">
      Bu otomatik e-postadır. Sorularınız için bize ulaşabilirsiniz.<br>
      © ${new Date().getFullYear()} Duay Global Trade Company
    </div>
  </div>
</div>
</body></html>
  `;
}

/**
 * Admin bildirim e-postası
 */
export function adminBildirimHtml({ yukleyenAd, yukleyenEmail, yukleyenTel, referansNo, tapuTuru, il, ilce, mahalle, ada, parsel, yuzOlcumM2, notlar, dosyaSayisi }) {
  return `
<!doctype html><html><head><meta charset="utf-8"><style>${TEMEL_STIL}</style></head><body>
<div class="wrap">
  <div class="kart">
    <div class="header">
      <h1>📎 Yeni Tapu Başvurusu</h1>
      <p>Gayrimenkul Pro · Admin Bildirim</p>
    </div>
    <h2>${esc(yukleyenAd)} tapu bilgilerini gönderdi</h2>
    <div class="info">
      <div><b>Referans No:</b> ${esc(referansNo)}</div>
      <div><b>Yükleyen:</b> ${esc(yukleyenAd)}</div>
      <div><b>E-posta:</b> ${esc(yukleyenEmail)}</div>
      ${yukleyenTel ? `<div><b>Telefon:</b> ${esc(yukleyenTel)}</div>` : ''}
    </div>
    <div class="info">
      <div><b>Tapu Türü:</b> ${esc(tapuTuru)}</div>
      <div><b>Konum:</b> ${esc(il)} / ${esc(ilce)}${mahalle ? ' / ' + esc(mahalle) : ''}</div>
      ${ada || parsel ? `<div><b>Ada/Parsel:</b> ${esc(ada)} / ${esc(parsel)}</div>` : ''}
      ${yuzOlcumM2 ? `<div><b>Yüzölçümü:</b> ${esc(yuzOlcumM2)} m²</div>` : ''}
      <div><b>Eklenen Dosya:</b> ${dosyaSayisi || 0} adet</div>
    </div>
    ${notlar ? `<div class="info"><div><b>Notlar:</b></div><div style="color:#ccc;margin-top:6px">${esc(notlar)}</div></div>` : ''}
    <p style="color:#888;font-size:12px">Admin panelinden "Tapu Toplama" sayfasından detaya erişebilir, mülke dönüştürebilirsiniz.</p>
    <div class="foot">
      © ${new Date().getFullYear()} Duay Global Trade Company
    </div>
  </div>
</div>
</body></html>
  `;
}

/**
 * @file components/TapuLinkOlustur.jsx
 * @description Yeni tapu toplama linki oluşturma modalı — sonuç ekranıyla birlikte
 */
import { useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { linkOlustur, linkPublicUrl, qrKodUrl } from '../core/tapuLinkleri';
import { emailGonder } from '../core/emailGonder';

export default function TapuLinkOlustur({ onClose, onCreated }) {
  const { user } = useAuthStore();
  const { toast } = useStore();
  const ws = user?.workspaceId || 'ws_001';

  const [tip, setTip] = useState('tek_kullanim');
  const [aliciEmail, setAliciEmail] = useState('');
  const [aliciAd, setAliciAd] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [sureGun, setSureGun] = useState(7);
  const [ozelSure, setOzelSure] = useState('');
  const [calisiyor, setCalisiyor] = useState(false);
  const [sonuc, setSonuc] = useState(null);

  const olustur = async () => {
    setCalisiyor(true);
    try {
      const sure = sureGun === 'ozel' ? parseInt(ozelSure) || 7 : sureGun;
      const r = await linkOlustur({
        workspaceId: ws,
        olusturan: user,
        tip, aliciEmail, aliciAd, mesaj,
        sureGun: sure,
      });
      const url = linkPublicUrl(r.token);
      setSonuc({ ...r, url, qr: qrKodUrl(url) });

      // Davet e-postası (opsiyonel)
      if (aliciEmail) {
        try {
          await emailGonder({
            to: aliciEmail,
            subject: 'Tapu bilgilerinizi göndermek için güvenli bağlantı',
            html: `
              <div style="font-family:system-ui;max-width:560px;margin:20px auto;background:#0B0B0F;color:#fff;padding:28px;border-radius:12px">
                <h2 style="color:#C9A84C;border-bottom:2px solid #C9A84C;padding-bottom:10px">🏛️ Gayrimenkul Pro</h2>
                <p>Sayın ${aliciAd || ''},</p>
                <p>Tapu bilgilerinizi güvenli şekilde göndermek için aşağıdaki bağlantıyı kullanabilirsiniz:</p>
                ${mesaj ? `<div style="background:#1a1a20;padding:14px;border-left:3px solid #C9A84C;border-radius:6px;margin:14px 0">${mesaj}</div>` : ''}
                <p style="margin-top:20px"><a href="${url}" style="display:inline-block;background:#C9A84C;color:#0B0B0F;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700">🔗 Güvenli Formu Aç</a></p>
                <p style="font-size:11px;color:#888;margin-top:14px">Bu bağlantı ${sure} gün geçerlidir. Bilgileriniz şifreli olarak iletilir.</p>
              </div>
            `,
          });
        } catch (e) {
          console.warn('[davet email]', e.message);
        }
      }

      toast('success', 'Link oluşturuldu');
      onCreated?.();
    } catch (e) {
      toast('error', e.message);
    } finally {
      setCalisiyor(false);
    }
  };

  const kopyala = () => {
    if (!sonuc?.url) return;
    navigator.clipboard.writeText(sonuc.url).then(() => toast('success', 'Link kopyalandı'));
  };

  const whatsapp = () => {
    const metin = `Tapu bilgilerinizi göndermek için: ${sonuc.url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(metin)}`, '_blank');
  };

  const epostaAc = () => {
    const konu = 'Tapu Bilgileri Gönderme Bağlantısı';
    const govde = `Merhaba${aliciAd ? ' ' + aliciAd : ''},\n\nTapu bilgilerinizi göndermek için aşağıdaki güvenli bağlantıyı kullanabilirsiniz:\n\n${sonuc.url}\n\nTeşekkürler.`;
    window.location.href = `mailto:${aliciEmail || ''}?subject=${encodeURIComponent(konu)}&body=${encodeURIComponent(govde)}`;
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-head">
          <div className="modal-title">{sonuc ? '✅ Link Hazır' : '+ Yeni Tapu Toplama Linki'}</div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>×</button>
        </div>

        {!sonuc ? (
          <>
            <div className="modal-body">
              <div className="fgroup">
                <label className="flbl">Link Tipi</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className={`btn btn-sm ${tip === 'tek_kullanim' ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setTip('tek_kullanim')}>
                    🔒 Tek Kullanımlık
                  </button>
                  <button className={`btn btn-sm ${tip === 'cok_kullanim' ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setTip('cok_kullanim')}>
                    🔁 Çok Kullanımlık
                  </button>
                </div>
                <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 4 }}>
                  {tip === 'tek_kullanim'
                    ? 'Bir kez kullanıldıktan sonra otomatik pasif olur'
                    : 'Birden fazla başvuru kabul eder'}
                </div>
              </div>

              <div className="fgrid2">
                <div className="fgroup">
                  <label className="flbl">Alıcı Adı (opsiyonel)</label>
                  <input className="input" value={aliciAd} onChange={e => setAliciAd(e.target.value)} placeholder="Örn: Ahmet Yılmaz" />
                </div>
                <div className="fgroup">
                  <label className="flbl">Alıcı E-postası (opsiyonel)</label>
                  <input type="email" className="input" value={aliciEmail} onChange={e => setAliciEmail(e.target.value)} placeholder="ornek@domain.com" />
                </div>
              </div>

              <div className="fgroup">
                <label className="flbl">Mesaj (opsiyonel — formda görünür)</label>
                <textarea className="textarea" rows={3} value={mesaj} onChange={e => setMesaj(e.target.value)} placeholder="Örn: Ataşehir arsa için tapu bilgilerinizi buraya yükleyiniz..." />
              </div>

              <div className="fgroup">
                <label className="flbl">Geçerlilik Süresi</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[[1, '1 gün'], [7, '7 gün'], [14, '14 gün'], [30, '30 gün'], ['ozel', 'Özel']].map(([v, lbl]) => (
                    <button key={v} className={`btn btn-sm ${sureGun === v ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setSureGun(v)}>{lbl}</button>
                  ))}
                </div>
                {sureGun === 'ozel' && (
                  <input
                    type="number" className="input" style={{ marginTop: 6, width: 120 }}
                    placeholder="Gün" value={ozelSure} onChange={e => setOzelSure(e.target.value)}
                  />
                )}
              </div>

              <div style={{ padding: 10, background: 'rgba(201,168,76,.08)', borderLeft: '3px solid var(--gold)', borderRadius: 6, fontSize: '.72rem', color: 'var(--muted)' }}>
                ℹ️ Alıcı e-postası girerseniz otomatik davet maili gönderilir (Firebase Trigger Email extension aktifse).
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={onClose}>Vazgeç</button>
              <button className="btn btn-gold" onClick={olustur} disabled={calisiyor}>
                {calisiyor ? 'Oluşturuluyor...' : '🔗 Link Oluştur'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, marginBottom: 14 }}>
                <img src={sonuc.qr} alt="QR kod" style={{ width: '100%', borderRadius: 8, background: '#fff' }} />
                <div>
                  <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 4 }}>Link:</div>
                  <div style={{
                    fontFamily: 'monospace', fontSize: '.72rem', padding: 10,
                    background: 'var(--surface2)', borderRadius: 6, wordBreak: 'break-all',
                    marginBottom: 10,
                  }}>{sonuc.url}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
                    <div>Süre: <b>{sonuc.sonKullanim?.toLocaleDateString('tr-TR')}</b></div>
                    <div>Token: <code style={{ fontSize: '.65rem' }}>{sonuc.token?.slice(0, 12)}...</code></div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn btn-gold" onClick={kopyala}>📋 Kopyala</button>
                <button className="btn btn-primary" onClick={whatsapp}>💬 WhatsApp</button>
                <button className="btn btn-ghost" onClick={epostaAc}>📧 E-posta</button>
              </div>

              <div style={{ marginTop: 14, padding: 10, background: 'rgba(34,197,94,.08)', borderLeft: '3px solid var(--green)', borderRadius: 6, fontSize: '.72rem' }}>
                ✅ Link oluşturuldu. Aşağıdaki yöntemlerden birini seçerek gönderebilirsin.
                {aliciEmail && ' Davet e-postası da gönderildi (extension aktifse).'}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-gold" onClick={onClose}>Tamam</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

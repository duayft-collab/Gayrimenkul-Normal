/**
 * @file pages/TapuToplamaForm.jsx
 * @description Public tapu toplama formu — hash route ile login'sız erişim
 * @anayasa K02 — auth yok, token ile yetki
 */
import { useEffect, useRef, useState } from 'react';
import { linkKontrol, linkKullanildiIsaretle } from '../core/tapuLinkleri';
import { tapuDosyalariYukle, basvuruKaydet } from '../core/tapuBasvuru';
import { emailGonder, yukleyenOnayHtml, adminBildirimHtml } from '../core/emailGonder';
import IlIlceSecici from '../components/IlIlceSecici';

const TAPU_TURLERI = [
  { v: 'arsa',    l: '🌾 Arsa' },
  { v: 'tarla',   l: '🌱 Tarla' },
  { v: 'ev',      l: '🏠 Ev/Daire' },
  { v: 'isyeri',  l: '🏢 İşyeri' },
  { v: 'diger',   l: '📎 Diğer' },
];

export default function TapuToplamaForm({ token }) {
  const [durum, setDurum] = useState('kontrol');
  const [hata, setHata] = useState(null);
  const [link, setLink] = useState(null);
  const [basariliBasvuru, setBasariliBasvuru] = useState(null);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    yukleyenAd: '',
    yukleyenTelefon: '',
    yukleyenEmail: '',
    tapuTuru: 'arsa',
    il: '', ilce: '',
    mahalle: '', ada: '', parsel: '', acikAdres: '',
    tapuTarihi: '', tapuNo: '', yuzOlcumM2: '', hisseOrani: '', cins: '',
    notlar: '',
    onayCheckbox: false,
  });
  const [secilenDosyalar, setSecilenDosyalar] = useState([]);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await linkKontrol(token);
      if (!r.valid) {
        setHata(r.reason);
        setDurum('gecersiz');
      } else {
        setLink(r.link);
        setDurum('form');
      }
    })();
  }, [token]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const dosyaEkle = (fls) => {
    const yeniler = Array.from(fls || []);
    const toplamBoyut = [...secilenDosyalar, ...yeniler].reduce((a, f) => a + f.size, 0);
    if (toplamBoyut > 50 * 1024 * 1024) {
      alert('Toplam dosya boyutu 50 MB aşamaz');
      return;
    }
    setSecilenDosyalar(s => [...s, ...yeniler]);
  };

  const dosyaCikar = (i) => setSecilenDosyalar(s => s.filter((_, idx) => idx !== i));

  const onDrop = (e) => {
    e.preventDefault();
    dosyaEkle(e.dataTransfer.files);
  };

  const gonder = async () => {
    if (!form.yukleyenAd || !form.yukleyenEmail) {
      alert('Ad ve e-posta zorunlu');
      return;
    }
    if (!form.il || !form.ilce) {
      alert('İl ve ilçe seçin');
      return;
    }
    if (!form.onayCheckbox) {
      alert('Lütfen bilgilerin doğruluğunu onaylayın');
      return;
    }

    setGonderiliyor(true);
    try {
      // 1) Dosyaları yükle
      let dosyalar = [];
      if (secilenDosyalar.length > 0) {
        dosyalar = await tapuDosyalariYukle(link.workspaceId, token, secilenDosyalar);
      }

      // 2) Başvuru kaydet
      const basvuru = await basvuruKaydet({ link, formData: form, dosyalar });

      // 3) Link kullanıldı işaretle
      await linkKullanildiIsaretle(link.id, link.tip);

      // 4) Çift taraflı e-posta
      try {
        await emailGonder({
          to: form.yukleyenEmail,
          subject: `Tapu bilgileriniz alındı · ${basvuru.referansNo}`,
          html: yukleyenOnayHtml({
            yukleyenAd: form.yukleyenAd,
            referansNo: basvuru.referansNo,
            tapuTuru: form.tapuTuru,
            il: form.il,
            ilce: form.ilce,
            mahalle: form.mahalle,
            ada: form.ada,
            parsel: form.parsel,
            tarih: form.tapuTarihi,
          }),
        });
        // Admin'e bildirim (link'i oluşturan kullanıcı)
        const adminEmail = link.olusturan?.email;
        if (adminEmail) {
          await emailGonder({
            to: adminEmail,
            subject: `${form.yukleyenAd} tapu bilgilerini gönderdi · ${basvuru.referansNo}`,
            html: adminBildirimHtml({
              yukleyenAd: form.yukleyenAd,
              yukleyenEmail: form.yukleyenEmail,
              yukleyenTel: form.yukleyenTelefon,
              referansNo: basvuru.referansNo,
              tapuTuru: form.tapuTuru,
              il: form.il,
              ilce: form.ilce,
              mahalle: form.mahalle,
              ada: form.ada,
              parsel: form.parsel,
              yuzOlcumM2: form.yuzOlcumM2,
              notlar: form.notlar,
              dosyaSayisi: dosyalar.length,
            }),
          });
        }
      } catch (e) {
        console.warn('[email]', e.message);
      }

      setBasariliBasvuru(basvuru);
      setDurum('basarili');
    } catch (e) {
      alert('Gönderilemedi: ' + e.message);
    } finally {
      setGonderiliyor(false);
    }
  };

  /* ═══ Render ═══ */

  const BG = { minHeight: '100vh', background: '#0B0B0F', color: '#E8ECF4', fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif' };

  if (durum === 'kontrol') {
    return (
      <div style={{ ...BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem' }}>🏛️</div>
          <div style={{ color: '#C9A84C', fontSize: '1.1rem', marginTop: 10 }}>Bağlantı doğrulanıyor...</div>
        </div>
      </div>
    );
  }

  if (durum === 'gecersiz') {
    return (
      <div style={{ ...BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: '3rem' }}>🚫</div>
          <div style={{ fontSize: '1.3rem', color: '#EF4444', margin: '10px 0' }}>Geçersiz Bağlantı</div>
          <div style={{ color: '#888' }}>{hata || 'Link geçerli değil veya süresi dolmuş.'}</div>
          <div style={{ fontSize: '.75rem', color: '#555', marginTop: 20 }}>
            Yeni bir bağlantı için lütfen ilgili kişiyle iletişime geçin.
          </div>
        </div>
      </div>
    );
  }

  if (durum === 'basarili') {
    return (
      <div style={{ ...BG, padding: 20 }}>
        <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: 60, textAlign: 'center' }}>
          <div style={{ fontSize: '4rem' }}>✅</div>
          <div style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: '1.8rem', color: '#C9A84C', margin: '10px 0',
          }}>Gönderildi</div>
          <div style={{ color: '#ccc', fontSize: '1rem' }}>
            Tapu bilgileriniz başarıyla kaydedildi.
          </div>
          <div style={{
            background: '#161a24', border: '1px solid #2a2f3e',
            borderRadius: 10, padding: 20, marginTop: 20, display: 'inline-block',
          }}>
            <div style={{ fontSize: '.72rem', color: '#888', textTransform: 'uppercase' }}>Referans Numarası</div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.3rem', color: '#C9A84C', marginTop: 4, fontWeight: 700 }}>
              {basariliBasvuru?.referansNo}
            </div>
          </div>
          <div style={{ color: '#888', fontSize: '.85rem', marginTop: 16 }}>
            Bu numarayı kaydedin. E-postanıza onay mesajı gönderildi.
          </div>
          <div style={{ color: '#555', fontSize: '.7rem', marginTop: 40 }}>
            Duay Global Trade — AI Property OS
          </div>
        </div>
      </div>
    );
  }

  /* Form */
  return (
    <div style={BG}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 80px' }}>
        {/* Header */}
        <div style={{
          textAlign: 'center', marginBottom: 24,
          borderBottom: '2px solid #C9A84C', paddingBottom: 16,
        }}>
          <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '1.6rem', color: '#C9A84C', fontWeight: 700 }}>
            🏛️ GAYRİMENKUL PRO
          </div>
          <div style={{ color: '#888', fontSize: '.82rem', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            🔒 Güvenli Bağlantı · Duay Global Trade
          </div>
        </div>

        {/* Link bilgisi */}
        <div style={{
          background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.3)',
          borderRadius: 10, padding: 14, marginBottom: 20, fontSize: '.82rem',
        }}>
          <div style={{ color: '#C9A84C', fontWeight: 600, marginBottom: 4 }}>
            {link?.tip === 'tek_kullanim' ? '🔒 Tek Kullanımlık Bağlantı' : '🔁 Çok Kullanımlık Bağlantı'}
          </div>
          {link?.mesaj && <div style={{ color: '#ccc', marginTop: 6 }}>{link.mesaj}</div>}
          {link?.sonKullanimTarihi && (
            <div style={{ color: '#888', fontSize: '.72rem', marginTop: 6 }}>
              Son kullanım: {(link.sonKullanimTarihi.toDate ? link.sonKullanimTarihi.toDate() : new Date(link.sonKullanimTarihi)).toLocaleDateString('tr-TR')}
            </div>
          )}
        </div>

        {/* 1. Yükleyen */}
        <Kart baslik="👤 Kişisel Bilgiler">
          <Input label="Ad Soyad *" value={form.yukleyenAd} onChange={v => set('yukleyenAd', v)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Telefon *" value={form.yukleyenTelefon} onChange={v => set('yukleyenTelefon', v)} type="tel" placeholder="+90 555 ..." />
            <Input label="E-posta *" value={form.yukleyenEmail} onChange={v => set('yukleyenEmail', v)} type="email" />
          </div>
        </Kart>

        {/* 2. Tapu Türü */}
        <Kart baslik="📋 Tapu Türü">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8 }}>
            {TAPU_TURLERI.map(t => (
              <button
                key={t.v}
                onClick={() => set('tapuTuru', t.v)}
                style={{
                  padding: '10px 12px', borderRadius: 8,
                  border: `1px solid ${form.tapuTuru === t.v ? '#C9A84C' : '#2a2f3e'}`,
                  background: form.tapuTuru === t.v ? 'rgba(201,168,76,.12)' : '#161a24',
                  color: form.tapuTuru === t.v ? '#C9A84C' : '#ccc',
                  cursor: 'pointer', fontSize: '.82rem', fontWeight: 600,
                }}
              >{t.l}</button>
            ))}
          </div>
        </Kart>

        {/* 3. Konum */}
        <Kart baslik="📍 Konum">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <IlIlceSecici
              il={form.il}
              ilce={form.ilce}
              onChange={({ il, ilce }) => setForm(f => ({ ...f, il, ilce }))}
              layout="inline"
            />
          </div>
          <Input label="Mahalle" value={form.mahalle} onChange={v => set('mahalle', v)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Ada" value={form.ada} onChange={v => set('ada', v)} />
            <Input label="Parsel" value={form.parsel} onChange={v => set('parsel', v)} />
          </div>
          <Input label="Açık Adres" value={form.acikAdres} onChange={v => set('acikAdres', v)} placeholder="Sokak, kapı no, daire no..." />
        </Kart>

        {/* 4. Tapu Detayları */}
        <Kart baslik="📄 Tapu Detayları">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Tapu Tarihi" value={form.tapuTarihi} onChange={v => set('tapuTarihi', v)} type="date" />
            <Input label="Tapu No" value={form.tapuNo} onChange={v => set('tapuNo', v)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Input label="Yüzölçüm (m²)" value={form.yuzOlcumM2} onChange={v => set('yuzOlcumM2', v)} type="number" />
            <Input label="Hisse Oranı" value={form.hisseOrani} onChange={v => set('hisseOrani', v)} placeholder="1/1" />
            <Input label="Cins" value={form.cins} onChange={v => set('cins', v)} />
          </div>
        </Kart>

        {/* 5. Dosyalar */}
        <Kart baslik="📎 Dosyalar">
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            style={{
              border: '2px dashed rgba(201,168,76,.4)', borderRadius: 10,
              padding: 24, textAlign: 'center', cursor: 'pointer',
              background: 'rgba(201,168,76,.03)',
            }}
          >
            <div style={{ fontSize: '2rem' }}>📁</div>
            <div style={{ color: '#ccc', fontSize: '.85rem', marginTop: 4 }}>
              Dosyaları buraya sürükleyin veya <b style={{ color: '#C9A84C' }}>tıklayın</b>
            </div>
            <div style={{ color: '#666', fontSize: '.68rem', marginTop: 4 }}>
              jpg, png, webp, pdf · Maks 10 MB · Toplam 50 MB
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            style={{ display: 'none' }}
            onChange={e => dosyaEkle(e.target.files)}
          />
          {secilenDosyalar.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {secilenDosyalar.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', background: '#161a24', borderRadius: 6,
                  marginBottom: 4, fontSize: '.78rem',
                }}>
                  <span>{f.type.includes('pdf') ? '📄' : '🖼️'}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span style={{ color: '#888', fontSize: '.68rem' }}>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                  <button onClick={() => dosyaCikar(i)} style={{ background: 'transparent', border: 0, color: '#EF4444', cursor: 'pointer' }}>×</button>
                </div>
              ))}
            </div>
          )}
        </Kart>

        {/* 6. Notlar */}
        <Kart baslik="📝 Notlar (Opsiyonel)">
          <textarea
            rows={4}
            value={form.notlar}
            onChange={e => set('notlar', e.target.value)}
            placeholder="Eklemek istediğiniz detaylar..."
            style={{
              width: '100%', background: '#0A0F1E', color: '#fff',
              border: '1px solid #2a2f3e', borderRadius: 6,
              padding: 12, fontSize: '.88rem', fontFamily: 'inherit',
            }}
          />
        </Kart>

        {/* Onay checkbox */}
        <label style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          padding: 14, background: 'rgba(201,168,76,.05)',
          borderRadius: 8, cursor: 'pointer', fontSize: '.85rem',
        }}>
          <input
            type="checkbox"
            checked={form.onayCheckbox}
            onChange={e => set('onayCheckbox', e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span>Gönderdiğim tüm bilgilerin <b style={{ color: '#C9A84C' }}>doğru ve eksiksiz</b> olduğunu onaylıyorum. Bilgilerimin Gayrimenkul Pro sistemine kaydedilmesine izin veriyorum.</span>
        </label>

        {/* Gönder */}
        <button
          onClick={gonder}
          disabled={gonderiliyor}
          style={{
            width: '100%', marginTop: 16, padding: '16px 20px',
            background: 'linear-gradient(135deg,#E8C96A,#C9A84C)',
            color: '#0B0B0F', border: 0, borderRadius: 10,
            fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
            opacity: gonderiliyor ? 0.6 : 1,
          }}
        >
          {gonderiliyor ? '⏳ Gönderiliyor...' : '📤 GÖNDER'}
        </button>

        <div style={{ textAlign: 'center', color: '#555', fontSize: '.68rem', marginTop: 20 }}>
          Bilgileriniz şifrelenerek güvenli şekilde iletilir · 🔒 TLS 1.3
        </div>
      </div>
    </div>
  );
}

/* ═══ Mini alt bileşenler (sadece bu dosya için) ═══ */

function Kart({ baslik, children }) {
  return (
    <div style={{
      background: '#161a24', border: '1px solid #2a2f3e',
      borderRadius: 12, padding: 18, marginBottom: 14,
    }}>
      <div style={{
        fontFamily: 'Playfair Display, Georgia, serif',
        fontSize: '1rem', color: '#C9A84C', marginBottom: 12,
        fontWeight: 600,
      }}>{baslik}</div>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: '.7rem', color: '#888', display: 'block', marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', background: '#0A0F1E', color: '#fff',
          border: '1px solid #2a2f3e', borderRadius: 6,
          padding: '10px 12px', fontSize: '.88rem',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

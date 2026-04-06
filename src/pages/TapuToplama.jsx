/**
 * @file pages/TapuToplama.jsx
 * @description Admin — Link yönetimi + gelen başvurular + istatistikler
 */
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { Topbar } from '../components/Layout';
import {
  linkleriListele, linkIptalEt, linkPublicUrl, qrKodUrl
} from '../core/tapuLinkleri';
import {
  basvuruListele, basvuruGuncelle, basvuruSil, basvurudanMulkOlustur
} from '../core/tapuBasvuru';
import TapuLinkOlustur from '../components/TapuLinkOlustur';

const DURUM_RENK = {
  alindi:     { bg: 'rgba(59,130,246,.12)', fg: '#3B82F6', ad: 'Alındı' },
  incelendi:  { bg: 'rgba(245,158,11,.12)', fg: '#F59E0B', ad: 'İncelendi' },
  onaylandi:  { bg: 'rgba(34,197,94,.12)',  fg: '#22C55E', ad: 'Onaylandı' },
  reddedildi: { bg: 'rgba(239,68,68,.12)',  fg: '#EF4444', ad: 'Reddedildi' },
};

function zamanFormat(ts) {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return isNaN(d) ? '—' : d.toLocaleString('tr-TR');
}

function tarihFormat(ts) {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return isNaN(d) ? '—' : d.toLocaleDateString('tr-TR');
}

export default function TapuToplama() {
  const { user } = useAuthStore();
  const { toast } = useStore();
  const ws = user?.workspaceId;

  const [tab, setTab] = useState('linkler');
  const [linkler, setLinkler] = useState([]);
  const [basvurular, setBasvurular] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [linkModal, setLinkModal] = useState(false);
  const [detayBasvuru, setDetayBasvuru] = useState(null);
  const [onizleme, setOnizleme] = useState(null);

  const yukle = async () => {
    if (!ws) return;
    setYukleniyor(true);
    const [l, b] = await Promise.all([
      linkleriListele(ws),
      basvuruListele(ws),
    ]);
    setLinkler(l);
    setBasvurular(b);
    setYukleniyor(false);
  };

  useEffect(() => { yukle(); }, [ws]);

  const istatistikler = useMemo(() => {
    const buAy = basvurular.filter(b => {
      const d = b.olusturulma?.toDate ? b.olusturulma.toDate() : null;
      if (!d) return false;
      const simdi = new Date();
      return d.getFullYear() === simdi.getFullYear() && d.getMonth() === simdi.getMonth();
    });
    const onaylanan = basvurular.filter(b => b.durum === 'onaylandi');
    let ortCevap = 0;
    const incelenenler = basvurular.filter(b => b.incelemeZaman && b.olusturulma);
    if (incelenenler.length > 0) {
      const toplam = incelenenler.reduce((a, b) => {
        const bas = b.olusturulma?.toDate?.() || new Date(0);
        const inc = b.incelemeZaman?.toDate?.() || new Date(0);
        return a + (inc.getTime() - bas.getTime());
      }, 0);
      ortCevap = Math.round(toplam / incelenenler.length / (1000 * 60 * 60));
    }
    return {
      toplamLink: linkler.length,
      aktifLink: linkler.filter(l => l.aktif).length,
      toplamBasvuru: basvurular.length,
      onaylanan: onaylanan.length,
      buAy: buAy.length,
      ortCevapSaat: ortCevap,
    };
  }, [linkler, basvurular]);

  const kopyala = (url) => {
    navigator.clipboard.writeText(url).then(() => toast('success', 'Kopyalandı'));
  };

  const linkIptal = async (link) => {
    if (!confirm(`"${link.aliciAd || 'Link'}" iptal edilsin mi?`)) return;
    try {
      await linkIptalEt(link.id, user);
      toast('success', 'Link iptal edildi');
      yukle();
    } catch (e) {
      toast('error', e.message);
    }
  };

  const basvuruOnayla = async (b) => {
    try {
      await basvuruGuncelle(ws, user, b.id, 'onaylandi');
      toast('success', 'Onaylandı');
      yukle();
      setDetayBasvuru(null);
    } catch (e) { toast('error', e.message); }
  };

  const basvuruReddet = async (b) => {
    try {
      await basvuruGuncelle(ws, user, b.id, 'reddedildi');
      toast('success', 'Reddedildi');
      yukle();
      setDetayBasvuru(null);
    } catch (e) { toast('error', e.message); }
  };

  const basvuruDonustur = async (b) => {
    try {
      const r = await basvurudanMulkOlustur(ws, user, b);
      toast('success', `Mülk oluşturuldu (ID: ${r.mulkId.slice(0, 8)})`);
      yukle();
      setDetayBasvuru(null);
    } catch (e) { toast('error', e.message); }
  };

  const basvurutSilme = async (b) => {
    if (!confirm('Başvuru silinsin mi?')) return;
    try {
      await basvuruSil(ws, user, b.id);
      toast('success', 'Silindi');
      yukle();
      setDetayBasvuru(null);
    } catch (e) { toast('error', e.message); }
  };

  return (
    <div>
      <Topbar title="📎 Tapu Toplama" />
      <div className="page" style={{ paddingBottom: 90 }}>
        {/* Üst aksiyon */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          <button className="btn btn-gold" onClick={() => setLinkModal(true)}>+ Yeni Link Oluştur</button>
          <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
            {istatistikler.aktifLink} aktif link · {istatistikler.toplamBasvuru} başvuru
          </div>
          <button className="btn btn-ghost btn-sm" onClick={yukle} style={{ marginLeft: 'auto' }}>🔄 Yenile</button>
        </div>

        {/* Tablar */}
        <div className="tabs">
          {[
            ['linkler', `🔗 Aktif Linkler (${linkler.filter(l => l.aktif).length})`],
            ['basvurular', `📥 Başvurular (${basvurular.length})`],
            ['istatistik', '📊 İstatistikler'],
          ].map(([id, lbl]) => (
            <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{lbl}</button>
          ))}
        </div>

        {yukleniyor && <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor...</div>}

        {/* Tab 1: Linkler */}
        {tab === 'linkler' && !yukleniyor && (
          <div className="card" style={{ padding: 0 }}>
            {linkler.length === 0 ? (
              <div className="empty">
                <div className="empty-ico">🔗</div>
                <div className="empty-title">Henüz link yok</div>
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: '.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: 10 }}>Oluşturma</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Alıcı</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Tip</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Süre</th>
                    <th style={{ textAlign: 'right', padding: 10 }}>Kullanım</th>
                    <th style={{ padding: 10 }}>Durum</th>
                    <th style={{ padding: 10 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {linkler.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                      <td style={{ padding: 10, fontSize: '.72rem' }}>{zamanFormat(l.olusturulma)}</td>
                      <td style={{ padding: 10 }}>
                        <div style={{ fontWeight: 500 }}>{l.aliciAd || '—'}</div>
                        <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>{l.aliciEmail || ''}</div>
                      </td>
                      <td style={{ padding: 10, fontSize: '.72rem' }}>
                        {l.tip === 'tek_kullanim' ? '🔒 Tek' : '🔁 Çok'}
                      </td>
                      <td style={{ padding: 10, fontSize: '.72rem' }}>{tarihFormat(l.sonKullanimTarihi)}</td>
                      <td style={{ padding: 10, textAlign: 'right' }}>
                        {l.kullanilanSayi}{l.maxKullanim ? `/${l.maxKullanim}` : ''}
                      </td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        {l.aktif ? <span className="badge b-green">AKTİF</span> : <span className="badge b-muted">PASİF</span>}
                      </td>
                      <td style={{ padding: 10, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-sm btn-ghost" title="Kopyala" onClick={() => kopyala(linkPublicUrl(l.token))}>📋</button>
                        <button className="btn btn-sm btn-ghost" title="WhatsApp" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Tapu: ' + linkPublicUrl(l.token))}`, '_blank')}>💬</button>
                        <button className="btn btn-sm btn-ghost" title="E-posta" onClick={() => window.location.href = `mailto:${l.aliciEmail || ''}?subject=Tapu&body=${encodeURIComponent(linkPublicUrl(l.token))}`}>📧</button>
                        <button className="btn btn-sm btn-ghost" title="QR" onClick={() => setOnizleme({ qr: qrKodUrl(linkPublicUrl(l.token)), url: linkPublicUrl(l.token) })}>🔲</button>
                        {l.aktif && <button className="btn btn-sm btn-danger" onClick={() => linkIptal(l)}>İptal</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Başvurular */}
        {tab === 'basvurular' && !yukleniyor && (
          <div className="card" style={{ padding: 0 }}>
            {basvurular.length === 0 ? (
              <div className="empty">
                <div className="empty-ico">📥</div>
                <div className="empty-title">Henüz başvuru yok</div>
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: '.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: 10 }}>Ref No</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Tarih</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Yükleyen</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Tür</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Konum</th>
                    <th style={{ textAlign: 'right', padding: 10 }}>Dosya</th>
                    <th style={{ padding: 10 }}>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {basvurular.map(b => {
                    const d = DURUM_RENK[b.durum] || DURUM_RENK.alindi;
                    return (
                      <tr key={b.id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,.03)', cursor: 'pointer' }}
                        onClick={() => setDetayBasvuru(b)}>
                        <td style={{ padding: 10, fontFamily: 'monospace', fontSize: '.72rem' }}>{b.referansNo}</td>
                        <td style={{ padding: 10, fontSize: '.72rem' }}>{zamanFormat(b.olusturulma)}</td>
                        <td style={{ padding: 10 }}>
                          <div style={{ fontWeight: 500 }}>{b.yukleyenAd}</div>
                          <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>{b.yukleyenEmail}</div>
                        </td>
                        <td style={{ padding: 10 }}>{b.tapuTuru}</td>
                        <td style={{ padding: 10, fontSize: '.72rem' }}>{b.il}/{b.ilce}</td>
                        <td style={{ padding: 10, textAlign: 'right' }}>{b.dosyalar?.length || 0}</td>
                        <td style={{ padding: 10, textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 99,
                            background: d.bg, color: d.fg, fontSize: '.68rem', fontWeight: 700,
                          }}>{d.ad}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: İstatistik */}
        {tab === 'istatistik' && !yukleniyor && (
          <div className="g4">
            {[
              ['Toplam Link', istatistikler.toplamLink, 'var(--blue2)', '🔗'],
              ['Aktif Link', istatistikler.aktifLink, 'var(--green)', '✓'],
              ['Toplam Başvuru', istatistikler.toplamBasvuru, 'var(--gold)', '📥'],
              ['Onaylanan', istatistikler.onaylanan, 'var(--green)', '✅'],
              ['Bu Ay', istatistikler.buAy, 'var(--amber)', '📅'],
              ['Ort. Cevap', `${istatistikler.ortCevapSaat}h`, 'var(--blue2)', '⏱'],
            ].map(([lbl, val, renk, ico], i) => (
              <div key={i} className="kpi" style={{ '--kc': renk }}>
                <div className="kpi-lbl">{lbl}</div>
                <div className="kpi-val" style={{ color: renk }}>{val}</div>
                <div className="kpi-sub">{ico}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Link oluşturma modal */}
      {linkModal && (
        <TapuLinkOlustur
          onClose={() => { setLinkModal(false); yukle(); }}
          onCreated={yukle}
        />
      )}

      {/* QR önizleme */}
      {onizleme && (
        <div className="modal-bg" onClick={() => setOnizleme(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 340 }}>
            <div className="modal-head">
              <div className="modal-title">🔲 QR Kod</div>
              <button className="btn btn-sm btn-ghost" onClick={() => setOnizleme(null)}>×</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <img src={onizleme.qr} alt="QR" style={{ width: 260, borderRadius: 8, background: '#fff' }} />
              <div style={{ fontFamily: 'monospace', fontSize: '.7rem', marginTop: 10, wordBreak: 'break-all', color: 'var(--muted)' }}>
                {onizleme.url}
              </div>
              <button className="btn btn-sm btn-gold" style={{ marginTop: 10 }} onClick={() => kopyala(onizleme.url)}>📋 Kopyala</button>
            </div>
          </div>
        </div>
      )}

      {/* Başvuru detay modal */}
      {detayBasvuru && (
        <div className="modal-bg" onClick={() => setDetayBasvuru(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 760, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-head">
              <div className="modal-title">📥 {detayBasvuru.referansNo}</div>
              <button className="btn btn-sm btn-ghost" onClick={() => setDetayBasvuru(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="g2">
                <div style={{ background: 'var(--surface2)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontFamily: 'var(--serif)', color: 'var(--gold)', marginBottom: 8, fontWeight: 600 }}>👤 Yükleyen</div>
                  <div style={{ fontSize: '.82rem', lineHeight: 1.8 }}>
                    <div><b>Ad:</b> {detayBasvuru.yukleyenAd}</div>
                    <div><b>E-posta:</b> {detayBasvuru.yukleyenEmail}</div>
                    <div><b>Telefon:</b> {detayBasvuru.yukleyenTelefon || '—'}</div>
                    <div><b>Tarih:</b> {zamanFormat(detayBasvuru.olusturulma)}</div>
                  </div>
                </div>
                <div style={{ background: 'var(--surface2)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontFamily: 'var(--serif)', color: 'var(--gold)', marginBottom: 8, fontWeight: 600 }}>📋 Tapu</div>
                  <div style={{ fontSize: '.82rem', lineHeight: 1.8 }}>
                    <div><b>Tür:</b> {detayBasvuru.tapuTuru}</div>
                    <div><b>Konum:</b> {detayBasvuru.il}/{detayBasvuru.ilce}/{detayBasvuru.mahalle || '—'}</div>
                    <div><b>Ada/Parsel:</b> {detayBasvuru.ada || '—'}/{detayBasvuru.parsel || '—'}</div>
                    <div><b>Yüzölçüm:</b> {detayBasvuru.yuzOlcumM2 || '—'} m²</div>
                    <div><b>Tapu No:</b> {detayBasvuru.tapuNo || '—'}</div>
                    <div><b>Tarih:</b> {detayBasvuru.tapuTarihi || '—'}</div>
                  </div>
                </div>
              </div>

              {detayBasvuru.acikAdres && (
                <div style={{ marginTop: 10, padding: 10, background: 'var(--surface2)', borderRadius: 6, fontSize: '.78rem' }}>
                  <b style={{ color: 'var(--gold)' }}>Açık Adres:</b> {detayBasvuru.acikAdres}
                </div>
              )}

              {detayBasvuru.notlar && (
                <div style={{ marginTop: 10, padding: 10, background: 'var(--surface2)', borderRadius: 6, fontSize: '.78rem' }}>
                  <b style={{ color: 'var(--gold)' }}>Notlar:</b> {detayBasvuru.notlar}
                </div>
              )}

              {detayBasvuru.dosyalar?.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>📎 Dosyalar ({detayBasvuru.dosyalar.length})</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8 }}>
                    {detayBasvuru.dosyalar.map((d, i) => (
                      <a key={i} href={d.url} target="_blank" rel="noreferrer" style={{
                        background: 'var(--surface2)', borderRadius: 8, overflow: 'hidden',
                        textDecoration: 'none', color: 'inherit',
                        border: '1px solid var(--border)',
                      }}>
                        {d.tip?.startsWith('image/') ? (
                          <img src={d.url} alt={d.ad} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>📄</div>
                        )}
                        <div style={{ padding: 6, fontSize: '.66rem' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.ad}</div>
                          <div style={{ color: 'var(--muted)' }}>{((d.boyut || 0) / 1024).toFixed(0)} KB</div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn btn-danger" onClick={() => basvurutSilme(detayBasvuru)}>Sil</button>
              <button className="btn btn-ghost" onClick={() => basvuruReddet(detayBasvuru)}>Reddet</button>
              <button className="btn btn-primary" onClick={() => basvuruOnayla(detayBasvuru)}>✓ Onayla</button>
              {detayBasvuru.durum !== 'onaylandi' && (
                <button className="btn btn-gold" onClick={() => basvuruDonustur(detayBasvuru)}>🏠 Mülke Dönüştür</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

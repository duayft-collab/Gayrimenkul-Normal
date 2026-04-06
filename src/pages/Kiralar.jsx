/**
 * @file pages/Kiralar.jsx
 * @description Kira sözleşmeleri — 2 kolon (liste + detay) + otomatik üret
 */
import { useState, useMemo } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { Topbar } from '../components/Layout';
import KiraFormu from '../components/KiraFormu';
import KiraciDetay from '../components/KiraciDetay';
import ArtisModal from '../components/ArtisModal';
import { tumKiralarIcinOtomatikUret } from '../core/kiraHesap';
import { kiraSil } from '../core/kiralarDb';

const fmtTL = (kurus) => '₺' + new Intl.NumberFormat('tr-TR').format(Math.round((kurus || 0) / 100));

const DURUM_RENK = {
  dolu:             'var(--green)',
  bos:              'var(--muted)',
  muhsait:          'var(--amber)',
  sozlesme_bitti:   'var(--red)',
};

export default function Kiralar() {
  const { user } = useAuthStore();
  const { kiralar, kiracilar, mulkler, odemeler, toast } = useStore();
  const [secili, setSecili] = useState(null);
  const [filtre, setFiltre] = useState('tumu');
  const [yeni, setYeni] = useState(false);
  const [detayKiraci, setDetayKiraci] = useState(null);
  const [uretiyor, setUretiyor] = useState(false);
  const [artisModal, setArtisModal] = useState(null);
  const ws = user?.workspaceId || 'ws_001';

  const aktif = useMemo(() => (kiralar || []).filter(k => !k.isDeleted), [kiralar]);

  const filtreli = useMemo(() => {
    const bugun = new Date();
    if (filtre === 'yaklasan') {
      return aktif.filter(k => {
        if (!k.bitisTarihi) return false;
        const b = k.bitisTarihi?.toDate ? k.bitisTarihi.toDate() : new Date(k.bitisTarihi);
        const fark = (b - bugun) / (1000 * 60 * 60 * 24);
        return fark >= 0 && fark <= 30;
      });
    }
    if (filtre === 'gecikmis') {
      return aktif.filter(k => {
        const kiraOdemeler = (odemeler || []).filter(o => o.kiraId === k.id && o.durum === 'bekliyor');
        return kiraOdemeler.some(o => {
          const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
          return v < bugun;
        });
      });
    }
    if (filtre !== 'tumu') return aktif.filter(k => k.durum === filtre);
    return aktif;
  }, [aktif, odemeler, filtre]);

  const kiraciAdi = (id) => (kiracilar || []).find(k => k.id === id)?.adSoyad || '—';
  const mulkAdi = (id) => (mulkler || []).find(m => m.id === id)?.ad || '—';

  const otomatikUret = async () => {
    setUretiyor(true);
    try {
      const r = await tumKiralarIcinOtomatikUret(ws, user, odemeler);
      toast('success', `${r.kiraSayisi} kira · ${r.toplamUret} yeni ödeme üretildi`);
    } catch (e) {
      toast('error', e.message);
    } finally {
      setUretiyor(false);
    }
  };

  const sil = async (k) => {
    try {
      await kiraSil(ws, user, k.id);
      toast('warning', 'Kira sözleşmesi silindi');
      if (secili?.id === k.id) setSecili(null);
    } catch (e) {
      toast('error', e.message);
    }
  };

  const fmtDate = (t) => {
    if (!t) return '—';
    const d = t?.toDate ? t.toDate() : new Date(t);
    return isNaN(d) ? '—' : d.toLocaleDateString('tr-TR');
  };

  return (
    <div>
      <Topbar title="🔑 Kira Sözleşmeleri" />
      <div className="page" style={{ paddingBottom: 90 }}>
        {/* Üst aksiyon */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <button className="btn btn-gold btn-sm" onClick={() => setYeni(true)}>+ Yeni Kira Sözleşmesi</button>
          <button className="btn btn-primary btn-sm" onClick={otomatikUret} disabled={uretiyor}>
            {uretiyor ? 'Üretiliyor...' : '🔄 Otomatik Kira Üret'}
          </button>
          <div style={{ display: 'flex', gap: 4, marginLeft: 20 }}>
            {[['tumu','Tümü'],['dolu','Dolu'],['bos','Boş'],['yaklasan','Biten 30g'],['gecikmis','Gecikmiş']].map(([id, lbl]) => (
              <button key={id} className={`btn btn-sm ${filtre === id ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setFiltre(id)}>{lbl}</button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '.75rem', color: 'var(--muted)' }}>
            {filtreli.length} / {aktif.length} sözleşme
          </div>
        </div>

        {/* 2 kolon */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
          {/* SOL — Liste */}
          <div className="card" style={{ padding: 0 }}>
            {filtreli.length === 0 ? (
              <div className="empty">
                <div className="empty-ico">🔑</div>
                <div className="empty-title">Kira sözleşmesi yok</div>
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: '.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: 10 }}>Mülk</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Kiracı</th>
                    <th style={{ textAlign: 'right', padding: 10 }}>Aylık</th>
                    <th style={{ textAlign: 'left', padding: 10 }}>Bitiş</th>
                    <th style={{ padding: 10 }}>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {filtreli.map(k => (
                    <tr key={k.id}
                      onClick={() => setSecili(k)}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,.03)', cursor: 'pointer',
                        background: secili?.id === k.id ? 'rgba(201,168,76,.08)' : 'transparent',
                      }}>
                      <td style={{ padding: 10, fontWeight: 500 }}>{mulkAdi(k.mulkId)}</td>
                      <td style={{ padding: 10 }}>{kiraciAdi(k.kiraciId)}</td>
                      <td style={{ padding: 10, textAlign: 'right', fontWeight: 600 }}>
                        {k.paraBirim === 'TRY' ? fmtTL(k.aylikKiraKurus) : `${k.paraBirim === 'USD' ? '$' : '€'}${((k.aylikKiraKurus || 0) / 100).toLocaleString('tr-TR')}`}
                      </td>
                      <td style={{ padding: 10, fontSize: '.72rem', color: 'var(--muted)' }}>{fmtDate(k.bitisTarihi)}</td>
                      <td style={{ padding: 10 }}>
                        <span style={{ color: DURUM_RENK[k.durum] || 'var(--muted)', fontWeight: 600, fontSize: '.7rem' }}>
                          {k.durum}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* SAĞ — Detay */}
          <div className="card">
            {!secili ? (
              <div className="empty">
                <div className="empty-ico">👉</div>
                <div className="empty-title">Sol listeden bir sözleşme seçin</div>
              </div>
            ) : (
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 10 }}>
                  {mulkAdi(secili.mulkId)}
                </div>
                <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 12 }}>
                  Kiracı: <b style={{ color: 'var(--text)' }}>{kiraciAdi(secili.kiraciId)}</b>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '.78rem' }}>
                  <div><span style={{ color: 'var(--muted)' }}>Aylık:</span> <b style={{ color: 'var(--gold)' }}>{secili.paraBirim} {((secili.aylikKiraKurus || 0) / 100).toLocaleString('tr-TR')}</b></div>
                  <div><span style={{ color: 'var(--muted)' }}>Depozito:</span> <b>{secili.paraBirim} {((secili.depozitoKurus || 0) / 100).toLocaleString('tr-TR')}</b></div>
                  <div><span style={{ color: 'var(--muted)' }}>Başlangıç:</span> {fmtDate(secili.baslangicTarihi)}</div>
                  <div><span style={{ color: 'var(--muted)' }}>Bitiş:</span> {fmtDate(secili.bitisTarihi)}</div>
                  <div><span style={{ color: 'var(--muted)' }}>Artış:</span> {secili.artisKosulu} {secili.artisOrani ? '%' + secili.artisOrani : ''}</div>
                  <div><span style={{ color: 'var(--muted)' }}>Sözleşme:</span> {secili.sozlesmeNo || '—'}</div>
                </div>
                {secili.sonArtisTarihi && (
                  <div style={{ marginTop: 12, padding: 10, background: 'rgba(201,168,76,.08)', borderLeft: '3px solid var(--gold)', borderRadius: 6, fontSize: '.75rem' }}>
                    📈 <b>Son Artış:</b> {fmtDate(secili.sonArtisTarihi)} · %{secili.artisOrani || 0} →{' '}
                    <b style={{ color: 'var(--gold)' }}>{fmtTL(secili.aylikKiraKurus)}</b>
                    {secili.sonrakiArtisTarihi && (
                      <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 2 }}>
                        Sonraki artış: {fmtDate(secili.sonrakiArtisTarihi)}
                      </div>
                    )}
                  </div>
                )}
                {secili.notlar && (
                  <div style={{ marginTop: 12, padding: 10, background: 'var(--surface2)', borderRadius: 6, fontSize: '.78rem' }}>
                    {secili.notlar}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                  <button className="btn btn-sm btn-gold" onClick={() => {
                    const k = (kiracilar || []).find(x => x.id === secili.kiraciId);
                    if (k) setDetayKiraci(k);
                  }}>👤 Kiracı Detay</button>
                  <button className="btn btn-sm btn-primary" onClick={() => setArtisModal(secili)}>📈 Artış Uygula</button>
                  <button className="btn btn-sm btn-danger" onClick={() => sil(secili)}>Sil</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {yeni && <KiraFormu onClose={() => setYeni(false)} onSaved={() => {}} />}
      {detayKiraci && <KiraciDetay kiraci={detayKiraci} onClose={() => setDetayKiraci(null)} onSaved={() => {}} />}
      {artisModal && (
        <ArtisModal
          kira={artisModal}
          onClose={() => setArtisModal(null)}
          onSaved={() => { setArtisModal(null); setSecili(null); }}
        />
      )}
    </div>
  );
}

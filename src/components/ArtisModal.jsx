/**
 * @file components/ArtisModal.jsx
 * @description Kira artış modalı — Kiralar ve Karsilastirma sayfalarında kullanılır
 */
import { useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { tufeArtisUygula } from '../core/kiraHesap';

const fmtTL = (kurus) => '₺' + new Intl.NumberFormat('tr-TR').format(Math.round((kurus || 0) / 100));

export default function ArtisModal({ kira, onClose, onSaved }) {
  const { user } = useAuthStore();
  const { toast } = useStore();
  const ws = user?.workspaceId || 'ws_001';
  const [oran, setOran] = useState(kira?.artisOrani || 48);
  const [gecerlilik, setGecerlilik] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [calisiyor, setCalisiyor] = useState(false);

  if (!kira) return null;

  const yeniKurus = Math.round((kira.aylikKiraKurus || 0) * (1 + oran / 100));
  const fark = yeniKurus - (kira.aylikKiraKurus || 0);

  const uygula = async () => {
    setCalisiyor(true);
    try {
      const r = await tufeArtisUygula(ws, user, kira, oran, new Date(gecerlilik));
      toast('success', `${fmtTL(r.eskiKurus)} → ${fmtTL(r.yeniTutarKurus)} · ${r.guncellenenOdemeSayisi} ödeme güncellendi`);
      onSaved?.(r);
    } catch (e) {
      toast('error', e.message);
    } finally {
      setCalisiyor(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
        <div className="modal-head">
          <div className="modal-title">📈 Kira Artışı Uygula</div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ padding: 12, background: 'var(--surface2)', borderRadius: 8, marginBottom: 14, fontSize: '.82rem' }}>
            <div><b>Mevcut Kira:</b> {fmtTL(kira.aylikKiraKurus)}</div>
            <div><b>Artış Koşulu:</b> {kira.artisKosulu || 'TUFE'}</div>
            <div><b>Son Artış:</b> {kira.sonArtisTarihi
              ? (kira.sonArtisTarihi?.toDate ? kira.sonArtisTarihi.toDate() : new Date(kira.sonArtisTarihi)).toLocaleDateString('tr-TR')
              : 'Henüz yok'}</div>
          </div>

          <div className="fgrid2">
            <div className="fgroup">
              <label className="flbl">Artış Oranı (%)</label>
              <input type="number" step="0.5" className="input" value={oran}
                onChange={e => setOran(parseFloat(e.target.value) || 0)} />
              <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginTop: 4 }}>
                💡 TÜİK TÜFE son 12 ay ortalamasını kontrol edin
              </div>
            </div>
            <div className="fgroup">
              <label className="flbl">Geçerlilik Tarihi</label>
              <input type="date" className="input" value={gecerlilik}
                onChange={e => setGecerlilik(e.target.value)} />
            </div>
          </div>

          <div style={{
            padding: 14, background: 'rgba(201,168,76,.08)',
            border: '1px solid rgba(201,168,76,.3)', borderRadius: 8,
          }}>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 4 }}>Yeni Aylık Kira</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--gold)' }}>
              {fmtTL(yeniKurus)}
            </div>
            <div style={{ fontSize: '.75rem', color: 'var(--green)', marginTop: 2 }}>
              +{fmtTL(fark)} ({oran > 0 ? '+' : ''}%{oran.toFixed(1)})
            </div>
          </div>

          <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 10 }}>
            ⚠️ Geçerlilik tarihinden sonraki bekleyen kira ödemeleri otomatik olarak yeni tutara güncellenecek.
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Vazgeç</button>
          <button className="btn btn-gold" onClick={uygula} disabled={calisiyor || oran === 0}>
            {calisiyor ? 'Uygulanıyor...' : '✓ Artışı Uygula'}
          </button>
        </div>
      </div>
    </div>
  );
}

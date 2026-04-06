/**
 * @file pages/Mulkler.jsx
 * @description Mülk listesi — filtre, arama, sıralama, galeri, paylaşım, karşılaştırma
 * @anayasa K06 soft delete · K11 workspace · K12 RBAC
 */
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/app';
import { useAuthStore } from '../store/auth';
import { Topbar } from '../components/Layout';
import MulkGaleri from '../components/MulkGaleri';
import PaylasimModal from '../components/PaylasimModal';
import ExportMenu from '../components/ExportMenu';
import AdresSecici from '../components/AdresSecici';
import { tumIller } from '../core/konum';

const TURLER = ['daire', 'villa', 'arsa', 'tarla', 'isyeri', 'dukkan'];
const DURUMLAR = ['sahip', 'satilik', 'satildi', 'kiralik', 'kirada'];

const fmtTL = (v) => '₺' + new Intl.NumberFormat('tr-TR').format(v || 0);

function UrlQuery() {
  const p = new URLSearchParams(window.location.search);
  return {
    q: p.get('q') || '',
    il: p.get('il') || '',
    tur: p.get('tur') || '',
    durum: p.get('durum') || '',
    minFiyat: p.get('minFiyat') || '',
    maxFiyat: p.get('maxFiyat') || '',
    sirala: p.get('sirala') || 'tarih',
  };
}

function queryYaz(filtreler) {
  const p = new URLSearchParams();
  for (const k in filtreler) if (filtreler[k]) p.set(k, filtreler[k]);
  const yeni = p.toString();
  const url = window.location.pathname + (yeni ? '?' + yeni : '');
  window.history.replaceState(null, '', url);
}

export default function Mulkler() {
  const { user } = useAuthStore();
  const { mulkler, addProperty, updateProperty, removeProperty, setPage, toast } = useStore();
  const [filtre, setFiltre] = useState(UrlQuery());
  const [secimler, setSecimler] = useState([]); // compare checkbox
  const [duzenle, setDuzenle] = useState(null);
  const [galeriMulk, setGaleriMulk] = useState(null);
  const [paylasimMulk, setPaylasimMulk] = useState(null);
  const canWrite = user?.role !== 'viewer';

  useEffect(() => { queryYaz(filtre); }, [filtre]);

  const illerListe = tumIller();

  const aktifMulkler = useMemo(() => (mulkler || []).filter(m => !m.isDeleted), [mulkler]);

  const filtreli = useMemo(() => {
    let liste = [...aktifMulkler];
    if (filtre.q) {
      const q = filtre.q.toLowerCase();
      liste = liste.filter(m =>
        (m.ad || '').toLowerCase().includes(q) ||
        (m.fullAdres || '').toLowerCase().includes(q) ||
        (m.il || '').toLowerCase().includes(q) ||
        (m.ilce || '').toLowerCase().includes(q)
      );
    }
    if (filtre.il) liste = liste.filter(m => m.il === filtre.il);
    if (filtre.tur) liste = liste.filter(m => m.tur === filtre.tur);
    if (filtre.durum) liste = liste.filter(m => m.durum === filtre.durum);
    if (filtre.minFiyat) liste = liste.filter(m => (m.fiyat || 0) >= parseFloat(filtre.minFiyat));
    if (filtre.maxFiyat) liste = liste.filter(m => (m.fiyat || 0) <= parseFloat(filtre.maxFiyat));
    // Sıralama
    const sirala = filtre.sirala;
    if (sirala === 'fiyatAsc') liste.sort((a, b) => (a.fiyat || 0) - (b.fiyat || 0));
    else if (sirala === 'fiyatDesc') liste.sort((a, b) => (b.fiyat || 0) - (a.fiyat || 0));
    else if (sirala === 'alanDesc') liste.sort((a, b) => (b.alan || 0) - (a.alan || 0));
    else liste.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    return liste;
  }, [aktifMulkler, filtre]);

  const temizle = () => setFiltre({ q: '', il: '', tur: '', durum: '', minFiyat: '', maxFiyat: '', sirala: 'tarih' });

  const toggleSecim = (id) => {
    setSecimler(s => {
      if (s.includes(id)) return s.filter(x => x !== id);
      if (s.length >= 4) { toast('warning', 'En fazla 4 mülk seçebilirsiniz'); return s; }
      return [...s, id];
    });
  };

  const karsiGit = () => {
    if (secimler.length < 2) { toast('error', 'En az 2 mülk seçin'); return; }
    sessionStorage.setItem('karsiSecimler', JSON.stringify(secimler));
    setPage('karsilastir');
  };

  const yeniMulk = () => setDuzenle({
    ad: '', tur: 'daire', durum: 'sahip',
    il: '', ilce: '', mahalle: '', ada: '', parsel: '', fullAdres: '', lat: null, lng: null,
    alan: 0, fiyat: 0, aylikKira: 0, notlar: '',
  });

  const kaydet = async () => {
    if (!duzenle.ad) { toast('error', 'Ad zorunlu'); return; }
    try {
      if (duzenle.id) {
        const { id, ...veri } = duzenle;
        await updateProperty(id, veri);
        toast('success', 'Mülk güncellendi');
      } else {
        await addProperty(duzenle);
        toast('success', 'Mülk eklendi');
      }
      setDuzenle(null);
    } catch (e) {
      toast('error', e.message);
    }
  };

  const sil = async (m) => {
    if (!canWrite) { toast('error', 'Yetkiniz yok'); return; }
    await removeProperty(m.id);
  };

  const ozet = {
    toplam: filtreli.length,
    toplamDeger: filtreli.reduce((a, m) => a + (m.fiyat || 0), 0),
    toplamAlan: filtreli.reduce((a, m) => a + (m.alan || 0), 0),
    workspace: user?.workspaceId,
  };

  return (
    <div>
      <Topbar title="📋 Mülkler" />
      <div className="page" style={{ paddingBottom: 90 }}>
        {/* Üst özet */}
        <div className="g4" style={{ marginBottom: 14 }}>
          <div className="kpi" style={{ '--kc': 'var(--blue2)' }}>
            <div className="kpi-lbl">Toplam Mülk</div>
            <div className="kpi-val">{ozet.toplam} / {aktifMulkler.length}</div>
          </div>
          <div className="kpi" style={{ '--kc': 'var(--gold)' }}>
            <div className="kpi-lbl">Toplam Değer</div>
            <div className="kpi-val" style={{ color: 'var(--gold)' }}>{fmtTL(ozet.toplamDeger)}</div>
          </div>
          <div className="kpi" style={{ '--kc': 'var(--green)' }}>
            <div className="kpi-lbl">Toplam Alan</div>
            <div className="kpi-val" style={{ color: 'var(--green)' }}>{ozet.toplamAlan.toLocaleString('tr-TR')} m²</div>
          </div>
          <div className="kpi" style={{ '--kc': 'var(--amber)' }}>
            <div className="kpi-lbl">Seçili (Karşılaştırma)</div>
            <div className="kpi-val" style={{ color: 'var(--amber)' }}>{secimler.length}</div>
          </div>
        </div>

        {/* Filtre barı */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
            <div className="fgroup" style={{ marginBottom: 0 }}>
              <label className="flbl">🔍 Arama</label>
              <input className="input" value={filtre.q} onChange={e => setFiltre({ ...filtre, q: e.target.value })} placeholder="Ad, adres..." />
            </div>
            <div className="fgroup" style={{ marginBottom: 0 }}>
              <label className="flbl">İl</label>
              <select className="select" value={filtre.il} onChange={e => setFiltre({ ...filtre, il: e.target.value })}>
                <option value="">Tümü</option>
                {illerListe.map(il => <option key={il} value={il}>{il}</option>)}
              </select>
            </div>
            <div className="fgroup" style={{ marginBottom: 0 }}>
              <label className="flbl">Tür</label>
              <select className="select" value={filtre.tur} onChange={e => setFiltre({ ...filtre, tur: e.target.value })}>
                <option value="">Tümü</option>
                {TURLER.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="fgroup" style={{ marginBottom: 0 }}>
              <label className="flbl">Durum</label>
              <select className="select" value={filtre.durum} onChange={e => setFiltre({ ...filtre, durum: e.target.value })}>
                <option value="">Tümü</option>
                {DURUMLAR.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="fgroup" style={{ marginBottom: 0 }}>
              <label className="flbl">Min Fiyat</label>
              <input type="number" className="input" value={filtre.minFiyat} onChange={e => setFiltre({ ...filtre, minFiyat: e.target.value })} />
            </div>
            <div className="fgroup" style={{ marginBottom: 0 }}>
              <label className="flbl">Sırala</label>
              <select className="select" value={filtre.sirala} onChange={e => setFiltre({ ...filtre, sirala: e.target.value })}>
                <option value="tarih">Tarih ▼</option>
                <option value="fiyatDesc">Fiyat ▼</option>
                <option value="fiyatAsc">Fiyat ▲</option>
                <option value="alanDesc">Alan ▼</option>
              </select>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={temizle}>Temizle</button>
          </div>
        </div>

        {/* Üst aksiyon çubuğu */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <button className="btn btn-gold btn-sm" onClick={yeniMulk} disabled={!canWrite}>+ Yeni Mülk</button>
          <button className="btn btn-primary btn-sm" onClick={karsiGit} disabled={secimler.length < 2}>
            ⚖️ Karşılaştır ({secimler.length})
          </button>
          <div style={{ marginLeft: 'auto' }}>
            <ExportMenu mulkler={filtreli} ozet={ozet} />
          </div>
        </div>

        {/* Liste */}
        {filtreli.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">🏠</div>
            <div className="empty-title">Mülk bulunamadı</div>
            <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>Filtreleri temizleyin veya yeni mülk ekleyin</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {filtreli.map(m => {
              const secili = secimler.includes(m.id);
              return (
                <div key={m.id} className="card" style={{
                  padding: 14, position: 'relative',
                  borderColor: secili ? 'var(--gold)' : 'var(--border)',
                  cursor: 'default',
                }}>
                  <div style={{ position: 'absolute', top: 10, left: 10 }}>
                    <input type="checkbox" checked={secili} onChange={() => toggleSecim(m.id)} />
                  </div>
                  <div style={{ marginLeft: 22 }}>
                    <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: '.95rem' }}>{m.ad || 'İsimsiz'}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 8 }}>
                      {m.tur} · {m.il || '—'} / {m.ilce || '—'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: '.75rem' }}>
                      <div><span style={{ color: 'var(--muted)' }}>Alan:</span> <b>{(m.alan || 0).toLocaleString('tr-TR')} m²</b></div>
                      <div><span style={{ color: 'var(--muted)' }}>Fiyat:</span> <b style={{ color: 'var(--gold)' }}>{fmtTL(m.fiyat)}</b></div>
                      <div><span style={{ color: 'var(--muted)' }}>Kira:</span> <b>{fmtTL(m.aylikKira)}</b></div>
                      <div><span style={{ color: 'var(--muted)' }}>Durum:</span> <span className={`badge b-${m.durum === 'sahip' ? 'gold' : m.durum === 'satildi' ? 'muted' : 'green'}`}>{m.durum || '—'}</span></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 12, flexWrap: 'wrap' }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setGaleriMulk(m)}>📸 Galeri</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setPaylasimMulk(m)}>🔗 Paylaş</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setDuzenle({ ...m })}>✏️</button>
                    <button className="btn btn-sm btn-danger" onClick={() => sil(m)}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DÜZENLE modalı */}
      {duzenle && (
        <div className="modal-bg" onClick={() => setDuzenle(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-head">
              <div className="modal-title">{duzenle.id ? '✏️ Düzenle' : '+ Yeni Mülk'}</div>
              <button className="btn btn-sm btn-ghost" onClick={() => setDuzenle(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="fgrid2">
                <div className="fgroup">
                  <label className="flbl">Mülk Adı</label>
                  <input className="input" value={duzenle.ad} onChange={e => setDuzenle({ ...duzenle, ad: e.target.value })} />
                </div>
                <div className="fgroup">
                  <label className="flbl">Tür</label>
                  <select className="select" value={duzenle.tur} onChange={e => setDuzenle({ ...duzenle, tur: e.target.value })}>
                    {TURLER.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="fgrid3">
                <div className="fgroup">
                  <label className="flbl">Alan (m²)</label>
                  <input type="number" className="input" value={duzenle.alan} onChange={e => setDuzenle({ ...duzenle, alan: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="fgroup">
                  <label className="flbl">Fiyat (₺)</label>
                  <input type="number" className="input" value={duzenle.fiyat} onChange={e => setDuzenle({ ...duzenle, fiyat: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="fgroup">
                  <label className="flbl">Aylık Kira (₺)</label>
                  <input type="number" className="input" value={duzenle.aylikKira} onChange={e => setDuzenle({ ...duzenle, aylikKira: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="fgroup">
                <label className="flbl">Durum</label>
                <select className="select" value={duzenle.durum} onChange={e => setDuzenle({ ...duzenle, durum: e.target.value })}>
                  {DURUMLAR.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ margin: '12px 0', fontSize: '.85rem', fontWeight: 600, color: 'var(--gold)' }}>📍 Konum</div>
              <AdresSecici deger={duzenle} setDeger={(v) => setDuzenle({ ...duzenle, ...v })} />
              <div className="fgroup">
                <label className="flbl">Notlar</label>
                <textarea className="textarea" rows={3} value={duzenle.notlar || ''} onChange={e => setDuzenle({ ...duzenle, notlar: e.target.value })} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setDuzenle(null)}>Vazgeç</button>
              <button className="btn btn-gold" onClick={kaydet}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {galeriMulk && (
        <div className="modal-bg" onClick={() => setGaleriMulk(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 820, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-head">
              <div className="modal-title">📸 {galeriMulk.ad}</div>
              <button className="btn btn-sm btn-ghost" onClick={() => setGaleriMulk(null)}>×</button>
            </div>
            <div className="modal-body">
              <MulkGaleri mulkId={galeriMulk.id} />
            </div>
          </div>
        </div>
      )}

      {paylasimMulk && (
        <PaylasimModal mulk={paylasimMulk} onClose={() => setPaylasimMulk(null)} />
      )}
    </div>
  );
}

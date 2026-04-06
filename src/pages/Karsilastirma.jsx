/**
 * @file pages/Karsilastirma.jsx
 * @description Kira vs enflasyon/altın/döviz reel performans + öneriler
 */
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { Topbar } from '../components/Layout';
import { snapshotlariGetir } from '../core/marketGecmis';
import {
  enflasyonDonem, varlikGetiri, endeksSerisi, mulkToplamGetiri, portfoyGetiri, kiraArtisOrani
} from '../core/karsilastirma';
import { oneriUret } from '../core/yatirimOnerisi';
import ArtisModal from '../components/ArtisModal';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const fmt = (v) => (v == null || isNaN(v)) ? '—' : (v > 0 ? '+' : '') + v.toFixed(1) + '%';
const fmtTL = (kurus) => '₺' + new Intl.NumberFormat('tr-TR').format(Math.round((kurus || 0) / 100));

function donemAraligi(tip) {
  const bugun = new Date();
  if (tip === 'ay') return { bas: new Date(bugun.getFullYear(), bugun.getMonth(), 1), bit: bugun };
  if (tip === 'yil') return { bas: new Date(bugun.getFullYear(), 0, 1), bit: bugun };
  if (tip === '1y') { const d = new Date(bugun); d.setFullYear(d.getFullYear() - 1); return { bas: d, bit: bugun }; }
  if (tip === '5y') { const d = new Date(bugun); d.setFullYear(d.getFullYear() - 5); return { bas: d, bit: bugun }; }
  return { bas: null, bit: null };
}

export default function Karsilastirma() {
  const { user } = useAuthStore();
  const { mulkler, kiralar, odemeler, marketData } = useStore();
  const [donem, setDonem] = useState('1y');
  const [ozelBas, setOzelBas] = useState('');
  const [ozelBit, setOzelBit] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [artisModal, setArtisModal] = useState(null);

  const { bas, bit } = useMemo(() => {
    if (donem === 'ozel') {
      return {
        bas: ozelBas ? new Date(ozelBas) : new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        bit: ozelBit ? new Date(ozelBit + 'T23:59:59') : new Date(),
      };
    }
    return donemAraligi(donem);
  }, [donem, ozelBas, ozelBit]);

  useEffect(() => {
    (async () => {
      if (!user?.workspaceId) return;
      setYukleniyor(true);
      const snp = await snapshotlariGetir(user.workspaceId, bas, bit);
      setSnapshots(snp);
      setYukleniyor(false);
    })();
  }, [user?.workspaceId, bas?.getTime(), bit?.getTime()]);

  const tufe = useMemo(() => enflasyonDonem(bas, bit), [bas, bit]);
  const altin = useMemo(() => varlikGetiri(snapshots, 'altinGram', bas, bit), [snapshots, bas, bit]);
  const gumus = useMemo(() => varlikGetiri(snapshots, 'gumusGram', bas, bit), [snapshots, bas, bit]);
  const usd = useMemo(() => varlikGetiri(snapshots, 'usd', bas, bit), [snapshots, bas, bit]);
  const eur = useMemo(() => varlikGetiri(snapshots, 'eur', bas, bit), [snapshots, bas, bit]);
  const btc = useMemo(() => varlikGetiri(snapshots, 'btc', bas, bit), [snapshots, bas, bit]);
  const bist = useMemo(() => varlikGetiri(snapshots, 'bist100', bas, bit), [snapshots, bas, bit]);
  const portfoy = useMemo(() => portfoyGetiri({ mulkler, kiralar, odemeler, bas, bit }), [mulkler, kiralar, odemeler, bas, bit]);
  const kiraOrt = portfoy.kiraOrtYuzde;

  const seri = useMemo(() => endeksSerisi({ snapshots, kiralar, odemeler, bas, bit }), [snapshots, kiralar, odemeler, bas, bit]);

  const mulkTablo = useMemo(() => {
    return (mulkler || []).filter(m => !m.isDeleted).map(m => {
      const r = mulkToplamGetiri(m, odemeler, bas, bit);
      return {
        ad: m.ad || '—',
        il: m.il || '—',
        degerYuzde: r.degerArtisiYuzde,
        kiraTahsilKurus: r.kiraTahsilKurus,
        roiYuzde: r.roiYuzde,
        vsAltin: altin ? r.roiYuzde - altin : 0,
      };
    }).sort((a, b) => b.roiYuzde - a.roiYuzde);
  }, [mulkler, odemeler, bas, bit, altin]);

  const oneriler = useMemo(() => oneriUret({
    mulkler, kiralar, odemeler, snapshots, bas, bit, marketState: marketData,
  }), [mulkler, kiralar, odemeler, snapshots, bas, bit]);

  // En çok geride kalan kira — "Artış Uygula" için aday
  const geriKiralar = useMemo(() => {
    return (kiralar || [])
      .filter(k => !k.isDeleted && k.durum === 'dolu')
      .map(k => ({
        ...k,
        kiraOrani: kiraArtisOrani(k, odemeler, bas, bit),
        reelVsTufe: kiraArtisOrani(k, odemeler, bas, bit) - tufe,
      }))
      .filter(k => k.reelVsTufe < 0)
      .sort((a, b) => a.reelVsTufe - b.reelVsTufe);
  }, [kiralar, odemeler, bas, bit, tufe]);

  const reelKayip = kiraOrt - tufe;

  const kpi = (lbl, v, renk, ico) => (
    <div className="kpi" style={{ '--kc': renk }}>
      <div className="kpi-lbl">{lbl}</div>
      <div className="kpi-val" style={{ color: renk, fontSize: '1.4rem' }}>
        {fmt(v)}
      </div>
      <div className="kpi-sub" style={{ color: 'var(--muted)', fontSize: '.68rem' }}>{ico}</div>
    </div>
  );

  const renk = (v, ref = 0) => v > ref ? '#22C55E' : v < ref ? '#EF4444' : '#888';

  return (
    <div>
      <Topbar title="📊 Karşılaştırma — Reel Performans" />
      <div className="page" style={{ paddingBottom: 90 }}>
        {/* Dönem seçici */}
        <div className="card" style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {[['ay', 'Bu Ay'], ['yil', 'Bu Yıl'], ['1y', '1 Yıl'], ['5y', '5 Yıl'], ['ozel', 'Özel']].map(([id, lbl]) => (
            <button key={id} className={`btn btn-sm ${donem === id ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setDonem(id)}>{lbl}</button>
          ))}
          {donem === 'ozel' && (
            <>
              <input type="date" className="input" style={{ width: 150 }} value={ozelBas} onChange={e => setOzelBas(e.target.value)} />
              <input type="date" className="input" style={{ width: 150 }} value={ozelBit} onChange={e => setOzelBit(e.target.value)} />
            </>
          )}
          <div style={{ marginLeft: 'auto', fontSize: '.72rem', color: 'var(--muted)' }}>
            {bas?.toLocaleDateString('tr-TR')} → {bit?.toLocaleDateString('tr-TR')}
            {yukleniyor && ' · yükleniyor...'}
            {!yukleniyor && ' · ' + snapshots.length + ' veri noktası'}
          </div>
        </div>

        {/* Büyük kartlar */}
        <div className="g4" style={{ marginBottom: 14, gap: 10 }}>
          {kpi('Kira Ort.', kiraOrt, renk(kiraOrt - tufe), '🔑')}
          {kpi('TÜFE (Enflasyon)', tufe, '#C9A84C', '📊')}
          {kpi('Altın gr', altin, renk(altin, tufe), '🥇')}
          {kpi('USD/TL', usd, renk(usd, tufe), '💵')}
        </div>
        <div className="g4" style={{ marginBottom: 14, gap: 10 }}>
          {kpi('Gümüş gr', gumus, renk(gumus, tufe), '🥈')}
          {kpi('EUR/TL', eur, renk(eur, tufe), '💶')}
          {kpi('BTC/TL', btc, renk(btc, tufe), '₿')}
          {kpi('BIST100', bist, renk(bist, tufe), '📈')}
        </div>

        {/* Reel kayıp uyarısı */}
        {reelKayip < 0 && (
          <div className="card" style={{
            marginBottom: 14,
            background: 'rgba(239,68,68,.05)',
            borderLeft: '3px solid var(--red)',
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: '1.8rem' }}>🔴</div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--red)' }}>
                Reel Kayıp: {fmt(reelKayip)} (TÜFE karşısında)
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 3 }}>
                Kira artışın enflasyonun {fmt(Math.abs(reelKayip))} gerisinde.
                {geriKiralar.length > 0 && ` En çok geride olan: ${geriKiralar[0].aylikKiraKurus ? 'sözleşme #' + geriKiralar[0].id.slice(0, 6) : ''}`}
              </div>
            </div>
            {geriKiralar.length > 0 && (
              <button className="btn btn-gold" onClick={() => setArtisModal(geriKiralar[0])}>
                📈 Artış Uygula
              </button>
            )}
          </div>
        )}

        {/* Çizgi grafik */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 10 }}>
            📈 Endeks Karşılaştırma (Baz = 100)
          </div>
          {seri.length === 0 ? (
            <div className="empty">
              <div className="empty-ico">📉</div>
              <div className="empty-title">Veri yetersiz</div>
              <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
                Günlük piyasa snapshotları birikince grafik dolacak
              </div>
            </div>
          ) : (
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seri}>
                  <CartesianGrid stroke="rgba(255,255,255,.05)" />
                  <XAxis dataKey="ay" tick={{ fontSize: 10, fill: '#888' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                  <Tooltip
                    contentStyle={{ background: '#161616', border: '1px solid #333', fontSize: 11 }}
                    formatter={(v) => v}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line dataKey="kira"  stroke="#C9A84C" strokeWidth={2.5} name="Kira" dot={false} />
                  <Line dataKey="tufe"  stroke="#EF4444" strokeWidth={2}   name="TÜFE" dot={false} strokeDasharray="4 2" />
                  <Line dataKey="altin" stroke="#F59E0B" strokeWidth={2}   name="Altın" dot={false} />
                  <Line dataKey="usd"   stroke="#22C55E" strokeWidth={1.5} name="USD" dot={false} />
                  <Line dataKey="bist"  stroke="#1B4F8A" strokeWidth={1.5} name="BIST100" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Mülk bazlı tablo */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 10 }}>
            🏠 Mülk Bazlı Performans
          </div>
          {mulkTablo.length === 0 ? (
            <div className="empty"><div className="empty-ico">🏠</div><div className="empty-title">Mülk yok</div></div>
          ) : (
            <table style={{ width: '100%', fontSize: '.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>Mülk</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Konum</th>
                  <th style={{ textAlign: 'right', padding: 8 }}>Değer %</th>
                  <th style={{ textAlign: 'right', padding: 8 }}>Kira Tahsil</th>
                  <th style={{ textAlign: 'right', padding: 8 }}>Toplam ROI</th>
                  <th style={{ textAlign: 'right', padding: 8 }}>vs Altın</th>
                </tr>
              </thead>
              <tbody>
                {mulkTablo.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                    <td style={{ padding: 8, fontWeight: 500 }}>{m.ad}</td>
                    <td style={{ padding: 8, color: 'var(--muted)' }}>{m.il}</td>
                    <td style={{ padding: 8, textAlign: 'right', color: renk(m.degerYuzde) }}>{fmt(m.degerYuzde)}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>{fmtTL(m.kiraTahsilKurus)}</td>
                    <td style={{ padding: 8, textAlign: 'right', fontWeight: 700, color: renk(m.roiYuzde) }}>{fmt(m.roiYuzde)}</td>
                    <td style={{ padding: 8, textAlign: 'right', color: renk(m.vsAltin) }}>
                      {fmt(m.vsAltin)} {m.vsAltin < 0 ? '🔴' : m.vsAltin > 0 ? '🟢' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Öneriler */}
        <div className="card">
          <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 10 }}>
            💡 Yatırım Önerileri ({oneriler.length})
          </div>
          {oneriler.length === 0 ? (
            <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>Portföy sağlıklı, kritik uyarı yok.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {oneriler.map((o, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, padding: 12,
                  background: 'var(--surface2)',
                  borderLeft: `3px solid ${o.renk}`,
                  borderRadius: 6,
                }}>
                  <div style={{ fontSize: '1.3rem' }}>{o.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '.88rem', fontWeight: 600, color: o.renk }}>{o.baslik}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 2 }}>{o.mesaj}</div>
                  </div>
                  {o.tip === 'kira_artis' && o.kiraId && (
                    <button
                      className="btn btn-sm btn-gold"
                      onClick={() => {
                        const k = (kiralar || []).find(x => x.id === o.kiraId);
                        if (k) setArtisModal(k);
                      }}
                    >Artış Uygula</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {artisModal && (
        <ArtisModal
          kira={artisModal}
          onClose={() => setArtisModal(null)}
          onSaved={() => setArtisModal(null)}
        />
      )}
    </div>
  );
}

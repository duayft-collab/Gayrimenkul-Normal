/**
 * @file components/KarsilastirmaWidget.jsx
 * @description Dashboard mini — tek satır chip'ler, tıkla → Karşılaştırma
 */
import { useEffect, useState } from 'react';
import { useStore } from '../store/app';
import { useAuthStore } from '../store/auth';
import { snapshotlariGetir } from '../core/marketGecmis';
import { enflasyonDonem, varlikGetiri, portfoyGetiri } from '../core/karsilastirma';

const fmt = (v) => (v == null || isNaN(v)) ? '—' : (v > 0 ? '+' : '') + v.toFixed(1) + '%';

export default function KarsilastirmaWidget() {
  const { user } = useAuthStore();
  const { mulkler, kiralar, odemeler, setPage } = useStore();
  const [snapshots, setSnapshots] = useState([]);

  useEffect(() => {
    (async () => {
      if (!user?.workspaceId) return;
      const bas = new Date(); bas.setFullYear(bas.getFullYear() - 1);
      const snp = await snapshotlariGetir(user.workspaceId, bas, new Date());
      setSnapshots(snp);
    })();
  }, [user?.workspaceId]);

  const bas = new Date(); bas.setFullYear(bas.getFullYear() - 1);
  const bit = new Date();

  const tufe = enflasyonDonem(bas, bit);
  const altin = varlikGetiri(snapshots, 'altinGram', bas, bit);
  const usd = varlikGetiri(snapshots, 'usd', bas, bit);
  const bist = varlikGetiri(snapshots, 'bist100', bas, bit);
  const port = portfoyGetiri({ mulkler, kiralar, odemeler, bas, bit });
  const kira = port.kiraOrtYuzde;

  const reelVsTufe = kira - tufe;
  const reelKirmizi = reelVsTufe < 0;

  const chip = (etiket, deger, renk) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 10px', borderRadius: 99,
      background: 'rgba(255,255,255,.03)',
      border: `1px solid ${renk}40`,
      fontSize: '.72rem',
    }}>
      <span style={{ color: 'var(--muted)' }}>{etiket}:</span>
      <b style={{ color: renk }}>{fmt(deger)}</b>
    </span>
  );

  const renkGetir = (v) => v > 0 ? '#22C55E' : v < 0 ? '#EF4444' : '#888';

  return (
    <div
      onClick={() => setPage('karsilastirma')}
      style={{
        cursor: 'pointer',
        padding: '10px 14px',
        marginBottom: 16,
        background: 'linear-gradient(90deg,rgba(27,79,138,.08),rgba(201,168,76,.08))',
        border: `1px solid ${reelKirmizi ? 'rgba(239,68,68,.3)' : 'rgba(201,168,76,.2)'}`,
        borderRadius: 10,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}
      title="Detay için tıklayın"
    >
      <span style={{ fontSize: '1.1rem' }}>📊</span>
      <span style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--gold)' }}>Reel Performans (12 ay):</span>
      {chip('Kira', kira, renkGetir(kira))}
      {chip('TÜFE', tufe, renkGetir(-tufe))}
      {chip('Altın', altin, renkGetir(altin))}
      {chip('USD', usd, renkGetir(usd))}
      {chip('BİST', bist, renkGetir(bist))}
      <span style={{
        marginLeft: 'auto',
        padding: '4px 10px', borderRadius: 99, fontSize: '.72rem', fontWeight: 700,
        background: reelKirmizi ? 'rgba(239,68,68,.12)' : 'rgba(34,197,94,.12)',
        color: reelKirmizi ? 'var(--red)' : 'var(--green)',
        border: `1px solid ${reelKirmizi ? 'var(--red)' : 'var(--green)'}`,
      }}>
        {reelKirmizi ? '🔴' : '🟢'} Reel {fmt(reelVsTufe)}
      </span>
    </div>
  );
}

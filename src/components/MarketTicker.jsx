/**
 * @file components/MarketTicker.jsx
 * @description Canlı piyasa ticker — ALTIN solda başta, 2dk auto-refresh
 */
import { useStore } from '../store/app';
import { piyasaVerisiCek } from '../core/marketData';

const ok = (t) => t > 0 ? '▲' : t < 0 ? '▼' : '–';
const okRenk = (t) => t > 0 ? '#22C55E' : t < 0 ? '#EF4444' : '#888';

function formatSayi(n, basamak = 2) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: basamak, maximumFractionDigits: basamak }).format(n);
}

function saatFormat(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '—';
  }
}

function trendHesap(yeni, eski) {
  if (yeni == null || eski == null) return 0;
  if (yeni > eski) return 1;
  if (yeni < eski) return -1;
  return 0;
}

export default function MarketTicker() {
  const { marketData } = useStore();
  const m = marketData || {};
  const o = m.onceki || {};

  const items = [
    { k: 'ALTIN/gr',  v: m.altinGram,  b: 0, t: trendHesap(m.altinGram, o.altinGram), renk: '#C9A84C' },
    { k: 'USD/TL',    v: m.usd,        b: 2, t: trendHesap(m.usd, o.usd),             renk: '#22C55E' },
    { k: 'EUR/TL',    v: m.eur,        b: 2, t: trendHesap(m.eur, o.eur),             renk: '#1B4F8A' },
    { k: 'GÜMÜŞ/gr',  v: m.gumusGram,  b: 2, t: trendHesap(m.gumusGram, o.gumusGram), renk: '#C0C0C0' },
    { k: 'GBP/TL',    v: m.gbp,        b: 2, t: trendHesap(m.gbp, o.gbp),             renk: '#8B5CF6' },
    { k: 'BTC/TL',    v: m.btc,        b: 0, t: trendHesap(m.btc, o.btc),             renk: '#F59E0B' },
    { k: 'BIST100',   v: m.bist100,    b: 0, t: trendHesap(m.bist100, o.bist100),     renk: '#3B82F6' },
    { k: 'ENFLASYON', v: m.enflasyon, b: 1, t: 0, renk: '#EF4444', suffix: '%' },
  ];

  const durum = m.hata === 'cache' ? 'cache'
    : m.hata ? 'hata'
    : m.sonGuncelleme ? 'ok'
    : 'yukleniyor';

  return (
    <div className="ticker" style={{ display: 'flex', alignItems: 'center', gap: 14, overflowX: 'auto', paddingRight: 16 }}>
      {items.map(i => (
        <span key={i.k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          <span style={{ color: 'var(--dim)', fontSize: '.7rem' }}>{i.k}</span>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: i.renk }}>
            {i.k === 'BIST100' || i.k === 'BTC/TL' ? '' : (i.k === 'ENFLASYON' ? '' : '₺')}
            {formatSayi(i.v, i.b)}
            {i.suffix || ''}
          </span>
          {i.t !== 0 && (
            <span style={{ color: okRenk(i.t), fontSize: '.7rem' }}>{ok(i.t)}</span>
          )}
        </span>
      ))}
      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.68rem', color: 'var(--dim)' }}>
        {durum === 'ok' && <>✓ {saatFormat(m.sonGuncelleme)}</>}
        {durum === 'cache' && <>📦 cache · {saatFormat(m.sonGuncelleme)}</>}
        {durum === 'hata' && <>⚠ veri alınamadı</>}
        {durum === 'yukleniyor' && <>⏳ yükleniyor</>}
        <button
          onClick={() => piyasaVerisiCek()}
          title="Manuel yenile"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--gold)', fontSize: '.8rem', padding: 0,
          }}
        >🔄</button>
      </span>
    </div>
  );
}

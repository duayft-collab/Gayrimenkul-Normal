/**
 * @file pages/Harita.jsx
 * @description Tüm mülkler haritada pin — Leaflet CDN vanilla (react-leaflet yok)
 */
import { useEffect, useRef, useState, useMemo } from 'react';
import { useStore } from '../store/app';
import { Topbar } from '../components/Layout';
import { tumIller } from '../core/konum';

const IL_COORD = {
  'İstanbul': [41.0082, 28.9784],
  'Ankara':   [39.9334, 32.8597],
  'İzmir':    [38.4237, 27.1428],
};

const DURUM_RENK = {
  sahip:    '#C9A84C',
  satilik:  '#22C55E',
  satildi:  '#666',
  kiralik:  '#1B4F8A',
  kirada:   '#8B5CF6',
};

function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(window.L); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });
}

const fmtTL = (v) => '₺' + new Intl.NumberFormat('tr-TR').format(v || 0);

export default function Harita() {
  const { mulkler, setPage } = useStore();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const [filtreIl, setFiltreIl] = useState('');
  const [filtreDurum, setFiltreDurum] = useState('');
  const [hazir, setHazir] = useState(false);

  const aktif = useMemo(() => (mulkler || []).filter(m => !m.isDeleted), [mulkler]);
  const filtreli = useMemo(() => {
    return aktif.filter(m =>
      (!filtreIl || m.il === filtreIl) &&
      (!filtreDurum || m.durum === filtreDurum)
    );
  }, [aktif, filtreIl, filtreDurum]);

  useEffect(() => {
    (async () => {
      const L = await loadLeaflet();
      if (!mapRef.current || mapInstance.current) { setHazir(true); return; }
      const map = L.map(mapRef.current).setView([39.9334, 32.8597], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);
      mapInstance.current = map;
      setHazir(true);
    })();
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Marker güncelle
  useEffect(() => {
    if (!hazir || !mapInstance.current || !window.L) return;
    const L = window.L;
    // Eski marker'ları sil
    markersRef.current.forEach(m => mapInstance.current.removeLayer(m));
    markersRef.current = [];

    const bounds = [];
    for (const m of filtreli) {
      let lat = m.lat, lng = m.lng;
      if ((!lat || !lng) && m.il && IL_COORD[m.il]) {
        // Fallback: il merkezi + rastgele offset (görsel ayrıştırma için)
        const seed = (m.id || '').charCodeAt(0) || 0;
        lat = IL_COORD[m.il][0] + ((seed % 20) - 10) * 0.005;
        lng = IL_COORD[m.il][1] + ((seed % 17) - 8) * 0.005;
      }
      if (!lat || !lng) continue;

      const renk = DURUM_RENK[m.durum] || '#888';
      const icon = L.divIcon({
        html: `<div style="background:${renk};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
        className: 'mulk-pin', iconSize: [14, 14],
      });
      const marker = L.marker([lat, lng], { icon }).addTo(mapInstance.current);
      marker.bindPopup(`
        <div style="font-family:system-ui;min-width:200px">
          <div style="font-weight:700;font-size:14px;color:#C9A84C">${m.ad || 'İsimsiz'}</div>
          <div style="font-size:11px;color:#666">${m.il || ''} / ${m.ilce || ''}</div>
          <div style="margin:6px 0;font-size:12px">
            <b>Fiyat:</b> ${fmtTL(m.fiyat)}<br>
            <b>Alan:</b> ${(m.alan || 0).toLocaleString('tr-TR')} m²<br>
            <b>Durum:</b> ${m.durum || '—'}
          </div>
        </div>
      `);
      markersRef.current.push(marker);
      bounds.push([lat, lng]);
    }

    if (bounds.length > 0) {
      mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [filtreli, hazir]);

  const toplamDeger = filtreli.reduce((a, m) => a + (m.fiyat || 0), 0);

  return (
    <div>
      <Topbar title="🗺️ Harita" />
      <div className="page" style={{ paddingBottom: 90, position: 'relative' }}>
        {/* Filtre bar */}
        <div className="card" style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <select className="select" value={filtreIl} onChange={e => setFiltreIl(e.target.value)} style={{ width: 180 }}>
            <option value="">Tüm İller</option>
            {tumIller().map(il => <option key={il} value={il}>{il}</option>)}
          </select>
          <select className="select" value={filtreDurum} onChange={e => setFiltreDurum(e.target.value)} style={{ width: 180 }}>
            <option value="">Tüm Durumlar</option>
            {Object.keys(DURUM_RENK).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => { setFiltreIl(''); setFiltreDurum(''); }}>Temizle</button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, fontSize: '.75rem' }}>
            {Object.entries(DURUM_RENK).map(([k, v]) => (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: v, display: 'inline-block' }} />
                {k}
              </span>
            ))}
          </div>
        </div>

        {/* Harita */}
        <div style={{ position: 'relative' }}>
          <div ref={mapRef} style={{ height: 'calc(100vh - 260px)', minHeight: 400, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }} />
          {/* Mini kart */}
          <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 500,
            background: 'rgba(11,11,15,.92)', border: '1px solid var(--gold)',
            borderRadius: 8, padding: '10px 14px', fontSize: '.78rem', minWidth: 180,
          }}>
            <div style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: 4 }}>📊 Görüntülenen</div>
            <div>Mülk: <b>{filtreli.length}</b></div>
            <div>Toplam değer: <b>{fmtTL(toplamDeger)}</b></div>
            <button className="btn btn-sm btn-gold" style={{ marginTop: 8, width: '100%' }} onClick={() => setPage('portfolio')}>Listeye Dön</button>
          </div>
        </div>
      </div>
    </div>
  );
}

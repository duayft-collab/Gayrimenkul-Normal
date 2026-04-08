/**
 * @file components/KatKarsiligi/index.jsx
 * @description Kat Karşılığı modülü ana wrapper (izole scope)
 *              data-kk-module attribute'ü ile tüm .kk-* sınıflar scope'lanır.
 *              ADIM 1: tema altyapısı + skeleton ekran.
 */
import { useEffect, useRef, useState } from 'react';
import '../../styles/kat-karsiligi-tokens.css';
import ThemeToggle from './ThemeToggle';

export default function KatKarsiligiModul({ children }) {
  const wrapRef = useRef(null);
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    // İlk tema atamasını ThemeToggle yapar; burada sadece hazır flag
    setHazir(true);
  }, []);

  return (
    <div data-kk-module ref={wrapRef}>
      <header className="kk-header">
        <div className="kk-header-title">Kat Karşılığı</div>
        <input
          type="search"
          className="kk-header-search"
          placeholder="Proje, adres, müteahhit ara..."
          aria-label="Ara"
        />
        <div style={{ flex: 1 }} />
        <ThemeToggle />
      </header>

      <div className="kk-container">
        {children || (
          <div className="kk-card">
            <div className="kk-eyebrow" style={{ marginBottom: 8 }}>Adım 1 · Tema Altyapısı</div>
            <h1 className="kk-h1">
              Kat karşılığı projelerinizi buradan yönetin
            </h1>
            <p className="kk-sub" style={{ marginBottom: 24 }}>
              Sözleşme takibi, aşama ilerlemesi, hisseli sahipler, daire dağılımı,
              finansal hesaplar ve teslim tutanaklarını tek yerden izleyin.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="kk-btn kk-btn-primary">Proje Ekle</button>
              <button className="kk-btn kk-btn-ghost">Mevcut Projeleri Gör</button>
            </div>

            <div style={{ marginTop: 32, display: 'flex', gap: 8 }}>
              <span className="kk-badge kk-badge-green">● Yolunda</span>
              <span className="kk-badge kk-badge-amber">● Dikkat</span>
              <span className="kk-badge kk-badge-red">● Gecikme</span>
            </div>

            <div style={{
              marginTop: 32,
              padding: 16,
              background: 'var(--kk-bg-sunk)',
              border: '1px solid var(--kk-border)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--kk-text-2)',
            }}>
              <b style={{ color: 'var(--kk-text)' }}>KOD #0017 — Adım 1 tamam.</b><br />
              Tema altyapısı yüklü, design tokens aktif. Sonraki adımda Proje Hero Kartı + 7 segmentli aşama çubuğu + 4 büyük rakam KPI eklenecek.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

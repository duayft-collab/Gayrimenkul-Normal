/**
 * @file components/KatKarsiligi/ThemeToggle.jsx
 * @description Kat Karşılığı modülüne özel tema toggle
 *              localStorage'da 'kk-theme' key'i, module scope
 */
import { useEffect, useState } from 'react';

const KEY = 'kk-theme';

function detectInitial() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    // Global tema varsa onu takip et
    const global = document.documentElement.getAttribute('data-theme');
    if (global === 'light' || global === 'dark') return global;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {}
  return 'light';
}

export default function ThemeToggle({ onChange }) {
  const [tema, setTema] = useState(detectInitial);

  useEffect(() => {
    // Module wrapper'a yaz
    const wrap = document.querySelector('[data-kk-module]');
    if (wrap) wrap.setAttribute('data-kk-theme', tema);
    onChange?.(tema);
  }, [tema, onChange]);

  const cevir = () => {
    const yeni = tema === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, yeni); } catch {}
    setTema(yeni);
  };

  return (
    <button
      className="kk-theme-toggle"
      onClick={cevir}
      title={tema === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
      aria-label="Tema değiştir"
    >
      {tema === 'dark' ? (
        /* Sun icon */
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        /* Moon icon */
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

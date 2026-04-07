/**
 * @file core/temaStore.js
 * @description Light/Dark tema yönetimi — sistem algılama + localStorage persist
 */
import { create } from 'zustand';

const KEY = 'emlakpro_tema';

function detect() {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return s;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {}
  return 'light';
}

export const useTema = create((set) => ({
  tema: 'light',
  ayarla: (t) => {
    try { localStorage.setItem(KEY, t); } catch {}
    document.documentElement.setAttribute('data-theme', t);
    set({ tema: t });
  },
  cevir: () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const yeni = cur === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, yeni); } catch {}
    document.documentElement.setAttribute('data-theme', yeni);
    set({ tema: yeni });
  },
  baslat: () => {
    const t = detect();
    document.documentElement.setAttribute('data-theme', t);
    set({ tema: t });
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(KEY)) {
          const t2 = e.matches ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', t2);
          set({ tema: t2 });
        }
      });
    } catch {}
  },
}));

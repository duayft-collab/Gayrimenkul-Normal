/**
 * @file hooks/useSession.js
 * @description Oturum başlangıcı ve sayısı — sessionStorage'da persist
 * @anayasa K02 — yalnızca non-sensitive metadata saklanır (başlangıç zamanı + sayaç)
 */
import { useState } from 'react';

export function useSession() {
  const [baslangic] = useState(() => {
    try {
      let s = sessionStorage.getItem('oturumBaslangic');
      if (!s) {
        s = new Date().toISOString();
        sessionStorage.setItem('oturumBaslangic', s);
        const mevcut = parseInt(localStorage.getItem('oturumSayisi') || '0', 10);
        const yeni = (isNaN(mevcut) ? 0 : mevcut) + 1;
        localStorage.setItem('oturumSayisi', String(yeni));
      }
      return new Date(s);
    } catch {
      return new Date();
    }
  });

  const oturumSayisi = (() => {
    try {
      const n = parseInt(localStorage.getItem('oturumSayisi') || '1', 10);
      return isNaN(n) ? 1 : n;
    } catch {
      return 1;
    }
  })();

  return { baslangic, oturumSayisi };
}

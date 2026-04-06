/**
 * @file hooks/useClock.js
 * @description TR saat + tarih hook — her saniye güncellenen canlı saat
 */
import { useEffect, useState } from 'react';

export function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  return {
    saat: now.toLocaleTimeString('tr-TR'),
    tarih: now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }),
    timestamp: now.getTime(),
    dateObj: now,
  };
}

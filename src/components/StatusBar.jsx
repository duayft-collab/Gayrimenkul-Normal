/**
 * @file components/StatusBar.jsx
 * @description Global kalıcı status bar — canlı saat, Firestore stats, git SHA,
 *              oturum bilgisi, sayfa süresi (bug fix: pozitif süre).
 * @anayasa K02 hassas veri yok · K05 işlem sayaçları görünür · K14 PII içermez
 * @version 1.0.0 | 2026-04-06
 */
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { useClock } from '../hooks/useClock';
import { useSession } from '../hooks/useSession';

/* ═══ Formatlayıcılar ═══ */
const formatSure = (ms) => {
  if (!isFinite(ms) || ms < 0) return 'az önce';
  if (ms < 1000) return 'az önce';
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + 'sn';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'dk';
  const h = Math.floor(m / 60);
  return h + 'sa ' + (m % 60) + 'dk';
};

const formatHHMMSS = (ts) => {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleTimeString('tr-TR');
  } catch {
    return '—';
  }
};

const formatBoyut = (kb) => {
  if (!kb || kb <= 0) return '0 KB';
  if (kb < 1024) return kb + ' KB';
  return (kb / 1024).toFixed(1) + ' MB';
};

export default function StatusBar() {
  const user = useAuthStore(s => s.user);
  const firestoreStats = useStore(s => s.firestoreStats);
  const mulkler = useStore(s => s.mulkler);
  const kiralar = useStore(s => s.kiralar);
  const alarmlar = useStore(s => s.alarmlar);
  const page = useStore(s => s.page);

  const { saat, tarih, timestamp } = useClock();
  const { baslangic, oturumSayisi } = useSession();

  /* ═══ BUG FIX — Sayfa Süresi ═══
   * Eski bug: yanlış referans (Date.now() - toString) → negatif ms.
   * Düzeltme: useState lazy init ile mount anı sabitlenir,
   *           sayfa değişiminde useEffect ile reset.
   */
  const [mountTime, setMountTime] = useState(() => Date.now());
  useEffect(() => { setMountTime(Date.now()); }, [page]);

  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  /* Login'de render etme */
  if (!user) return null;

  const stats = firestoreStats || { okumaSayisi: 0, yazmaSayisi: 0, silmeSayisi: 0, sonIslem: null, tahminiBoyut: 0 };
  const sayfaSure = formatSure(timestamp - mountTime);
  const toplamBelge = (mulkler?.length || 0) + (kiralar?.length || 0) + (alarmlar?.length || 0);
  const boyutStr = formatBoyut(stats.tahminiBoyut || toplamBelge * 2);

  const gitSha = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GIT_SHA) || 'dev';
  const buildDate = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BUILD_DATE) || null;
  const buildFmt = buildDate
    ? new Date(buildDate).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—';

  const oturumBasStr = baslangic.toLocaleTimeString('tr-TR');

  return (
    <>
      <div className="app-status-bar" role="status" aria-live="polite">
        {/* ═════ SOL ═════ */}
        <div className="sb-col sb-left">
          <div className="sb-row">
            <span className="sb-dot" style={{ background: stats.sonIslem ? '#22C55E' : '#555' }} />
            <span>Firestore: ↑{formatHHMMSS(stats.sonIslem)} · {stats.okumaSayisi}/{stats.yazmaSayisi} · {boyutStr}</span>
          </div>
          <div className="sb-row">
            <span className="sb-dot" style={{ background: '#C9A84C' }} />
            <span>Storage: ↑{formatHHMMSS(stats.sonIslem)} · {toplamBelge} belge</span>
          </div>
          <div className="sb-row sb-dim">
            v{gitSha} · {buildFmt}
          </div>
          <div className="sb-row sb-dim">
            Bağ: {online ? '✓ online' : '✗ offline'} · Auth: {user ? '✓' : '✗'} · Sayfa: {sayfaSure} · Sorgu: {formatHHMMSS(stats.sonIslem)}
          </div>
          <div className="sb-row sb-dim">
            Kullanıcı: 1 aktif · {oturumSayisi} oturum
          </div>
        </div>

        {/* ═════ ORTA ═════ */}
        <div className="sb-col sb-center">
          <div className="sb-brand">🔒 Gizli &amp; Şirkete Özel</div>
        </div>

        {/* ═════ SAĞ ═════ */}
        <div className="sb-col sb-right">
          <div>Çalışma: <b style={{ color: '#C9A84C' }}>{user.workspaceId || '—'}</b></div>
          <div>Oturum: {oturumBasStr}</div>
          <div>Son: {formatHHMMSS(stats.sonIslem)}</div>
          <div className="sb-dim">{tarih} · {saat}</div>
        </div>
      </div>

      <style>{`
        .app-status-bar {
          position: fixed;
          bottom: 0;
          left: var(--sidebar, 0);
          right: 0;
          z-index: 1000;
          background: #0B0B0F;
          border-top: 1px solid rgba(201, 168, 76, 0.2);
          padding: 6px 16px;
          display: flex;
          gap: 16px;
          font-size: 11px;
          line-height: 1.4;
          color: #C9A84C;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          pointer-events: none;
        }
        .sb-col { display: flex; flex-direction: column; gap: 1px; }
        .sb-left { flex: 1 1 auto; min-width: 0; }
        .sb-center {
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border-left: 1px solid rgba(201, 168, 76, 0.12);
          border-right: 1px solid rgba(201, 168, 76, 0.12);
        }
        .sb-right { flex: 0 0 auto; align-items: flex-end; text-align: right; }
        .sb-row { display: flex; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sb-dim { color: #888; }
        .sb-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-right: 6px;
          flex-shrink: 0;
        }
        .sb-brand { font-weight: 700; color: #C9A84C; letter-spacing: 0.5px; }
        @media (max-width: 768px) {
          .app-status-bar {
            left: 0;
            font-size: 10px;
            padding: 4px 8px;
            gap: 8px;
          }
          .sb-left > .sb-row:not(:first-child):not(:last-child) { display: none; }
          .sb-right > div:not(:last-child):not(:first-child) { display: none; }
          .sb-center { padding: 0 6px; }
        }
      `}</style>
    </>
  );
}

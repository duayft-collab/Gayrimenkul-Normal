/**
 * @file components/TopNav.jsx
 * @description Refined top navigation — pill menu + cmd button + avatar
 */
import { useEffect, useState } from 'react';
import { useStore } from '../store/app';
import { useAuthStore } from '../store/auth';
import { Building, Search, Bell } from './icons';

const MENU = [
  { id: 'dashboard',    label: 'Pano' },
  { id: 'portfolio',    label: 'Mülkler' },
  { id: 'kiracilar',    label: 'Kiracılar' },
  { id: 'odemeler',     label: 'Ödemeler' },
  { id: 'vergiPaneli',  label: 'Vergi' },
  { id: 'hesapMakineleri', label: 'Hesaplar' },
  { id: 'raporlar',     label: 'Raporlar' },
];

export default function TopNav() {
  const { page, setPage, bildirimler } = useStore();
  const { user } = useAuthStore();

  const okunmamis = (bildirimler || []).filter(b => !b.okundu && !b.isDeleted).length;
  const initials = (user?.name || user?.email || 'KU')
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Cmd+K palette tetikle
  const cmdAc = () => {
    const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true });
    window.dispatchEvent(e);
  };

  return (
    <nav className="nav">
      <div className="nav-inner">
        <a className="brand" onClick={() => setPage('dashboard')}>
          <div className="brand-mark">
            <Building size={16} />
          </div>
          <div className="brand-name">Emlak<em>Pro</em></div>
        </a>

        <div className="nav-menu">
          {MENU.map(m => (
            <button
              key={m.id}
              className={page === m.id ? 'active' : ''}
              onClick={() => setPage(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="nav-actions">
          <button className="cmd-btn" onClick={cmdAc} title="Komut Paleti">
            <Search size={13} />
            <span>Ara</span>
            <kbd>⌘K</kbd>
          </button>
          <button className="icon-btn" onClick={() => setPage('bildirimler')} title="Bildirimler">
            <Bell size={16} />
            {okunmamis > 0 && <span className="pip" />}
          </button>
          <div className="avatar" title={user?.name || user?.email}>
            {initials}
          </div>
        </div>
      </div>
    </nav>
  );
}

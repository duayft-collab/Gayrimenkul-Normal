/**
 * @file components/ThemeToggle.jsx
 * @description Floating theme toggle — sağ alt köşe
 */
import { useTema } from '../core/temaStore';
import { Moon, Sun } from './icons';

export default function ThemeToggle() {
  const { tema, cevir } = useTema();
  return (
    <button
      className="theme-toggle"
      onClick={cevir}
      title={tema === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
      aria-label="Tema değiştir"
    >
      {tema === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

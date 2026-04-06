/**
 * @file components/IlIlceSecici.jsx
 * @description Ortak il/ilçe cascade select — 81 il + 973 ilçe tam liste
 */
import { useMemo } from 'react';
import { tumIller, ilceleriGetir } from '../core/konum';

export default function IlIlceSecici({
  il, ilce, onChange, required = false,
  layout = 'grid', // 'grid' | 'inline'
  ilLabel = 'İl',
  ilceLabel = 'İlçe',
  disabled = false,
}) {
  const iller = useMemo(() => tumIller(), []);
  const ilceler = useMemo(() => (il ? ilceleriGetir(il) : []), [il]);

  const setIl = (e) => {
    const yeniIl = e.target.value;
    onChange?.({ il: yeniIl, ilce: '' });
  };
  const setIlce = (e) => {
    onChange?.({ il, ilce: e.target.value });
  };

  if (layout === 'inline') {
    return (
      <>
        <select
          className="select"
          value={il || ''}
          onChange={setIl}
          required={required}
          disabled={disabled}
          style={{ flex: 1 }}
        >
          <option value="">{ilLabel}</option>
          {iller.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
        <select
          className="select"
          value={ilce || ''}
          onChange={setIlce}
          required={required}
          disabled={disabled || !il}
          style={{ flex: 1, opacity: !il ? 0.5 : 1 }}
        >
          <option value="">{!il ? 'Önce il seç' : ilceLabel}</option>
          {ilceler.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
      </>
    );
  }

  return (
    <div className="fgrid2">
      <div className="fgroup">
        <label className="flbl">{ilLabel}{required ? ' *' : ''}</label>
        <select
          className="select"
          value={il || ''}
          onChange={setIl}
          required={required}
          disabled={disabled}
        >
          <option value="">— Seçiniz —</option>
          {iller.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
      <div className="fgroup">
        <label className="flbl">{ilceLabel}{required ? ' *' : ''}</label>
        <select
          className="select"
          value={ilce || ''}
          onChange={setIlce}
          required={required}
          disabled={disabled || !il}
          style={{ opacity: !il ? 0.6 : 1 }}
        >
          <option value="">{!il ? 'Önce il seçin' : '— Seçiniz —'}</option>
          {ilceler.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
    </div>
  );
}

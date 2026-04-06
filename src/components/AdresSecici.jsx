/**
 * @file components/AdresSecici.jsx
 * @description İl/İlçe/Mahalle adres formu — 81 il + 973 ilçe IlIlceSecici kullanır
 */
import IlIlceSecici from './IlIlceSecici';

export default function AdresSecici({ deger, setDeger }) {
  const d = deger || {};

  const konumDegis = ({ il, ilce }) => setDeger({ ...d, il, ilce });
  const setField = (k) => (e) => setDeger({ ...d, [k]: e.target.value });

  return (
    <div>
      <IlIlceSecici il={d.il} ilce={d.ilce} onChange={konumDegis} />
      <div className="fgrid2">
        <div className="fgroup">
          <label className="flbl">Mahalle</label>
          <input className="input" value={d.mahalle || ''} onChange={setField('mahalle')} />
        </div>
        <div className="fgroup">
          <label className="flbl">Ada / Parsel</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="input" value={d.ada || ''} onChange={setField('ada')} placeholder="Ada" />
            <input className="input" value={d.parsel || ''} onChange={setField('parsel')} placeholder="Parsel" />
          </div>
        </div>
      </div>
      <div className="fgroup">
        <label className="flbl">Açık Adres</label>
        <input className="input" value={d.fullAdres || ''} onChange={setField('fullAdres')} placeholder="Sokak, kapı no, daire no" />
      </div>
      <div className="fgrid2">
        <div className="fgroup">
          <label className="flbl">Enlem (lat)</label>
          <input type="number" step="0.0001" className="input" value={d.lat || ''} onChange={e => setDeger({ ...d, lat: parseFloat(e.target.value) || null })} />
        </div>
        <div className="fgroup">
          <label className="flbl">Boylam (lng)</label>
          <input type="number" step="0.0001" className="input" value={d.lng || ''} onChange={e => setDeger({ ...d, lng: parseFloat(e.target.value) || null })} />
        </div>
      </div>
    </div>
  );
}

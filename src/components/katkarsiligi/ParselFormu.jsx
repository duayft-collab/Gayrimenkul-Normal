/**
 * @file components/katkarsiligi/ParselFormu.jsx
 * @description Çoklu parsel girişi — il/ilçe cascade, tevhit/ifraz
 */
import { tumIller, ilceleriGetir } from '../../core/konum';

const BOS_PARSEL = { il: '', ilce: '', mahalle: '', ada: '', parsel: '', alan: 0, tapuNo: '', cins: 'Arsa' };

export default function ParselFormu({ parseller, setParseller, tevhit, setTevhit }) {
  const iller = tumIller();

  const guncelle = (i, key, val) => {
    const yeni = [...parseller];
    yeni[i] = { ...yeni[i], [key]: val };
    if (key === 'il') yeni[i].ilce = ''; // il değişirse ilçeyi sıfırla
    setParseller(yeni);
  };

  const ekle = () => setParseller([...parseller, { ...BOS_PARSEL }]);
  const sil = (i) => {
    if (parseller.length === 1) return;
    setParseller(parseller.filter((_, idx) => idx !== i));
  };

  const toplamAlan = parseller.reduce((a, p) => a + (Number(p.alan) || 0), 0);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 600, color: 'var(--gold)' }}>
          📋 Parsel Bilgileri ({parseller.length})
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem', color: 'var(--muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={tevhit} onChange={e => setTevhit(e.target.checked)} />
          Tevhit (birleştir)
        </label>
      </div>

      {parseller.map((p, i) => {
        const ilceler = p.il ? ilceleriGetir(p.il) : [];
        return (
          <div key={i} style={{
            border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 10,
            background: 'rgba(255,255,255,.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '.72rem', color: 'var(--gold)', fontWeight: 600 }}>Parsel #{i + 1}</span>
              {parseller.length > 1 && (
                <button className="btn btn-sm btn-danger" onClick={() => sil(i)}>− Sil</button>
              )}
            </div>

            <div className="fgrid2">
              <div className="fgroup">
                <label className="flbl">İl</label>
                <select className="select" value={p.il} onChange={e => guncelle(i, 'il', e.target.value)}>
                  <option value="">— Seçiniz —</option>
                  {iller.map(il => <option key={il} value={il}>{il}</option>)}
                </select>
              </div>
              <div className="fgroup">
                <label className="flbl">İlçe</label>
                <select className="select" value={p.ilce} onChange={e => guncelle(i, 'ilce', e.target.value)} disabled={!p.il}>
                  <option value="">— Seçiniz —</option>
                  {ilceler.map(il => <option key={il} value={il}>{il}</option>)}
                </select>
              </div>
            </div>

            <div className="fgrid2">
              <div className="fgroup">
                <label className="flbl">Mahalle</label>
                <input className="input" value={p.mahalle} onChange={e => guncelle(i, 'mahalle', e.target.value)} />
              </div>
              <div className="fgroup">
                <label className="flbl">Alan (m²)</label>
                <input type="number" className="input" value={p.alan} onChange={e => guncelle(i, 'alan', parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            <div className="fgrid3">
              <div className="fgroup">
                <label className="flbl">Ada</label>
                <input className="input" value={p.ada} onChange={e => guncelle(i, 'ada', e.target.value)} />
              </div>
              <div className="fgroup">
                <label className="flbl">Parsel</label>
                <input className="input" value={p.parsel} onChange={e => guncelle(i, 'parsel', e.target.value)} />
              </div>
              <div className="fgroup">
                <label className="flbl">Tapu No</label>
                <input className="input" value={p.tapuNo} onChange={e => guncelle(i, 'tapuNo', e.target.value)} />
              </div>
            </div>

            <div className="fgroup" style={{ marginBottom: 0 }}>
              <label className="flbl">Cins</label>
              <select className="select" value={p.cins} onChange={e => guncelle(i, 'cins', e.target.value)}>
                <option>Arsa</option>
                <option>Tarla</option>
                <option>Bağ</option>
                <option>Bahçe</option>
                <option>Arsa+Bina</option>
              </select>
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={ekle}>+ Parsel Ekle</button>
        <div style={{ fontSize: '.78rem' }}>
          <span style={{ color: 'var(--muted)' }}>Toplam Alan: </span>
          <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{toplamAlan.toLocaleString('tr-TR')} m²</span>
        </div>
      </div>
    </div>
  );
}

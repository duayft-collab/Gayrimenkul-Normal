import { useEffect, useMemo, useRef } from 'react';
import { useStore } from '../store/app';
import { useAuthStore } from '../store/auth';
import { Topbar } from '../components/Layout';
import MarketTicker from '../components/MarketTicker';
import KarsilastirmaWidget from '../components/KarsilastirmaWidget';
import { ArrowRight, Plus } from '../components/icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { seedTestData } from '../core/seedData';
import { odemeTlKurus, gecikmisFiltre, yaklasanFiltre } from '../core/odemelerDb';

const fmtTL = (kurus) => '₺' + new Intl.NumberFormat('tr-TR').format(Math.round((kurus || 0) / 100));

const FMT = (n) => new Intl.NumberFormat('tr-TR').format(Math.round(n));

const CHART_DATA = [
  {ay:'Oca',deger:850},{ay:'Şub',deger:890},{ay:'Mar',deger:940},
  {ay:'Nis',deger:980},{ay:'May',deger:1050},{ay:'Haz',deger:1120},
  {ay:'Tem',deger:1200},{ay:'Ağu',deger:1280},{ay:'Eyl',deger:1360},
  {ay:'Eki',deger:1440},{ay:'Kas',deger:1530},{ay:'Ara',deger:1620},
  {ay:'Şu26',deger:1680},{ay:'Mar26',deger:1750},
];

const PIE_DATA = [
  {name:'Daire',value:13400000,color:'#1B4F8A'},
  {name:'Ofis',value:9200000,color:'#C9A84C'},
  {name:'Arsa',value:4100000,color:'#22C55E'},
  {name:'Diğer',value:2800000,color:'#3B82F6'},
];

export default function Dashboard() {
  const { mulkler, kiralar, alarmlar, odemeler, kiracilar, setPage } = useStore();
  const { user } = useAuthStore();
  const seeded = useRef(false);

  useEffect(() => {
    if (import.meta.env.DEV && !seeded.current && mulkler.length === 0) {
      seeded.current = true;
      seedTestData().catch(e => console.error('Seed hatası:', e));
    }
  }, [mulkler.length]);

  /* Kira geliri — kurus bazlı */
  const kiraGelirKurus = useMemo(() => {
    const ayBas = new Date(); ayBas.setDate(1); ayBas.setHours(0, 0, 0, 0);
    const ayBit = new Date(ayBas); ayBit.setMonth(ayBit.getMonth() + 1);
    let beklenen = 0, tahsil = 0;
    for (const o of (odemeler || [])) {
      if (o.isDeleted || o.tip !== 'kira') continue;
      const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
      if (v >= ayBas && v < ayBit) {
        const tl = odemeTlKurus(o);
        beklenen += tl;
        if (o.durum === 'odendi') tahsil += tl;
      }
    }
    return { beklenen, tahsil };
  }, [odemeler]);

  const gecikmisKurus = useMemo(() => {
    return gecikmisFiltre(odemeler).reduce((a, o) => a + odemeTlKurus(o), 0);
  }, [odemeler]);

  const yaklasanOdemeler = useMemo(() => yaklasanFiltre(odemeler, 7), [odemeler]);

  /* Mülk başına gelir top 5 */
  const topMulkGelir = useMemo(() => {
    const map = {};
    for (const o of (odemeler || [])) {
      if (o.isDeleted || o.tip !== 'kira' || o.durum !== 'odendi') continue;
      map[o.mulkId] = (map[o.mulkId] || 0) + odemeTlKurus(o);
    }
    return Object.entries(map)
      .map(([mulkId, tl]) => ({
        ad: ((mulkler || []).find(m => m.id === mulkId)?.ad || 'Bilinmeyen').slice(0, 18),
        gelir: Math.round(tl / 100),
      }))
      .sort((a, b) => b.gelir - a.gelir)
      .slice(0, 5);
  }, [odemeler, mulkler]);

  const totalVal    = mulkler.reduce((s,p) => s + (p.currentPrice||p.fiyat||0), 0) || 16700000;
  const totalBuy    = mulkler.reduce((s,p) => s + (p.buyPrice||0), 0)     || 11600000;
  const monthlyRent = Math.round(kiraGelirKurus.tahsil / 100) || 83000;
  const unread      = alarmlar.filter(a => !a.isRead).length || 3;
  const roi         = totalBuy > 0 ? ((totalVal - totalBuy) / totalBuy * 100) : 44.2;
  const tahsilOran  = kiraGelirKurus.beklenen > 0 ? Math.round(kiraGelirKurus.tahsil / kiraGelirKurus.beklenen * 100) : 0;
  const aktifKiraSayisi = (kiralar || []).filter(k => !k.isDeleted && k.durum === 'dolu').length;

  const ad = (user?.name || user?.email || '').split(/\s+/)[0] || 'Hoş geldiniz';
  const bugun = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
  const aktifKira = (kiralar || []).filter(k => !k.isDeleted && k.durum === 'dolu').length;
  const aktifMulk = (mulkler || []).filter(m => !m.isDeleted).length;

  return (
    <div>
      {/* Refined Hero — yeni tasarım dili */}
      <div className="hero">
        <div>
          <div className="eyebrow">PANO · {bugun}</div>
          <h1 className="serif hero-title">
            İyi günler, <em>{ad}</em>
          </h1>
          <p className="hero-sub">
            Bugün portföyünüzde {aktifMulk || 0} mülk, {aktifKira || 0} aktif kira sözleşmesi var.
            Bu ay tahsil oranınız son 12 ayın en yüksek seviyesinde.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => setPage('portfolio')}>
              <Plus size={14} /> Yeni Mülk Ekle
            </button>
            <button className="btn btn-ghost" onClick={() => setPage('raporlar')}>
              Rapor Görüntüle <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Bugünün Listesi</div>
          <h3 className="serif" style={{ fontSize: '1.1rem', marginBottom: 14 }}>3 görev</h3>
          {[
            { ad: 'Kira tahsilatı kontrol', alt: 'Bugün vade · 4 ödeme', tip: 'success' },
            { ad: 'Vergi beyanname taslağı', alt: '25 Mart vade', tip: 'warn' },
            { ad: 'Sözleşme yenileme', alt: 'Kadıköy Daire · 15 gün', tip: 'gold' },
          ].map((t, i) => (
            <div key={i} style={{
              padding: '10px 0',
              borderBottom: i < 2 ? '1px solid var(--line-2)' : 'none',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: t.tip === 'success' ? 'var(--emerald)' :
                           t.tip === 'warn' ? '#f59e0b' : 'var(--accent)',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{t.ad}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{t.alt}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Topbar title="Dashboard" />
      <MarketTicker />
      <div className="page" style={{paddingBottom:40}}>

        <KarsilastirmaWidget />

        {/* Quote */}
        <div style={{background:'linear-gradient(90deg,rgba(27,79,138,.15),rgba(201,168,76,.08))',
          border:'1px solid rgba(201,168,76,.25)',borderRadius:10,padding:'12px 16px',
          marginBottom:20,display:'flex',gap:10,alignItems:'center'}}>
          <span>💡</span>
          <div>
            <div style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:'.88rem',color:'#E8C96A'}}>
              "Araziyi satın al — artık üretmiyorlar."
            </div>
            <div style={{fontSize:'.7rem',color:'var(--muted)',marginTop:2}}>— Will Rogers, Yatırımcı</div>
          </div>
        </div>

        {/* KPI */}
        <div className="g4" style={{marginBottom:20}}>
          {[
            {lbl:'Toplam Portföy',val:`₺${FMT(totalVal/100)} TL`,sub:`${mulkler.length||4} mülk`,color:'var(--blue)',ico:'🏠'},
            {lbl:'Toplam Getiri',val:`%${roi.toFixed(1)}`,sub:`₺${FMT((totalVal-totalBuy)/100)} TL kar`,color:'var(--green)',ico:'📈'},
            {lbl:'Bu Ay Kira (Tahsil)',val:`₺${FMT(monthlyRent)}`,sub:`${aktifKiraSayisi||2} aktif · %${tahsilOran} tahsil`,color:'var(--gold)',ico:'🔑'},
            {lbl:'Gecikmiş / Alarm',val:gecikmisKurus > 0 ? fmtTL(gecikmisKurus) : unread.toString(),sub: gecikmisKurus > 0 ? 'Gecikmiş ödeme' : 'Acil işlem',color:'var(--red)',ico:'🔔'},
          ].map((k,i)=>(
            <div key={i} className="kpi" style={{'--kc':k.color}}>
              <div className="kpi-lbl">{k.lbl}</div>
              <div className="kpi-val" style={{color:k.color}}>{k.val}</div>
              <div className="kpi-sub" style={{color:k.color}}>{k.sub}</div>
              <div className="kpi-ico">{k.ico}</div>
            </div>
          ))}
        </div>

        {/* Grafikler */}
        <div className="g2" style={{marginBottom:20}}>
          <div className="card">
            <div style={{fontFamily:'var(--serif)',fontSize:'.95rem',fontWeight:600,marginBottom:4}}>Portföy Değer Seyri</div>
            <div style={{fontSize:'.72rem',color:'var(--muted)',marginBottom:14}}>Son 14 ay (Milyon TL)</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={CHART_DATA} margin={{top:4,right:4,bottom:0,left:-20}}>
                <defs>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1B4F8A" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#1B4F8A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                <XAxis dataKey="ay" tick={{fill:'#4A5A72',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#4A5A72',fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:'#1A2540',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,fontSize:11}}
                  formatter={v=>[v+'M TL','Değer']}/>
                <Area type="monotone" dataKey="deger" stroke="#1B4F8A" strokeWidth={2} fill="url(#ag)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div style={{fontFamily:'var(--serif)',fontSize:'.95rem',fontWeight:600,marginBottom:14}}>Portföy Dağılımı</div>
            <div style={{display:'flex',alignItems:'center',gap:16}}>
              <PieChart width={130} height={130}>
                <Pie data={PIE_DATA} cx={60} cy={60} innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value">
                  {PIE_DATA.map((d,i)=><Cell key={i} fill={d.color}/>)}
                </Pie>
              </PieChart>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:7}}>
                {PIE_DATA.map((d,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:7,fontSize:'.76rem'}}>
                    <div style={{width:8,height:8,borderRadius:2,background:d.color,flexShrink:0}}/>
                    <span style={{flex:1,color:'var(--muted)'}}>{d.name}</span>
                    <span style={{fontFamily:'var(--mono)',fontSize:'.72rem'}}>₺{FMT(d.value/10000)}M</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Kira Geliri Paneli */}
        <div className="g2" style={{marginBottom:20}}>
          <div className="card">
            <div style={{fontFamily:'var(--serif)',fontSize:'.95rem',fontWeight:600,marginBottom:10}}>💰 Bu Ay: Beklenen vs Tahsil</div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'.82rem',marginBottom:6}}>
              <span>Beklenen: <b>{fmtTL(kiraGelirKurus.beklenen)}</b></span>
              <span>Tahsil: <b style={{color:'var(--green)'}}>{fmtTL(kiraGelirKurus.tahsil)}</b></span>
            </div>
            <div className="prog"><div className="prog-fill" style={{width:`${tahsilOran}%`,background:'linear-gradient(90deg,#22C55E,#C9A84C)'}}/></div>
            <div style={{fontSize:'.72rem',color:'var(--muted)',marginTop:6}}>%{tahsilOran} tahsil edildi</div>
            {gecikmisKurus > 0 && (
              <div style={{marginTop:10,padding:8,background:'rgba(239,68,68,.1)',borderLeft:'3px solid var(--red)',borderRadius:4,fontSize:'.78rem'}}>
                ⚠️ Gecikmiş: <b style={{color:'var(--red)'}}>{fmtTL(gecikmisKurus)}</b>
                <button className="btn btn-sm btn-ghost" style={{marginLeft:8}} onClick={() => setPage('rental')}>Görüntüle</button>
              </div>
            )}
          </div>
          <div className="card">
            <div style={{fontFamily:'var(--serif)',fontSize:'.95rem',fontWeight:600,marginBottom:10}}>📈 Mülk Başına Gelir (Top 5)</div>
            {topMulkGelir.length === 0 ? (
              <div style={{fontSize:'.78rem',color:'var(--muted)'}}>Henüz tahsil edilmiş ödeme yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={topMulkGelir} layout="vertical" margin={{top:0,right:10,bottom:0,left:80}}>
                  <XAxis type="number" tick={{fill:'#666',fontSize:10}} tickFormatter={(v) => (v/1000).toFixed(0) + 'K'} />
                  <YAxis dataKey="ad" type="category" tick={{fill:'#888',fontSize:10}} width={80} />
                  <Tooltip contentStyle={{background:'#1A2540',border:'1px solid #333',fontSize:11}} formatter={(v) => '₺' + v.toLocaleString('tr-TR')} />
                  <Bar dataKey="gelir" fill="#C9A84C" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Yaklaşan Vadeler */}
        {yaklasanOdemeler.length > 0 && (
          <div className="card" style={{marginBottom:20}}>
            <div style={{fontFamily:'var(--serif)',fontSize:'.95rem',fontWeight:600,marginBottom:10}}>📅 Yaklaşan Vadeler (7 gün)</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {yaklasanOdemeler.slice(0, 5).map(o => {
                const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi);
                const k = (kiracilar || []).find(x => x.id === o.kiraciId);
                return (
                  <div key={o.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 10px',background:'var(--surface2)',borderRadius:6,fontSize:'.8rem'}}>
                    <span>{v.toLocaleDateString('tr-TR')} · <b>{k?.adSoyad || '—'}</b></span>
                    <span style={{color:'var(--gold)',fontWeight:600}}>{fmtTL(odemeTlKurus(o))}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Alarmlar */}
        <div className="card">
          <div style={{fontFamily:'var(--serif)',fontSize:'.95rem',fontWeight:600,marginBottom:14}}>Aktif Alarmlar</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[
              {title:'DASK Yenileme',desc:'Kadıköy Ofis — Poliçe 45 gün içinde sona eriyor',days:12,sev:'danger'},
              {title:'Kira Artış Zamanı',desc:'Kalamış Daire — TÜFE artışı uygulanabilir',days:16,sev:'warning'},
              {title:'Emlak Vergisi 1. Taksit',desc:'Tüm mülkler — Mayıs 2026',days:62,sev:'info'},
            ].map((a,i)=>(
              <div key={i} style={{padding:'10px 14px',borderRadius:10,background:'var(--surface2)',
                borderLeft:`3px solid var(--${a.sev==='danger'?'red':a.sev==='warning'?'amber':'info'})`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontWeight:600,fontSize:'.85rem'}}>{a.title}</span>
                  <span className={`badge b-${a.sev==='danger'?'red':a.sev==='warning'?'amber':'blue'}`}>
                    {a.days} gün
                  </span>
                </div>
                <div style={{fontSize:'.76rem',color:'var(--muted)',marginTop:3}}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

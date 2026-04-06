import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';

const NAV = [
  { section: 'ANA', items: [
    { id:'dashboard', label:'Dashboard', icon:'🏠' },
    { id:'portfolio', label:'Mülklerim', icon:'📋' },
    { id:'finance', label:'Finansal Analiz', icon:'📊' },
  ]},
  { section: 'MÜTEAHHİT', items: [
    { id:'katkarsiligi', label:'Kat Karşılığı', icon:'🏗️' },
  ]},
  { section: 'RADAR & TAKİP', items: [
    { id:'radar', label:'Gayrimenkul Radar', icon:'📡' },
    { id:'location', label:'Lokasyon İzleme', icon:'📍' },
  ]},
  { section: 'KİRA YÖNETİMİ', items: [
    { id:'rental', label:'Kira Takip', icon:'🔑' },
    { id:'lease', label:'Sözleşme Zekası', icon:'📄' },
    { id:'calculators', label:'Hesap Makineleri', icon:'🧮' },
    { id:'tax', label:'Vergi Hesaplama', icon:'⚖️' },
  ]},
  { section: 'BİLGİ & ARAÇLAR', items: [
    { id:'news', label:'Haberler', icon:'📰' },
    { id:'library', label:'Kütüphane', icon:'📚' },
    { id:'geo', label:'Konum Analizi', icon:'🗺️' },
    { id:'advisor', label:'AI Danışman', icon:'🤖' },
    { id:'construction', label:'İnşaat Takip', icon:'🏗️' },
    { id:'abroad', label:'Yurt Dışı', icon:'🌍' },
  ]},
  { section: 'SİSTEM', items: [
    { id:'users', label:'Kullanıcılar', icon:'👥' },
  ]},
  { section: 'AYARLAR', items: [
    { id:'settings', label:'Genel Ayarlar', icon:'⚙️' },
    { id:'anayasa', label:'Anayasa', icon:'⚖️' },
  ]},
];

export function Sidebar() {
  const { page, setPage } = useStore();
  const { user, logout } = useAuthStore();

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-title">🏠 AI Property OS</div>
        <div className="logo-sub">Duay Global Trade</div>
      </div>
      <nav className="nav">
        {NAV.map(sec => (
          <div key={sec.section}>
            <div className="nav-sec">{sec.section}</div>
            {sec.items.map(item => (
              <button key={item.id} className={`nav-btn ${page === item.id ? 'active' : ''}`}
                onClick={() => setPage(item.id)}>
                <span style={{width:18,textAlign:'center'}}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sb-foot">
        <div style={{fontWeight:600,color:'var(--muted)',marginBottom:2}}>{user?.name}</div>
        <div style={{marginBottom:8}}>{user?.role}</div>
        <button className="btn btn-ghost btn-sm" style={{width:'100%'}} onClick={logout}>
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}

export function Topbar({ title }) {
  const { user } = useAuthStore();
  const { alarmlar = [] } = useStore();
  const unread = alarmlar.filter(a => !a.isRead).length;

  return (
    <header className="topbar">
      <div style={{fontFamily:'var(--serif)',fontSize:'1rem',fontWeight:600}}>{title}</div>
      <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:12}}>
        {unread > 0 && (
          <div style={{position:'relative'}}>
            <span>🔔</span>
            <span style={{position:'absolute',top:-4,right:-4,background:'var(--red)',color:'white',
              fontSize:'.6rem',fontWeight:700,padding:'1px 4px',borderRadius:99}}>{unread}</span>
          </div>
        )}
        <div style={{width:30,height:30,background:'linear-gradient(135deg,#1B4F8A,#C9A84C)',
          borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:'.75rem',fontWeight:700}}>
          {user?.avatar}
        </div>
      </div>
    </header>
  );
}

export function TickerBar() {
  const { marketData } = useStore();
  const items = [
    ['USD/TL', marketData.usdTry.toFixed(2)],
    ['EUR/TL', marketData.eurTry.toFixed(2)],
    ['ALTIN/gr', '₺' + marketData.goldGram.toLocaleString('tr-TR')],
    ['BTC/TL', '₺' + marketData.btcTry.toLocaleString('tr-TR')],
    ['BIST100', marketData.bist100.toLocaleString('tr-TR')],
    ['ENFLASYON', '%' + marketData.inflation],
  ];
  return (
    <div className="ticker">
      {items.map(([k,v]) => (
        <span key={k}>
          <span style={{color:'var(--dim)'}}>{k} </span>
          <span style={{fontFamily:'var(--mono)',fontWeight:500}}>{v}</span>
        </span>
      ))}
    </div>
  );
}

export function Toasts() {
  const { toasts, toast } = useStore();
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{icons[t.type]}</span>
          <span className="toast-txt">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

export function Modal() {
  const { modal, closeModal } = useStore();
  if (!modal) return null;
  return (
    <div className="modal-bg" onClick={closeModal}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{modal.title}</div>
          <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
        </div>
        <div className="modal-body">{modal.content}</div>
        {modal.footer && <div className="modal-foot">{modal.footer}</div>}
      </div>
    </div>
  );
}

export function VersionBar() {
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null;
  const buildVer  = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';
  const fmt = buildTime ? new Date(buildTime).toLocaleString('tr-TR',{
    day:'2-digit',month:'2-digit',year:'numeric',
    hour:'2-digit',minute:'2-digit',second:'2-digit',
    timeZone:'Europe/Istanbul'
  }) : '';
  return (
    <div className="ver-bar">
      <span style={{color:'var(--gold)',fontFamily:'monospace',fontWeight:600}}>{buildVer}</span>
      <span style={{fontFamily:'monospace'}}>🕐 {fmt} · AI Property OS · Duay Global Trade</span>
    </div>
  );
}

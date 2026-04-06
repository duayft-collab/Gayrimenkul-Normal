import './index.css';
import { useEffect } from 'react';
import { useAuthStore } from './store/auth';
import { useStore } from './store/app';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Radar from './pages/Radar';
import LocationWatch from './pages/LocationWatch';
import LeaseIntelligence from './pages/LeaseIntelligence';
import KatKarsiligi from './pages/KatKarsiligi';
import Anayasa from './pages/Anayasa';
import { Sidebar, Toasts, Modal, VersionBar } from './components/Layout';

function PlaceholderPage({ title, icon }) {
  return (
    <div style={{padding:24,paddingBottom:60}}>
      <div style={{fontFamily:'var(--serif)',fontSize:'1.5rem',fontWeight:700,marginBottom:8}}>{icon} {title}</div>
      <div style={{color:'var(--muted)',fontSize:'.85rem'}}>Bu modül geliştiriliyor...</div>
    </div>
  );
}

const PAGES = {
  dashboard:    Dashboard,
  portfolio:    ()=><PlaceholderPage title="Mülklerim" icon="📋"/>,
  finance:      ()=><PlaceholderPage title="Finansal Analiz" icon="📊"/>,
  rental:       ()=><PlaceholderPage title="Kira Yönetimi" icon="🔑"/>,
  calculators:  ()=><PlaceholderPage title="Hesap Makineleri" icon="🧮"/>,
  tax:          ()=><PlaceholderPage title="Vergi Hesaplama" icon="⚖️"/>,
  news:         ()=><PlaceholderPage title="Haberler" icon="📰"/>,
  library:      ()=><PlaceholderPage title="Kütüphane" icon="📚"/>,
  geo:          ()=><PlaceholderPage title="Konum Analizi" icon="🗺️"/>,
  advisor:      ()=><PlaceholderPage title="AI Danışman" icon="🤖"/>,
  construction: ()=><PlaceholderPage title="İnşaat Takip" icon="🏗️"/>,
  abroad:       ()=><PlaceholderPage title="Yurt Dışı" icon="🌍"/>,
  users:        ()=><PlaceholderPage title="Kullanıcılar" icon="👥"/>,
  katkarsiligi: KatKarsiligi,
  radar:        Radar,
  location:     LocationWatch,
  lease:        LeaseIntelligence,
  anayasa:      Anayasa,
  settings:     ()=><PlaceholderPage title="Genel Ayarlar" icon="⚙️"/>,
};

export default function App() {
  const { user, loading, init: authInit } = useAuthStore();
  const { page, init, destroy } = useStore();

  useEffect(() => { authInit(); }, []);
  useEffect(() => {
    if (user?.workspaceId) {
      init(user.workspaceId);
      return () => destroy();
    }
  }, [user?.workspaceId]);

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0A0F1E',display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',gap:16,fontFamily:'DM Sans,sans-serif',color:'#E8ECF4'}}>
      <div style={{fontSize:'2.5rem'}}>🏠</div>
      <div style={{fontFamily:'Playfair Display,Georgia,serif',color:'#C9A84C',fontSize:'1.2rem'}}>AI Property OS</div>
      <div style={{width:28,height:28,border:'3px solid rgba(255,255,255,.1)',borderTopColor:'#1B4F8A',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return <Login />;
  const PageComp = PAGES[page] || PAGES.dashboard;

  return (
    <div className="layout">
      <Sidebar />
      <div className="main" style={{paddingBottom:28}}>
        <PageComp />
      </div>
      <Toasts />
      <Modal />
      <VersionBar />
    </div>
  );
}

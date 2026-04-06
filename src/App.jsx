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
import Mulkler from './pages/Mulkler';
import Harita from './pages/Harita';
import Takvim from './pages/Takvim';
import Karsilastir from './pages/Karsilastir';
import PaylasimGoruntule from './pages/PaylasimGoruntule';
import Kiracilar from './pages/Kiracilar';
import Kiralar from './pages/Kiralar';
import Odemeler from './pages/Odemeler';
import Raporlar from './pages/Raporlar';
import Karsilastirma from './pages/Karsilastirma';
import IslemGecmisi from './pages/IslemGecmisi';
import Yedekler from './pages/Yedekler';
import Guvenlik from './pages/Guvenlik';
import BildirimlerSayfa from './pages/Bildirimler';
import { registerServiceWorker } from './core/swRegister';
import { otomatikYedekKontrol } from './core/yedek';
import { bildirimOlustur } from './core/bildirimlerDb';
import { tumKiralarIcinOtomatikUret } from './core/kiraHesap';
import { piyasaOtomatikBaslat, marketState } from './core/marketData';
import { marketBootstrap } from './core/marketBootstrap';
import { Sidebar, Toasts, Modal } from './components/Layout';
import StatusBar from './components/StatusBar';
import CommandPalette from './components/CommandPalette';
import AIAsistan from './components/AIAsistan';
import { browserBildirimKur, kiraHatirlaticiKontrol } from './core/bildirim';

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
  portfolio:    Mulkler,
  harita:       Harita,
  takvim:       Takvim,
  karsilastir:  Karsilastir,
  kiracilar:    Kiracilar,
  odemeler:     Odemeler,
  raporlar:     Raporlar,
  karsilastirma: Karsilastirma,
  guvenlik:     Guvenlik,
  yedekler:     Yedekler,
  islemGecmisi: IslemGecmisi,
  bildirimler:  BildirimlerSayfa,
  finance:      Raporlar,
  rental:       Kiralar,
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
  /* Public paylaşım route — hooks'tan ÖNCE, tüm lifecycle bypass edilir */
  const shareToken = new URLSearchParams(window.location.search).get('share');
  if (shareToken) return <PaylasimGoruntule token={shareToken} />;
  return <AppInner />;
}

function AppInner() {
  const { user, loading, init: authInit } = useAuthStore();
  const store = useStore();
  const { page, init, destroy, undo } = store;

  /* Service worker + PWA */
  useEffect(() => { registerServiceWorker(); }, []);

  /* Canlı piyasa verisi — 2dk auto-refresh (user login'den bağımsız başlat) */
  useEffect(() => {
    const id = piyasaOtomatikBaslat();
    return () => clearInterval(id);
  }, []);

  useEffect(() => { authInit(); }, []);
  useEffect(() => {
    if (user?.workspaceId) {
      init(user.workspaceId);
      browserBildirimKur();
      // Haftalık otomatik yedek kontrolü
      otomatikYedekKontrol(user.workspaceId, user, { enabled: true }).then(r => {
        if (r?.gerekli) {
          bildirimOlustur({
            workspaceId: user.workspaceId,
            tip: 'yedek_hazir',
            baslik: 'Yedek Hatırlatması',
            mesaj: 'Son yedek 7 günden eski. Yedekler sayfasından manuel al.',
            link: 'yedekler',
          });
        }
      });
      return () => destroy();
    }
  }, [user?.workspaceId]);

  /* Market bootstrap — ilk kez açan workspace için 12 ay sentetik tarihsel veri */
  useEffect(() => {
    if (!user?.workspaceId) return;
    const t = setTimeout(() => {
      marketBootstrap(user.workspaceId, marketState).catch(e =>
        console.warn('[bootstrap]', e.message)
      );
    }, 8000); // Market fetch bitsin, sonra bootstrap
    return () => clearTimeout(t);
  }, [user?.workspaceId]);

  /* Günde 1 kez otomatik kira üretimi — K02: localStorage sadece tarih string */
  useEffect(() => {
    if (!user?.workspaceId) return;
    const bugun = new Date().toISOString().split('T')[0];
    const sonKontrol = localStorage.getItem('kiraUretimSonKontrol');
    if (sonKontrol === bugun) return;

    // Store'un yüklenmesini bekle (~3sn) — listener'lar veri çekmiş olsun
    const t = setTimeout(async () => {
      try {
        const s = useStore.getState();
        const sonuc = await tumKiralarIcinOtomatikUret(user.workspaceId, user, s.odemeler);
        localStorage.setItem('kiraUretimSonKontrol', bugun);
        if (sonuc?.uretildi > 0) {
          await bildirimOlustur({
            workspaceId: user.workspaceId,
            tip: 'sistem',
            baslik: 'Otomatik kira üretildi',
            mesaj: `${sonuc.uretildi} yeni ödeme oluşturuldu (${sonuc.kiraSayisi} aktif sözleşme)`,
            link: 'odemeler',
          });
        }
      } catch (e) {
        console.warn('[auto kira üretim]', e.message);
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [user?.workspaceId]);

  /* Ctrl+Z global undo */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        // Input/textarea içindeyse atla — native undo çalışsın
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  /* Saat başı kira hatırlatıcı kontrol */
  useEffect(() => {
    if (!user) return;
    const kontrol = () => {
      const s = useStore.getState();
      kiraHatirlaticiKontrol({
        odemeler: s.odemeler,
        kiralar:  s.kiralar,
        kiracilar: s.kiracilar,
      });
    };
    const t = setTimeout(kontrol, 5000); // ilk kontrol 5sn sonra (listeners yüklenmesini bekle)
    const i = setInterval(kontrol, 60 * 60 * 1000); // saat başı
    return () => { clearTimeout(t); clearInterval(i); };
  }, [user?.uid]);

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
      <div className="main" style={{paddingBottom:80}}>
        <PageComp />
      </div>
      <Toasts />
      <Modal />
      <CommandPalette />
      <AIAsistan />
      <StatusBar />
    </div>
  );
}

import { useState } from 'react';
import { Topbar } from '../components/Layout';

const GENEL_KURALLAR = [
  { no: '01', baslik: 'Dosya Mimarisi & Modüler Yapı', kavram: 'Tek Sorumluluk', oncelik: 'yuksek' },
  { no: '02', baslik: 'Güvenlik & Yetkilendirme', kavram: 'Sıfır Güven', oncelik: 'kritik' },
  { no: '03', baslik: 'Veri Bütünlüğü & Bağımlılık', kavram: 'Kayıp Yok', oncelik: 'kritik' },
  { no: '04', baslik: 'Hata Yönetimi & Dayanıklılık', kavram: 'Sessiz Hata Yok', oncelik: 'kritik' },
  { no: '05', baslik: 'Aktivite Loglama & Audit', kavram: 'İzlenebilirlik', oncelik: 'yuksek' },
  { no: '06', baslik: 'Soft Delete & Undo Mekanizması', kavram: 'Silme Koruması', oncelik: 'kritik' },
  { no: '07', baslik: 'Performans & Optimizasyon', kavram: 'Hız & Verimlilik', oncelik: 'yuksek' },
  { no: '08', baslik: 'Kod Kalitesi & Standartlar', kavram: 'Okunabilirlik', oncelik: 'yuksek' },
  { no: '09', baslik: 'Versiyonlama & Sürüm Yönetimi', kavram: 'İzlenebilir Deploy', oncelik: 'yuksek' },
  { no: '10', baslik: 'İş Mantığı & Domain Kuralları', kavram: 'Doğru Hesaplama', oncelik: 'kritik' },
  { no: '11', baslik: 'Test & Kalite Güvence', kavram: 'Doğrulama', oncelik: 'yuksek' },
  { no: '12', baslik: 'UI/UX & Tasarım Standartları', kavram: 'Minimalizm', oncelik: 'yuksek' },
  { no: '13', baslik: 'i18n Çoklu Dil Desteği', kavram: 'Evrensellik', oncelik: 'yuksek' },
  { no: '14', baslik: 'PII Maskeleme & KVKK/GDPR', kavram: 'Gizlilik', oncelik: 'kritik' },
  { no: '15', baslik: 'Otomatik Yedekleme', kavram: 'Felaket Koruması', oncelik: 'yuksek' },
  { no: '16', baslik: 'Ölçeklenebilirlik & Gelecek', kavram: 'Geleceğe Hazır', oncelik: 'orta' },
];

const KURAL_DETAY = {
  'K01': ['Tek Sorumluluk İlkesi (SRP): Her dosya tek bir iş yapar','Core utility: maks. 400 satır','Modül: maks. 800 satır','Hub: maks. 1.200 satır','Dosya başlığı zorunlu','İsimlendirme: kebab-case, camelCase, UPPER_SNAKE_CASE'],
  'K02': ['Sıfır hardcode: API key/şifre/token yok — .env zorunlu','RBAC: super_admin → admin → manager → user','Multi-tenant izolasyon sunucu tarafında','Maks. 5 hatalı giriş → 15 dk kilit','Token 72 saat | İnaktivite 30 dk','XSS koruması: innerHTML kontrolü, CSP'],
  'K03': ['Şema değişikliği migration gerektirir','Object.freeze() ile APP_CONFIG dondurulur','Para hesaplamalarında integer aritmetik','Tüm yazma işlemleri audit loga'],
  'K04': ['Merkezi error handler + toast queue','window.onerror + unhandledrejection aktif','Kullanıcıya anlamlı mesaj, consolea teknik log','try-catch hataları LogModulea'],
  'K05': ['Tüm önemli işlemler (CRUD, auth, export) loglanır','Log şeması: { id, uid, kullanici, rol, tip, aciklama, detay, zaman }','PII verileri loglarda maskelenir'],
  'K06': ['YASAK: .delete(), .remove(), .splice() — fiziksel silme yok','Soft delete: { isDeleted, deletedAt, deletedBy }','30 sn undo — Geri Al butonu toastta','Native confirm()/alert() YASAK — custom modal'],
  'K07': ['10.000+ kayıt için pagination / infinite scroll','Chart.js: Instance destroy — memory leak yok','Stress test: 50K kayıt < 2.5 sn'],
  'K08': ['var → let/const zorunlu','JSDoc + açıklayıcı Türkçe yorum','Her commit yalnızca talep edilen değişiklik'],
  'K09': ['Semver MAJOR.MINOR.PATCH','CHANGELOG.md zorunlu','Git tag v{version}'],
  'K10': ['Tüm formüller dokümante + unit test','Division by zero, null check, sınır değer kontrolleri'],
  'K11': ['Min. 3 unit test senaryosu','Sınır ve uç durumlar dahil'],
  'K12': ['CSS değişkenleri --xxx ile','Responsive 768px/1024px','ARIA + klavye navigasyonu'],
  'K13': ['t(key) fonksiyonu ile sarılır','TR/EN senkron'],
  'K14': ['TC No, telefon, e-posta maskelenir','Admin ham veri, diğerleri maskeli','KVKK/GDPR dışa aktar + silme admin panelinde'],
  'K15': ['Otomatik export/import','Cloud Scheduler periyodik backup','PITR aktif'],
  'K16': ['Stateless mimari','Redis/Firestore cache','Multi-tenant ready'],
};

const EMLAK_FORMULLER = [
  { ad: 'Cap Rate', formul: 'Net Faaliyet Geliri / Mülk Değeri × 100' },
  { ad: 'GRM', formul: 'Satış Fiyatı / Yıllık Kira' },
  { ad: 'Cash-on-Cash', formul: 'Yıllık Net CF / Toplam Yatırım × 100' },
  { ad: 'DSCR', formul: 'Net Faaliyet Geliri / Yıllık Taksit ≥ 1.25' },
  { ad: 'ROI', formul: '(Güncel Değer − Maliyet) / Maliyet × 100' },
  { ad: 'Kira Verimi', formul: 'Yıllık Kira / Güncel Değer × 100' },
  { ad: 'Reel Getiri', formul: 'Nominal ROI − TÜFE' },
  { ad: 'Altın Bazlı Değer', formul: 'TRY / ALTIN_GRAM_FIYATI' },
];

const DEPLOY_KONTROL = [
  'Yalnızca talep edilen güncelleme yapıldı [K08]',
  'Hardcode credential yok [K02]',
  'Tam kod teslim edildi [K08]',
  'Versiyon bilgisi güncellendi [K09]',
  'Dosya satır limiti kontrol edildi [K01]',
  'Soft delete kullanıldı [K06]',
  'İşlem loglandı [K05]',
  'PII maskelendi [K14]',
  'Native confirm/alert kullanılmadı [K12]',
  'i18n t(key) ile sarıldı [K13]',
  'Min. 3 test senaryosu [K11]',
  '5 geliştirme önerisi sunuldu [Protokol]',
];

const TAAHHUT = [
  'Anayasayı okudum ve anladım.',
  'Tüm kodlar 16 Kuralı takip edecek.',
  'Yeni feature = Unit test + Stress test + Code review.',
  'LogModule.kaydet() her önemli işlemde kullanılacak.',
  'Deployment = Version bump + CHANGELOG güncellemesi.',
  'Güvenlik: Security review, PII mask, input sanitization.',
  'Performance: 10.000+ kayıt pagination, Chart.js cleanup.',
  'i18n: Hardcode string yok.',
  'Teknik Borç: Acil buglar ilk sprintte çözülecek.',
  'Her releasede 5 iyileştirme önerisi sunulacak.',
];

const oncelikRenk = (o) => o === 'kritik' ? '#EF4444' : o === 'yuksek' ? '#C9A84C' : '#22C55E';
const oncelikEmoji = (o) => o === 'kritik' ? '🔴' : o === 'yuksek' ? '🟡' : '🟢';
const oncelikText = (o) => o === 'kritik' ? 'Kritik' : o === 'yuksek' ? 'Yüksek' : 'Orta';

export default function Anayasa() {
  const [tab, setTab] = useState('genel');
  return (
    <div>
      <Topbar title="⚖️ Anayasa" />
      <div className="page" style={{paddingBottom:60}}>
        <div style={{background:'linear-gradient(135deg,rgba(27,79,138,.2),rgba(201,168,76,.12))',border:'1px solid rgba(201,168,76,.3)',borderRadius:12,padding:'20px 24px',marginBottom:20}}>
          <div style={{fontFamily:'var(--serif)',fontSize:'1.4rem',fontWeight:700,color:'#E8C96A',marginBottom:6}}>⚖️ Geliştirme Anayasası v3.0</div>
          <div style={{fontSize:'.82rem',color:'var(--muted)',lineHeight:1.6}}>
            Duay Global Trade Company · 2026-03-27 · info@duaycor.com<br/>
            <em>"Hızlı olmak zorunda değilsin. Ama DOĞRU olmak zorundasın. Kendini sıradan bir geliştirici gibi değil, SİSTEMİ KURAN BİR MİMAR gibi konumlandır."</em>
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginBottom:20,borderBottom:'1px solid rgba(255,255,255,.08)'}}>
          {[{id:'genel',label:'📘 Evrensel Anayasa'},{id:'emlak',label:'🏢 Emlak Pro'},{id:'taahhut',label:'✍️ Taahhüt'}].map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{background:'none',border:'none',padding:'10px 16px',cursor:'pointer',color:tab===t.id?'#C9A84C':'var(--muted)',fontWeight:tab===t.id?700:500,fontSize:'.88rem',borderBottom:tab===t.id?'2px solid #C9A84C':'2px solid transparent',fontFamily:'var(--serif)'}}>{t.label}</button>
          ))}
        </div>
        {tab === 'genel' && (
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div style={{fontFamily:'var(--serif)',fontSize:'1rem',fontWeight:700,marginBottom:12}}>16 Evrensel Kural</div>
              <div style={{display:'grid',gap:10}}>
                {GENEL_KURALLAR.map(k => (
                  <div key={k.no} style={{display:'grid',gridTemplateColumns:'50px 1fr 160px 90px',gap:12,padding:'10px 14px',background:'rgba(255,255,255,.02)',borderRadius:8,borderLeft:`3px solid ${oncelikRenk(k.oncelik)}`,alignItems:'center',fontSize:'.82rem'}}>
                    <div style={{fontFamily:'monospace',fontWeight:700,color:'#C9A84C'}}>K{k.no}</div>
                    <div style={{fontWeight:600}}>{k.baslik}</div>
                    <div style={{color:'var(--muted)',fontSize:'.78rem'}}>{k.kavram}</div>
                    <div style={{fontSize:'.72rem',textAlign:'right',color:oncelikRenk(k.oncelik)}}>{oncelikEmoji(k.oncelik)} {oncelikText(k.oncelik)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div style={{fontFamily:'var(--serif)',fontSize:'1rem',fontWeight:700,marginBottom:14}}>Kural Detayları</div>
              {Object.entries(KURAL_DETAY).map(([kod, maddeler]) => {
                const kural = GENEL_KURALLAR.find(k => 'K'+k.no === kod);
                return (
                  <div key={kod} style={{marginBottom:18,paddingBottom:14,borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                    <div style={{fontFamily:'var(--serif)',fontSize:'.92rem',fontWeight:700,color:'#C9A84C',marginBottom:8}}>{kod} — {kural?.baslik}</div>
                    <ul style={{margin:0,paddingLeft:20,fontSize:'.8rem',color:'var(--muted)',lineHeight:1.7}}>
                      {maddeler.map((m,i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {tab === 'emlak' && (
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div style={{fontFamily:'var(--serif)',fontSize:'1rem',fontWeight:700,marginBottom:12}}>🏢 Emlak Pro — Sistem Kapsamı</div>
              <ul style={{margin:0,paddingLeft:20,fontSize:'.82rem',color:'var(--muted)',lineHeight:1.8}}>
                <li>Mülk kataloğu: Daire, Villa, Arsa, Tarla, İşyeri, Dükkan</li>
                <li>Kira takibi: TÜFE bazlı artış, sözleşme yönetimi</li>
                <li>Finansal: Cap Rate, ROE, LTV, GRM, DSCR, Net CF</li>
                <li>Kredi amortisman — enflasyon, USD, altın bazlı</li>
                <li>Portföy dashboard: döviz, kripto, altın değerleme</li>
                <li>Claude AI entegrasyonu</li>
                <li>RBAC: super_admin → admin → manager → user</li>
                <li>Aktivite log, soft-delete, offline-first</li>
              </ul>
            </div>
            <div className="card" style={{marginBottom:16}}>
              <div style={{fontFamily:'var(--serif)',fontSize:'1rem',fontWeight:700,marginBottom:12}}>💰 K10 — Finansal Formüller</div>
              <div style={{display:'grid',gap:8}}>
                {EMLAK_FORMULLER.map((f,i) => (
                  <div key={i} style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:12,padding:'8px 12px',background:'rgba(27,79,138,.08)',borderLeft:'3px solid #1B4F8A',borderRadius:6,fontSize:'.82rem'}}>
                    <div style={{fontWeight:600,color:'#C9A84C'}}>{f.ad}</div>
                    <div style={{fontFamily:'monospace',color:'var(--muted)'}}>{f.formul}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div style={{fontFamily:'var(--serif)',fontSize:'1rem',fontWeight:700,marginBottom:12}}>🔒 K14 — PII Maskeleme</div>
              <div style={{fontFamily:'monospace',fontSize:'.8rem',color:'var(--muted)',lineHeight:1.9}}>
                <div>TC: "12345678901" → "123****8901"</div>
                <div>Tel: "+905551234567" → "+90555***4567"</div>
                <div>Mail: "a@domain.com" → "a***@domain.com"</div>
              </div>
            </div>
          </div>
        )}
        {tab === 'taahhut' && (
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div style={{fontFamily:'var(--serif)',fontSize:'1rem',fontWeight:700,marginBottom:12}}>✅ Deployment Kontrol Listesi</div>
              <div style={{display:'grid',gap:6}}>
                {DEPLOY_KONTROL.map((m,i) => (
                  <div key={i} style={{display:'flex',gap:10,padding:'8px 12px',background:'rgba(34,197,94,.05)',borderLeft:'3px solid #22C55E',borderRadius:6,fontSize:'.82rem'}}>
                    <span style={{color:'#22C55E'}}>☐</span>
                    <span style={{color:'var(--muted)'}}>{m}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div style={{fontFamily:'var(--serif)',fontSize:'1rem',fontWeight:700,marginBottom:12}}>✍️ Geliştirici Taahhüdü</div>
              <ol style={{margin:0,paddingLeft:24,fontSize:'.82rem',color:'var(--muted)',lineHeight:1.9}}>
                {TAAHHUT.map((t,i) => <li key={i}>{t}</li>)}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { useTema } from './core/temaStore'
// NOT: tokens.css statik import KALDIRILDI — çift-mod sistemi için
// AppInner içinden mod === 'yeni' olduğunda dinamik yüklenir.
// Tema baslat'ı koşulsuz çağırıyoruz: data-theme attribute set eder,
// tokens.css yüklü değilse harmless (kural cascade'i etkilenmez).
try { useTema.getState().baslat(); } catch {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

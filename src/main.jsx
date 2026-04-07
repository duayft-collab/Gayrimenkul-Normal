import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/tokens.css' // Refined design system — index.css'ten SONRA
import { useTema } from './core/temaStore'

// Tema sistem algılaması — render'dan önce
useTema.getState().baslat()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

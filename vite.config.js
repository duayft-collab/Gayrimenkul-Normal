import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const now = new Date()
  const ref = 'DGT-' + now.toISOString().slice(0,10).replace(/-/g,'') + '.' + now.toISOString().slice(11,16).replace(':','')

  return {
    plugins: [react()],
    base: '/Gayrimenkul/',
    define: {
      __BUILD_TIME__: JSON.stringify(now.toISOString()),
      __BUILD_REF__: JSON.stringify(ref),
      'import.meta.env.VITE_FB_API_KEY':             JSON.stringify(env.VITE_FB_API_KEY),
      'import.meta.env.VITE_FB_AUTH_DOMAIN':         JSON.stringify(env.VITE_FB_AUTH_DOMAIN),
      'import.meta.env.VITE_FB_PROJECT_ID':          JSON.stringify(env.VITE_FB_PROJECT_ID),
      'import.meta.env.VITE_FB_STORAGE_BUCKET':      JSON.stringify(env.VITE_FB_STORAGE_BUCKET),
      'import.meta.env.VITE_FB_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FB_MESSAGING_SENDER_ID),
      'import.meta.env.VITE_FB_APP_ID':              JSON.stringify(env.VITE_FB_APP_ID),
    }
  }
})

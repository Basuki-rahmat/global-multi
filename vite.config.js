import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = Number(env.PORT || 5000)
  const apiTarget = `http://127.0.0.1:${apiPort}`

  // Semua request API diproxikan ke backend lokal sehingga browser memakai satu
  // origin saja. Tanpa ini, API_URL kosong membuat fetch('/api/...') jatuh ke
  // SPA fallback dan membalas HTML, bukan JSON. Dipakai oleh dev server
  // maupun preview karena keduanya melayani frontend dari origin yang sama.
  const proxy = {
    '/api': {
      target: apiTarget,
      changeOrigin: false,
    },
  }

  // Host yang boleh masuk. Titik di depan '.' berarti subdomain apa pun, jadi
  // *.devtunnels.ms (dan tunnel lain) lolos tanpa harus `--host`.
  const allowedHosts = ['.devtunnels.ms', '.trycloudflare.com', '.loca.lt', '.ngrok.io', '.ngrok-free.app']

  return {
    plugins: [react()],
    server: {
      // Tunnel/process lain di luar mesin ini hanya bisa menjangkau Vite kalau
      // server mau bind ke semua interface.
      host: true,
      allowedHosts,
      proxy,
    },
    preview: {
      host: true,
      allowedHosts: true,
      proxy,
    },
  }
})

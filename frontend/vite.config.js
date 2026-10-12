import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Replies with a JSON 502 when the backend is down so the UI can say so clearly.
function onProxyError(proxy) {
  proxy.on('error', (_err, _req, res) => {
    if (res && typeof res.writeHead === 'function' && !res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ message: 'Backend unreachable' }))
    }
  })
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_DEV_PROXY_TARGET || 'http://localhost:5000'
  const proxy = {
    '/api': { target, changeOrigin: true, configure: onProxyError },
    // GET / on the backend is the health check; "/" itself belongs to the SPA,
    // so the frontend calls /_health and the proxy rewrites it to "/".
    '/_health': { target, changeOrigin: true, rewrite: () => '/', configure: onProxyError },
  }

  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
  }
})

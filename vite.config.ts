import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

/**
 * Mirrors production's vercel.json rewrite (`/(.*) -> /app.html`) for the
 * Vite dev/preview servers, which have no equivalent of their own — without
 * this, Vite's built-in SPA fallback always serves the root `index.html`
 * (the static landing page), so a full-page navigation to e.g. /login in
 * `npm run dev` would incorrectly render the landing page instead of the
 * React app shell.
 */
function spaFallbackPlugin(): Plugin {
  const rewrite = (req: { method?: string; url?: string }) => {
    const url = req.url || ''
    if (
      req.method !== 'GET' && req.method !== 'HEAD' ||
      url === '/' ||
      url.startsWith('/@') ||
      url.includes('.')
    ) {
      return
    }
    req.url = '/app.html'
  }

  return {
    name: 'dentivo-spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req)
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req)
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    spaFallbackPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      workbox: {
        navigateFallback: '/app.html',
      },
      manifest: {
        name: 'DENTIVO',
        short_name: 'DENTIVO',
        description: 'Dentivo Management Software',
        start_url: '/app',
        scope: '/',
        theme_color: '#030811ff',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        app: path.resolve(__dirname, 'app.html'),
      },
    },
  },
})

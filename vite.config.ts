import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// base relativa: funciona no GitHub Pages em qualquer nome de repositório
export default defineConfig({
  base: './',
  plugins: [
    react(),
    // Service worker: guarda a loja no aparelho do visitante.
    // 2ª visita em diante abre instantaneamente (inclusive offline) e só baixa o que mudou.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registrado em src/main.tsx (com recarga automática ao atualizar)
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Argento — iPhones novos e seminovos',
        short_name: 'Argento',
        description: 'Showroom digital de iPhones novos e seminovos.',
        lang: 'pt-BR',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f5f5f7',
        theme_color: '#f5f5f7',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // código e estilos: pré-cache (versão nova substitui a antiga automaticamente)
        globPatterns: ['**/*.{js,css,svg,woff2}'],
        globIgnores: ['fotos/**', 'models/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // a página (index.html) vem sempre da rede primeiro: cada publicação aparece na hora;
            // o cache só entra sem internet ou se a rede demorar mais de 3 s
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'argento-paginas', networkTimeoutSeconds: 3, cacheableResponse: { statuses: [200] }, matchOptions: { ignoreSearch: true } },
          },
          {
            // fotos: baixadas só quando aparecem na tela, depois servidas do cache
            urlPattern: ({ url }) => url.pathname.includes('/fotos/'),
            handler: 'CacheFirst',
            options: { cacheName: 'argento-fotos', expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            // modelos 3D (.glb): pesados, então ficam guardados após o primeiro download
            urlPattern: ({ url }) => url.pathname.endsWith('.glb'),
            handler: 'CacheFirst',
            options: { cacheName: 'argento-modelos-3d', expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 90 }, cacheableResponse: { statuses: [200] } },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('gsap') || id.includes('lenis')) return 'motion'
        },
      },
    },
  },
})

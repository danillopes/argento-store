import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relativa: o site funciona em qualquer caminho em que for publicado
export default defineConfig({
  base: './',
  plugins: [
    react(),
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

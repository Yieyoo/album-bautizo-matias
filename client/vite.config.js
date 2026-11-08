import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    // iPhones sin actualizar (iOS 12–13) no entienden el código moderno y se
    // quedaban en blanco; reciben aparte una versión traducida. Los celulares
    // modernos siguen usando la versión normal.
    legacy({
      targets: ['defaults', 'iOS >= 12', 'Safari >= 12', 'Chrome >= 64', 'Android >= 7'],
      modernPolyfills: false,
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})

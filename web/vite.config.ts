import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2017',
    cssTarget: 'chrome61',
    modulePreload: false,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost/app/Serveur',
        changeOrigin: true,
      }
    }
  }
})

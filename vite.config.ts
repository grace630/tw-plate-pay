import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 縣市 API 沒開 CORS，前端一律走自己的後端（server/index.ts）
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})

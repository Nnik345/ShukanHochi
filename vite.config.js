import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_GATEWAY_ORIGIN =
  'https://37qn47z124.execute-api.ap-south-1.amazonaws.com'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev-only: same-origin `/api/aws/...` → API Gateway (avoids CORS in browser)
    proxy: {
      '/api/aws': {
        target: API_GATEWAY_ORIGIN,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/aws/, ''),
      },
    },
  },
})

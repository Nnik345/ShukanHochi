import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const API_GATEWAY_ORIGIN =
    env.VITE_DEV_PROXY_TARGET ||
    env.VITE_API_GATEWAY_URL ||
    'https://37qn47z124.execute-api.ap-south-1.amazonaws.com/default'

  return {
    plugins: [react()],
    server: {
      // Dev-only: same-origin `/api/aws/...` → API Gateway (avoids CORS in browser)
      proxy: {
        '/api/aws': {
          target: API_GATEWAY_ORIGIN.replace(/\/$/, ''),
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/aws/, ''),
        },
      },
    },
  }
})

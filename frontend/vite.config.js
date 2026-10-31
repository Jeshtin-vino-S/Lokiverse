import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const currentDir = import.meta.dirname || process.cwd()
  // Load environment variables from the project root
  const env = loadEnv(mode, path.resolve(currentDir, '..'), '')
  const backendTarget = env.VITE_BACKEND_URL || env.BACKEND_URL || 'http://localhost:5000'
  const devPort = parseInt(env.VITE_PORT || '3000', 10)

  return {
    envDir: '../', // Allows frontend to seamlessly read root .env variables prefixed with VITE_
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: devPort,
      proxy: {
        '/auth': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: backendTarget,
          ws: true,
        },
      },
    },
  }
})

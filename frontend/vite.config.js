import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    proxy: {
      '/auth': {
        target: 'https://lokiverse.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'https://lokiverse.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'https://lokiverse.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'https://lokiverse.onrender.com',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

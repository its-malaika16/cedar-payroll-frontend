import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // esbuild 0.28 will not lower destructuring for Vite 6's default Safari 14
  // target, which breaks the canvg bundle inside jsPDF. These browsers already
  // run destructuring natively.
  esbuild: {
    supported: {
      destructuring: true,
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      supported: {
        destructuring: true,
      },
    },
  },
  build: {
    target: 'es2022',
  },
  server: {
    port: 5173,
    watch: {
      usePolling: true,
      interval: 400,
    },
    proxy: {
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})

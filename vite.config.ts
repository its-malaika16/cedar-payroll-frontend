import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@site': path.resolve(rootDir, '../cedar-payroll-website/src'),
    },
  },
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

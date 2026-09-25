import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'viem'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      '@tanstack/react-query',
      'wagmi',
      'wagmi/chains',
      'wagmi/connectors',
      'viem',
      'viem/chains',
      'framer-motion',
      'lucide-react',
      'sonner',
      'clsx',
      'tailwind-merge',
    ],
    exclude: ['contracts', 'connectkit'],
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Force new hashes by changing chunk names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          // React core — must be first and isolated
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor'
          }
          // viem — large, stable
          if (id.includes('node_modules/viem/') ||
              id.includes('node_modules/@noble/') ||
              id.includes('node_modules/@scure/')) {
            return 'viem-vendor'
          }
          // wagmi — depends on viem
          if (id.includes('node_modules/wagmi/') ||
              id.includes('node_modules/@wagmi/')) {
            return 'wagmi-vendor'
          }
          // tanstack query
          if (id.includes('node_modules/@tanstack/')) {
            return 'query-vendor'
          }
          // UI libs
          if (id.includes('node_modules/framer-motion/') ||
              id.includes('node_modules/lucide-react/') ||
              id.includes('node_modules/sonner/') ||
              id.includes('node_modules/clsx/') ||
              id.includes('node_modules/tailwind-merge/')) {
            return 'ui-vendor'
          }
        },
      },
    },
  },
  server: {
    allowedHosts: true,
    cors: true,
  },
})

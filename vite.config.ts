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
    dedupe: ['react', 'react-dom'],
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
      'connectkit',
      'framer-motion',
      'lucide-react',
      'sonner',
      'clsx',
      'tailwind-merge',
      'vite-plugin-node-polyfills/shims/buffer',
      'vite-plugin-node-polyfills/shims/global',
      'vite-plugin-node-polyfills/shims/process',
    ],
    // Exclude Foundry/Solidity artifacts — they are not browser modules
    exclude: ['contracts'],
  },
  build: {
    // Warn at 1MB, not default 500kB
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Wagmi + viem stack
          'wagmi-vendor': ['wagmi', 'viem', 'connectkit', '@tanstack/react-query'],
          // UI libs
          'ui-vendor': ['framer-motion', 'lucide-react', 'sonner', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
  server: {
    allowedHosts: true,
    cors: true,
  },
})

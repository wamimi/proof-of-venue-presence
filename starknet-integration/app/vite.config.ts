import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import serveStatic from 'vite-plugin-serve-static'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      // Workaround for https://github.com/keep-starknet-strange/scaffold-garaga/issues/5
      ...serveStatic([
        {
          pattern: /main.worker.js/,
          resolve: 'node_modules/@aztec/bb.js/dest/browser/barretenberg_wasm/barretenberg_wasm_main/factory/browser/main.worker.js'
        }
      ]),
      apply: 'serve', // Only apply in dev mode
    }
  ],
  define: {
    'global': 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
})

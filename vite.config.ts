import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(__dirname, 'apps/web'),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'dist/web'),
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // The prototype is same-origin only. Vite's dev server otherwise answers
    // with `Access-Control-Allow-Origin: *`, which contradicts the API's
    // no-CORS stance and would make a foreign page's response readable.
    cors: false,
    proxy: {
      // Same-origin from the browser's point of view, so the strict Origin
      // check on the token route sees the page's own loopback origin.
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: false,
      },
    },
  },
});

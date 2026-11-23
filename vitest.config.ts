import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@server': resolve(here, 'apps/server/src'),
      '@web': resolve(here, 'apps/web/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/**/*.test.ts', 'apps/**/*.test.tsx'],
    environmentMatchGlobs: [['apps/web/**', 'jsdom']],
    setupFiles: [resolve(here, 'tests/setup.ts')],
    restoreMocks: true,
    clearMocks: true,
  },
});

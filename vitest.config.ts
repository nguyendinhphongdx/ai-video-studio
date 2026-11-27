import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src'), '@video': path.resolve(__dirname, 'remotion') } },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    // Each server test file starts its own PGlite and migrates it; many at once can take longer than 10 s.
    hookTimeout: 60_000,
  },
});

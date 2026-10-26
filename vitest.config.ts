import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src'), '@video': path.resolve(__dirname, 'remotion') } },
  test: { include: ['tests/**/*.test.{ts,tsx}'], environment: 'node' },
});

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '#features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '#libraries': fileURLToPath(new URL('./src/libraries', import.meta.url)),
      '#adapters': fileURLToPath(new URL('./src/adapters', import.meta.url)),
      '#tests': fileURLToPath(new URL('./tests', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/support/setup-env.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});

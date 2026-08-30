import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: process.cwd(),
  test: { include: ['docs/evaluations/sql-resource-final-ownership/evaluation/ablation.test.ts'] },
});

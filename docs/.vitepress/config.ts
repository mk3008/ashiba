import { defineConfig } from 'vitepress';

export default defineConfig({
  vite: {
    build: {
      target: 'esnext',
    },
  },
});

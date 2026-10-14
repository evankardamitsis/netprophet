import { defineConfig } from 'vitest/config';

// tests cover server logic only; an inline PostCSS config keeps the app's Tailwind one out of vitest
export default defineConfig({
  css: { postcss: {} },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});

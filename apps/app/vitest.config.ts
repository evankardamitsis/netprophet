import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Pure helpers only (src/lib) and the native config plugins. Components are checked by type-check and the web export.
  test: { environment: 'node', include: ['src/**/*.test.ts', 'plugins/**/*.test.js'] },
});

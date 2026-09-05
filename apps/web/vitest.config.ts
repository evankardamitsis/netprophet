import { defineConfig } from 'vitest/config';

// Scoped to the Daily Run prototype's pure logic. The rest of the app has no
// test suite; this config deliberately does not reach into it.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/lib/daily/**/*.test.ts'],
    },
});

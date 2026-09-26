import { defineConfig } from 'vitest/config';

export default defineConfig({
  // apps/web's tsconfig sets "jsx": "preserve" for Next's own compiler; oxc (Vitest 5's default
  // transform) needs an explicit override here (Next itself never goes through this pass) so
  // .tsx test files parse.
  oxc: { jsx: 'automatic' },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
    // jsdom is a superset of node (Node globals still work) — needed for apps/web's React component tests.
    environment: 'jsdom',
    setupFiles: ['apps/web/vitest.setup.ts'],
  },
});

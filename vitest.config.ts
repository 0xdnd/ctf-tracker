import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 60000,
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      // Floors: measured level (stmts 61.9, branches 57.3, funcs 55.7, lines 64.6) rounded down to 5%.
      thresholds: { statements: 60, branches: 55, functions: 55, lines: 60 },
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test/**', 'src/data/**', 'src/**/*.d.ts'],
    },
  },
});

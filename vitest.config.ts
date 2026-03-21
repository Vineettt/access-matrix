import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '**/*.d.ts', '**/*.js'],
    globals: true,
    setupFiles: [],
  },
  esbuild: {
    target: 'es2022',
    format: 'esm',
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  define: {
    'import.meta.vitest': undefined,
  },
});

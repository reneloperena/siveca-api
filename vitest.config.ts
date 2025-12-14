/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', '.git'],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,ts}'],
      exclude: [
        'src/**/*.{test,spec}.{js,ts}',
        'src/test/**',
        'src/**/*.d.ts',
        'src/api/**',
        'src/services/**',
        'src/index.ts',
        'dist/**',
        'node_modules/**',
      ],
      reporter: ['text', 'html', 'json'],
    },
  },
  resolve: {
    alias: {
      '@': '/Users/rene/github/siveca-api/src',
    },
  },
})

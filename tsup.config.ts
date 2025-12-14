import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  minify: true,
  treeshake: true,
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  // Bundle everything except Node.js built-ins
  external: [],
  noExternal: [/.*/],
})

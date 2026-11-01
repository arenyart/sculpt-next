import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build also works from file:// (Electron) and from sub-paths.
  base: './',
  server: {
    host: '127.0.0.1',
    port: 47321
  },
  preview: {
    host: '127.0.0.1',
    port: 47322
  },
  build: {
    target: 'es2022',
    sourcemap: true
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.js']
  }
});

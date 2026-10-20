import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 3001,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
});

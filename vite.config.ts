import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative base path to support deployment on both GitHub Pages (subdir) and Cloud Run (root)
  base: './',
  build: {
    outDir: 'dist',
  },
  server: {
    proxy: {
      '/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(new Date().toISOString().replace(/T/, '-').replace(/\..+/, '').replace(/:/g, '')),
  },
});
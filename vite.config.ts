/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import { VitePWA } from 'vite-plugin-pwa';

const getVersion = () => {
  try {
    // Get the last commit date in the requested format: YYYY-MM-DD-HHMMSS
    // %ad respects the author date and timezone of the commit
    return execSync('git log -1 --format="%ad" --date=format:"%Y-%m-%d-%H%M%S"').toString().trim();
  } catch (e) {
    console.warn('Failed to get git version, falling back to current date', e);
    return new Date().toISOString().replace(/T/, '-').replace(/\..+/, '').replace(/:/g, '');
  }
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'vCard Editor & Generator',
        short_name: 'Kontakte.me',
        description: 'Privacy-first vCard Editor with AI features',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB to accommodate tesseract-core.wasm.js
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  // Use relative base path to support deployment on both GitHub Pages (subdir) and Cloud Run (root)
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'tesseract-vendor': ['tesseract.js'],
          'ui-vendor': ['lucide-react', 'sonner'],
          'image-vendor': ['smartcrop', 'browser-image-compression'],
          'utils-vendor': ['idb', 'comlink', 'jszip'],
        },
      },
    },
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
    __APP_VERSION__: JSON.stringify(getVersion()),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
});
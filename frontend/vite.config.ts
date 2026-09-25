import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Backend origin used only by the dev-server proxy (must be an absolute URL).
  const backendOrigin = env.VITE_BACKEND_URL || 'http://localhost:8080';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifest: {
          name: 'Afya HMS',
          short_name: 'Afya',
          description: 'Hospital Management System',
          theme_color: '#0F766E',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/drugs')
                || url.pathname.startsWith('/api/v1/icd10')
                || url.pathname.startsWith('/api/v1/branches'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'afya-reference',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              urlPattern: ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
              handler: 'CacheFirst',
              options: {
                cacheName: 'afya-static',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    server: {
      host: true,
      port: 5173,
      // Allow Cloudflare Quick Tunnel hostnames while keeping Vite's
      // host-header protection enabled for unrelated domains.
      allowedHosts: ['.trycloudflare.com'],
      proxy: {
        '/api': { target: backendOrigin, changeOrigin: true },
        '/broadcasting': { target: backendOrigin, changeOrigin: true, ws: true },
      },
    },

    build: {
      outDir: 'dist',
      // Source maps are large — expose only in dev/CI, never ship to production users.
      sourcemap: mode === 'development' ? 'inline' : false,
      target: 'es2022',
      rollupOptions: {
        output: {
          /**
           * Map each vendor module to a named chunk.
           * Function form is required by Vite 8's stricter OutputOptions types.
           */
          manualChunks(id: string): string | undefined {
            // Core React runtime — always needed first
            if (id.includes('react-dom') || id.includes('react-router-dom') || (id.includes('node_modules/react/') && !id.includes('react-dom'))) {
              return 'react';
            }
            // Data fetching
            if (id.includes('@tanstack/react-query')) return 'query';
            // Charts — recharts is large, isolate it
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            // Icon library — lucide is large
            if (id.includes('lucide-react')) return 'icons';
            // Date utilities
            if (id.includes('date-fns')) return 'dates';
            // Forms
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'forms';
            // i18n
            if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n';
            // Real-time / WebSockets
            if (id.includes('laravel-echo') || id.includes('pusher-js')) return 'echo';
            // All other node_modules → shared vendor chunk
            if (id.includes('node_modules')) return 'vendor';
            // Application code — let Rollup decide chunk boundaries
            return undefined;
          },
        },
      },
    },

    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
        thresholds: { lines: 80, branches: 75, functions: 80, statements: 80 },
      },
    },
  };
});

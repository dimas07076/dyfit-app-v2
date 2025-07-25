// /vite.config.ts (localizado na RAIZ do projeto)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: 'client',

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      
      devOptions: {
        enabled: true,
      },
      
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],

        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2,webp,jpg,jpeg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

        runtimeCaching: [
          // Regra para que as chamadas de API NUNCA sejam cacheadas.
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly', 
            options: {
              cacheName: 'api-cache',
              backgroundSync: {
                name: 'api-queue',
                options: {
                  maxRetentionTime: 24 * 60,
                },
              },
            },
          },
          // Regra para os assets da aplicação.
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && !url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-assets',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 semana
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              matchOptions: {
                ignoreVary: true,
              },
            },
          },
        ],
      },
      manifest: {
        name: 'DyFit',
        short_name: 'DyFit',
        description: 'Plataforma de gestão de treinos personalizada',
        theme_color: '#4f46e5',
        background_color: '#4f46e5',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    })
  ],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
    },
  },
  
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['.gitpod.io'],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },

  build: {
    outDir: 'dist',
  }
});
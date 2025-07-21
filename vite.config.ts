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
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
        // <<< GARANTA QUE ESTA LINHA ESTEJA PRESENTE E CORRETA >>>
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // Define o limite para 5 MB
      },
      manifest: {
        name: 'DyFit',
        short_name: 'DyFit',
        description: 'Seu aplicativo de gestão de treinos personalizado.',
        theme_color: '#ffffff',
        background_color: '#4f46e5',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
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
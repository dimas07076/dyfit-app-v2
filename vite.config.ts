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
        // Estratégia para o index.html: CacheFirst para navegações
        // Garante que o index.html seja servido do cache primeiro em navegações (como F5)
        navigateFallback: '/index.html', // Fallback para todas as navegações
        navigateFallbackDenylist: [/^\/api\//], // Exclui rotas de API do fallback

        // Pré-cache de assets críticos
        // Inclua todos os tipos de arquivos relevantes que compõem sua aplicação estática
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2,webp,jpg,jpeg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // Aumentado para 5MB para garantir cache de assets maiores

        // Regras de runtime caching para assets que não estão no pré-cache
        runtimeCaching: [
          {
            // Cache para assets da própria aplicação (não APIs)
            urlPattern: ({ url }) => url.origin === self.location.origin && !url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst', // Tenta a rede primeiro, depois o cache
            options: {
              cacheName: 'app-assets',
              expiration: {
                maxEntries: 50, // Número máximo de entradas no cache
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 semana de validade
              },
              cacheableResponse: {
                statuses: [0, 200], // Cachear respostas bem-sucedidas e opacas
              },
              // Importante: Adiciona esta opção para ignorar o cabeçalho 'Vary: Origin'
              // Isso resolve o warning no console e melhora a consistência do cache.
              matchOptions: {
                ignoreVary: true,
              },
            },
          },
          // Se você tiver assets de CDN ou outros recursos externos que queira cachear
          // {
          //   urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          //   handler: 'CacheFirst',
          //   options: {
          //     cacheName: 'google-fonts-cache',
          //     expiration: {
          //       maxEntries: 10,
          //       maxAgeSeconds: 60 * 60 * 24 * 365, // 1 ano
          //     },
          //     cacheableResponse: {
          //       statuses: [0, 200],
          //     },
          //   },
          // },
        ],
      },
      // Configuração do manifest.json para PWA (se ainda não estiver usando um arquivo separado)
      // Se você já tem um manifest.json em /public, esta seção pode ser removida
      // ou usada para complementar/sobrescrever partes do manifest existente.
      manifest: {
        name: 'DyFit',
        short_name: 'DyFit',
        description: 'Plataforma de gestão de treinos personalizada',
        theme_color: '#4f46e5', // Cor do seu gradiente indigo-600
        background_color: '#4f46e5',
        display: 'standalone', // Modo de exibição (standalone, fullscreen, minimal-ui, browser)
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
            purpose: 'any maskable', // Ícone maskable para Android
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

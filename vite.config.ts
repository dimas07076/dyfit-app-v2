// /vite.config.ts (localizado na RAIZ do projeto)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // Define o diretório raiz do projeto frontend.
  root: 'client',

  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
    },
  },
  
  // Configurações do servidor de desenvolvimento
  server: {
    host: '0.0.0.0',
    port: 5173,
    
    // <<< A LINHA QUE FALTAVA FOI ADICIONADA AQUI >>>
    // Permite que os hosts do Gitpod se conectem ao servidor Vite.
    allowedHosts: ['.gitpod.io'],

    // Proxy para resolver o CORS no desenvolvimento
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },

  build: {
    // O outDir é relativo à opção 'root'.
    outDir: 'dist',
  }
});
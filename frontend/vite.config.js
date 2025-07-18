// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@api': resolve(__dirname, './src/api'),
      '@context': resolve(__dirname, './src/context'),
    },
  },
  server: {
    host: true, // 0.0.0.0
    port: 3000,
    // Разрешаем HMR-клиенту достучаться до вас из контейнера
    hmr: {
      host: 'localhost', // или ваш внешний хост
      clientPort: 3000, // порт, на который проброшен 3000:3000
    },
    // enable polling so file changes are noticed inside Docker volume
    watch: {
      usePolling: true,
      interval: 100,
    },
    allowedHosts: ['localhost', 'dofrag.com', 'dofrag.com:3000', '.dofrag.com'],
  },
});

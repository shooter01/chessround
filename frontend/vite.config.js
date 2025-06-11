import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Позволяет подключаться извне контейнера
    port: 3000, // Порт Vite
    watch: {
      usePolling: true, // Включаем polling для Docker
    },
  },
});

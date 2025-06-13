// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // слушаем на всех интерфейсах
    port: 3000,
    allowedHosts: [
      'localhost',
      'dofrag.com', // без порта
      'dofrag.com:3000', // с портом, если заходите так
      '.dofrag.com', // любой поддомен
    ],
  },
  // остальная конфигурация...
});

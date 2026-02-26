// vite.config.js
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const apiProxyTarget = 'http://127.0.0.1:3001';
const apiProxyConfig = {
  target: apiProxyTarget,
  changeOrigin: true,
  secure: false,
  rewrite: (requestPath: string) => requestPath.replace(/^\/api/, ''),
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': apiProxyConfig,
    },
  },
  preview: {
    proxy: {
      '/api': apiProxyConfig,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), mkcert()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    open: true,
    https: false,
    proxy: {
      '/graphql': {
        target: 'https://local.usertour.io/graphql',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/graphql/, ''),
      },
      '/api': {
        target: 'https://local.usertour.io/api',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});

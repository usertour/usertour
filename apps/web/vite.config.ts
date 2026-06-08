import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import mkcert from 'vite-plugin-mkcert';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Backend the dev server proxies to. Override locally WITHOUT editing this
  // file via `SERVER_PROXY_TARGET` in `apps/web/.env` (gitignored) — a full
  // URL, so it covers a different port, an https host, or a docker service
  // (e.g. http://localhost:3001, https://local.usertour.io). Defaults to the
  // conventional dev port.
  const env = loadEnv(mode, __dirname, '');
  const target = env.SERVER_PROXY_TARGET || 'http://localhost:3000';

  return {
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
          target: `${target}/graphql`,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/graphql/, ''),
        },
        '/api': {
          target: `${target}/api`,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});

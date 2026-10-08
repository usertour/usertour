import { existsSync, readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { type Plugin, defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(resolve(sdkRoot, 'package.json'), 'utf-8')) as {
  version: string;
};

// Same layout the SDK build writes and the CDN serves:
// <ASSETS_URI>/<version>/es2020/css/{index.css,usertour.css}
const cssBasePath = `/${pkg.version}/es2020/css`;
const cssDir = resolve(sdkRoot, `dist${cssBasePath}`);

const GALLERY_PORT = 5190;
// Must match SDK_ASSETS_PREFIX in src/env.ts.
const SDK_ASSETS_PREFIX = '/sdk-dist';

/**
 * Serves the two stylesheets of the BUILT SDK (not the source), so the gallery
 * renders with exactly what customer pages load. Only the current version's
 * css folder is exposed; the rest of apps/sdk/dist (every past version's JS)
 * stays out of the gallery.
 */
const serveBuiltSdkCss = (): Plugin => {
  const prefix = `${SDK_ASSETS_PREFIX}${cssBasePath}/`;
  const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url?.split('?')[0] ?? '';
    if (!url.startsWith(prefix)) {
      return next();
    }
    const name = url.slice(prefix.length);
    if (!/^[a-z0-9-]+\.css$/.test(name)) {
      return next();
    }
    const file = resolve(cssDir, name);
    if (!existsSync(file)) {
      res.statusCode = 404;
      res.end(`${file} is missing; run \`pnpm build:sdk\` first`);
      return;
    }
    res.setHeader('Content-Type', 'text/css');
    res.setHeader('Cache-Control', 'no-store');
    res.end(readFileSync(file));
  };
  return {
    name: 'serve-built-sdk-css',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
};

export default defineConfig({
  root: __dirname,
  plugins: [react(), serveBuiltSdkCss()],
  resolve: {
    alias: {
      '@': resolve(sdkRoot, 'src'),
    },
  },
  // Mirrors the SDK's own `commonDefine`, so getMainCss()/getUserTourCss()
  // resolve to the versioned paths above.
  define: {
    USERTOUR_APP_VERSION: JSON.stringify(pkg.version),
    USERTOUR_APP_MAIN_CSS: JSON.stringify(`${cssBasePath}/index.css`),
    USERTOUR_APP_USER_TOUR_CSS: JSON.stringify(`${cssBasePath}/usertour.css`),
  },
  server: {
    host: '127.0.0.1',
    port: GALLERY_PORT,
    strictPort: true,
    open: false,
  },
  preview: {
    host: '127.0.0.1',
    port: GALLERY_PORT,
    strictPort: true,
    open: false,
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    // One unsplit bundle is fine for a local test page.
    chunkSizeWarningLimit: 2000,
  },
});

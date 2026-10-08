/**
 * Static host for the SDK runtime suite: serves the host pages under
 * `packages/e2e/hosts` and the BUILT SDK under `/sdk-dist` (the same chunked
 * es2020 folder a customer page loads). No framework, no build step — what
 * the browser gets is exactly what is on disk.
 *
 * Started by playwright.config.ts as a webServer; `node scripts/static-host.mjs`
 * runs it by hand. The port must match RUNTIME_HOST_URL in the config.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOSTS_ROOT = resolve(HERE, '../hosts');
const SDK_DIST_ROOT = resolve(HERE, '../../../apps/sdk/dist');
const PORT = Number(process.env.RUNTIME_HOST_PORT ?? 5191);

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/** Resolve a URL path under a root, refusing anything that escapes it. */
const fileUnder = (root, urlPath) => {
  const safe = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const file = join(root, safe);
  if (!file.startsWith(root)) {
    return undefined;
  }
  if (existsSync(file) && statSync(file).isFile()) {
    return file;
  }
  return undefined;
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${PORT}`);
  if (url.pathname === '/health') {
    response.writeHead(200, { 'content-type': 'text/plain' });
    response.end('ok');
    return;
  }
  const file = url.pathname.startsWith('/sdk-dist/')
    ? fileUnder(SDK_DIST_ROOT, url.pathname.slice('/sdk-dist/'.length))
    : fileUnder(HOSTS_ROOT, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end(`not found: ${url.pathname}`);
    return;
  }
  response.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
});

server.listen(PORT, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log(
    `runtime host on http://127.0.0.1:${PORT} (hosts: ${HOSTS_ROOT}, sdk: ${SDK_DIST_ROOT})`,
  );
});

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';

import { RequireCapability } from '@/api-token/require-capability.decorator';

import { Audit } from './audit.decorator';
import { deriveAudit } from './audit.interceptor';

/**
 * ROUTE-level audit coverage tripwire. The capability tripwire in
 * audit.interceptor.spec.ts guards the ENUM (a new capability must be
 * classified); this one guards the ROUTES: every REST write endpoint under
 * src/api (v2) and src/openapi (v1) must either derive an audit descriptor
 * from its @RequireCapability or carry an explicit @Audit. Without this, a new
 * route using an unmapped capability (e.g. a future v2 project:manage
 * endpoint) runs silently unaudited — the failure mode is invisible by design,
 * so only a machine check catches it.
 *
 * Out of scope on purpose: src/mcp (audited in the dispatch wrapper, pinned by
 * write-tools.spec.ts).
 */
const WRITE_METHODS = new Set([
  RequestMethod.POST,
  RequestMethod.PUT,
  RequestMethod.PATCH,
  RequestMethod.DELETE,
]);

function controllerFiles(root: string): string[] {
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.controller.ts'))
    .map((file) => join(root, file));
}

describe('REST route audit coverage — no write route is silently unaudited', () => {
  const reflector = new Reflector();
  const roots = [join(__dirname, '../api'), join(__dirname, '../openapi')];

  it('every v1/v2 write route derives from its capability or carries an explicit @Audit', () => {
    const uncovered: string[] = [];
    let writeRoutes = 0;

    for (const root of roots) {
      for (const file of controllerFiles(root)) {
        // Dynamic require on purpose: the scan must load whatever controllers
        // EXIST, not a hand-maintained import list a new controller would miss.
        const mod = require(file) as Record<string, unknown>;
        for (const exported of Object.values(mod)) {
          if (typeof exported !== 'function' || !exported.prototype) {
            continue;
          }
          for (const name of Object.getOwnPropertyNames(exported.prototype)) {
            if (name === 'constructor') {
              continue;
            }
            const handler = exported.prototype[name];
            if (typeof handler !== 'function') {
              continue;
            }
            const method = Reflect.getMetadata(METHOD_METADATA, handler) as number | undefined;
            if (method === undefined || !WRITE_METHODS.has(method)) {
              continue;
            }
            writeRoutes++;
            const explicit = reflector.get(Audit, handler);
            const capability = reflector.get(RequireCapability, handler);
            const derived = capability
              ? deriveAudit(String(capability), RequestMethod[method])
              : null;
            if (!explicit && !derived) {
              const path = Reflect.getMetadata(PATH_METADATA, handler) ?? '';
              uncovered.push(`${exported.name}.${name} [${RequestMethod[method]} ${path}]`);
            }
          }
        }
      }
    }

    // The scan itself must not silently go blind: 36 v2 + 7 v1 write routes
    // exist today. A refactor that breaks the glob or the metadata read would
    // otherwise pass vacuously.
    expect(writeRoutes).toBeGreaterThanOrEqual(43);
    expect(uncovered).toEqual([]);
  });
});

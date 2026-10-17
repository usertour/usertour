import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Select 1.2.2 resolved its own dismissable-layer 1.0.4 and focus-scope 1.0.3.
 * Dialog and the other modal primitives already share the 1.1.x copies, so the
 * two layer stacks restored `document.body.style.pointerEvents` out of order
 * and left the dashboard unclickable after a Select inside a Dialog closed.
 * Select 2.1.2 is the resolution already used elsewhere in the lockfile; it
 * must stay on that shared 1.1.x line.
 */

const repoRoot = resolve(__dirname, '../../../../../../..');

const fieldValue = (line: string | undefined, indent: number, name: string): string | undefined => {
  const prefix = `${' '.repeat(indent)}${name}: `;
  return line?.startsWith(prefix) ? line.slice(prefix.length) : undefined;
};

const uiSelectRequest = (lockfile: string): { specifier: string; version: string } => {
  const lines = lockfile.split('\n');
  const start = lines.indexOf('  packages/ui:');
  expect(start).toBeGreaterThanOrEqual(0);

  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('  ') && !line.startsWith('    ')) break;
    if (line !== "      '@radix-ui/react-select':") continue;

    const specifier = fieldValue(lines[i + 1], 8, 'specifier');
    const version = fieldValue(lines[i + 2], 8, 'version');
    expect(specifier).toBeDefined();
    expect(version).toBeDefined();
    return { specifier: specifier as string, version: version as string };
  }

  throw new Error('@usertour/ui lockfile importer does not request @radix-ui/react-select');
};

const LAYER_DEPS = ['@radix-ui/react-dismissable-layer', '@radix-ui/react-focus-scope'] as const;

const selectLayerVersions = (
  lockfile: string,
  version: string,
): { dismissableLayer: string; focusScope: string } => {
  const lines = lockfile.split('\n');
  const start = lines.indexOf(`  '@radix-ui/react-select@${version}':`);
  expect(start).toBeGreaterThanOrEqual(0);

  const deps: Record<string, string> = {};
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('  ') && !line.startsWith('    ')) break;
    for (const name of LAYER_DEPS) {
      const value = fieldValue(line, 6, `'${name}'`);
      if (value) deps[name] = value.split('(')[0];
    }
  }

  const dismissableLayer = deps['@radix-ui/react-dismissable-layer'];
  const focusScope = deps['@radix-ui/react-focus-scope'];
  expect(dismissableLayer).toBeDefined();
  expect(focusScope).toBeDefined();
  return { dismissableLayer: dismissableLayer as string, focusScope: focusScope as string };
};

describe('@usertour/ui radix select layer', () => {
  it('resolves Select 2.1.2 onto the shared 1.1.x dismissable-layer and focus-scope', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(repoRoot, 'packages/ui/package.json'), 'utf8'),
    );
    expect(manifest.dependencies['@radix-ui/react-select']).toBe('^2.1.2');

    const lockfile = readFileSync(resolve(repoRoot, 'pnpm-lock.yaml'), 'utf8');
    const request = uiSelectRequest(lockfile);
    expect(request.specifier).toBe('^2.1.2');
    expect(request.version.startsWith('2.1.2')).toBe(true);

    const layers = selectLayerVersions(lockfile, request.version);
    expect(layers.dismissableLayer).toMatch(/^1\.1\./);
    expect(layers.focusScope).toMatch(/^1\.1\./);
    expect(layers.dismissableLayer).not.toBe('1.0.4');
    expect(layers.focusScope).not.toBe('1.0.3');
  });
});

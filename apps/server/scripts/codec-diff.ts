/**
 * Shared structural-diff helpers for the codec verification scripts
 * (verify-codec / verify-content-codec / verify-create-parity). Compares an
 * original object against its round-trip, ignoring server-owned `id`s.
 */

/** Deep-clone a value with every `id` key removed (ids are server-owned, not round-tripped). */
export function stripIds(v: any): any {
  if (Array.isArray(v)) return v.map(stripIds);
  if (v && typeof v === 'object') {
    const out: any = {};
    for (const k of Object.keys(v)) {
      if (k === 'id') continue;
      out[k] = stripIds(v[k]);
    }
    return out;
  }
  return v;
}

export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => k in b && deepEqual(a[k], b[k]));
}

/** Field-path deltas between original and round-trip (both id-stripped). */
export function diffPaths(a: any, b: any, base = '', out: string[] = []): string[] {
  if (deepEqual(a, b)) return out;
  const ao = a && typeof a === 'object';
  const bo = b && typeof b === 'object';
  if (!ao || !bo || Array.isArray(a) !== Array.isArray(b)) {
    out.push(`changed:${base || '.'}`);
    return out;
  }
  if (Array.isArray(a)) {
    if (a.length !== b.length) out.push(`len:${base}`);
    for (let i = 0; i < Math.max(a.length, b.length); i++) diffPaths(a[i], b[i], `${base}[]`, out);
    return out;
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const p = base ? `${base}.${k}` : k;
    if (!(k in a)) out.push(`added:${p}`);
    else if (!(k in b)) out.push(`removed:${p}`);
    else diffPaths(a[k], b[k], p, out);
  }
  return out;
}

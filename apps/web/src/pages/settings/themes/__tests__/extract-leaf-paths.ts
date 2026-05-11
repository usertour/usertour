// Recursively enumerate dot-notation paths to every scalar leaf in a value.
// Treats strings, numbers, booleans, null, and arrays as leaves.
// Recurses into plain objects only. Skips properties whose value is `undefined`
// so missing optional fields don't show up as paths.

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

export function extractLeafPaths(value: unknown, prefix = ''): string[] {
  if (value === undefined) return [];
  if (!isPlainObject(value)) return prefix === '' ? [] : [prefix];

  const paths: string[] = [];
  for (const key of Object.keys(value)) {
    const child = value[key];
    if (child === undefined) continue;
    const next = prefix === '' ? key : `${prefix}.${key}`;
    paths.push(...extractLeafPaths(child, next));
  }
  return paths;
}

export function sortedLeafPaths(value: unknown): string[] {
  return extractLeafPaths(value).sort();
}

export function unionLeafPaths(...values: unknown[]): string[] {
  const set = new Set<string>();
  for (const value of values) {
    for (const path of extractLeafPaths(value)) set.add(path);
  }
  return [...set].sort();
}

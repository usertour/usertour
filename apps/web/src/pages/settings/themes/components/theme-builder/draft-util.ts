// Pure (non-React) utilities the draft hook builds on. Extracted so the
// round-trip test can exercise them directly without mounting React.

export const cloneDeep = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const getPath = (obj: unknown, path: string): unknown => {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
};

export const setPath = <T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown,
): T => {
  const next = cloneDeep(obj);
  const keys = path.split('.');
  let target: Record<string, unknown> = next as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const child = target[key];
    if (child === undefined || child === null || typeof child !== 'object') {
      target[key] = {};
    }
    target = target[key] as Record<string, unknown>;
  }
  target[keys[keys.length - 1]] = value;
  return next;
};

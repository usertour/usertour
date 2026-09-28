/**
 * The path of the first own `__proto__` key in a parsed JSON body, if any.
 * JSON.parse keeps it as an own key, but `z.record` drops it before the key
 * rule sees it, so the body would be accepted with that key silently
 * ignored — and no API here has a legitimate use for the name. Checked on
 * the raw body by every entry point that parses one with zod: the v2 pipe
 * and the MCP transport.
 */
export const protoKeyPath = (value: unknown, path = ''): string | undefined => {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const found = protoKeyPath(value[i], `${path}[${i}]`);
      if (found) {
        return found;
      }
    }
    return undefined;
  }
  for (const key of Object.keys(value)) {
    const keyPath = path ? `${path}.${key}` : key;
    if (key === '__proto__') {
      return keyPath;
    }
    const found = protoKeyPath((value as Record<string, unknown>)[key], keyPath);
    if (found) {
      return found;
    }
  }
  return undefined;
};

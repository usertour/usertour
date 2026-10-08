/**
 * The path of the first own `__proto__` key in a parsed JSON body, if any.
 * JSON.parse keeps it as an own key, but `z.record` drops it before the key
 * rule sees it, so the body would be accepted with that key silently
 * ignored — and no API here has a legitimate use for the name. Checked on
 * the raw body by every entry point that parses one with zod: the v2 pipe
 * and the MCP transport.
 *
 * Walked with an explicit stack: a body nested as deep as the size limit
 * allows must not overflow the call stack.
 */
export const protoKeyPath = (value: unknown): string | undefined => {
  const stack: Array<{ value: unknown; path: string }> = [{ value, path: '' }];
  while (stack.length > 0) {
    const { value: current, path } = stack.pop() as { value: unknown; path: string };
    if (current === null || typeof current !== 'object') {
      continue;
    }
    if (Array.isArray(current)) {
      // Pushed in reverse so the walk reports the first match in order.
      for (let i = current.length - 1; i >= 0; i--) {
        stack.push({ value: current[i], path: `${path}[${i}]` });
      }
      continue;
    }
    const keys = Object.keys(current);
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      const keyPath = path ? `${path}.${key}` : key;
      if (key === '__proto__') {
        return keyPath;
      }
      stack.push({ value: (current as Record<string, unknown>)[key], path: keyPath });
    }
  }
  return undefined;
};

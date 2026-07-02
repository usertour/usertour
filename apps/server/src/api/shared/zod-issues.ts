import type { ValidationIssue } from '@/common/errors/errors';

/** zod path array → `a[0].b`-style path, matching the write guards' path style. */
export function formatZodPath(
  path: ReadonlyArray<string | number | symbol> | undefined,
): string | undefined {
  if (!path?.length) {
    return undefined;
  }
  let out = '';
  for (const seg of path) {
    out += typeof seg === 'number' ? `[${seg}]` : out ? `.${String(seg)}` : String(seg);
  }
  return out;
}

/**
 * Map a zod error's issues to structured ValidationIssues (rule `schema`) —
 * ALL of them, not just the first, so a client can fix every schema problem in
 * one round-trip. `pathPrefix` roots the zod-relative paths in the request body
 * (e.g. `data` for a version's data body).
 */
export function zodIssuesToValidationIssues(
  error: unknown,
  pathPrefix?: string,
): ValidationIssue[] {
  const raw =
    (error as { issues?: { message?: string; path?: (string | number)[] }[] })?.issues ?? [];
  return raw.map((issue) => {
    const path = formatZodPath(issue.path);
    const prefixed = pathPrefix ? (path ? `${pathPrefix}.${path}` : pathPrefix) : path;
    return {
      rule: 'schema' as const,
      message: issue.message ?? 'Invalid input',
      ...(prefixed ? { path: prefixed } : {}),
    };
  });
}

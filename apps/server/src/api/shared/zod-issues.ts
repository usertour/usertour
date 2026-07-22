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
    (
      error as {
        issues?: { code?: string; keys?: string[]; message?: string; path?: (string | number)[] }[];
      }
    )?.issues ?? [];
  return raw.flatMap((issue) => {
    const path = formatZodPath(issue.path);
    const prefixed = pathPrefix ? (path ? `${pathPrefix}.${path}` : pathPrefix) : path;

    // zod reports strict-mode violations as ONE `unrecognized_keys` issue hung
    // on the OBJECT ("Unrecognized keys: a, b, c" with no per-key path). Split
    // it so each stray key gets its own issue WITH a path — the whole point of
    // `issues` is per-field, machine-actionable errors.
    if (issue.code === 'unrecognized_keys' && issue.keys?.length) {
      return issue.keys.map((key) => ({
        rule: 'schema' as const,
        message: `Unrecognized key: "${key}"`,
        path: prefixed ? `${prefixed}.${key}` : key,
      }));
    }

    return [
      {
        rule: 'schema' as const,
        message: issue.message ?? 'Invalid input',
        ...(prefixed ? { path: prefixed } : {}),
      },
    ];
  });
}

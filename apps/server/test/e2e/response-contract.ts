import { appendFileSync } from 'node:fs';

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { ZodType } from 'zod';

import { contentAnalytics } from '@/api/analytics/analytics.schema';

/**
 * Response-contract check for the v2 API, wired into every e2e spec by
 * `createTestApp`.
 *
 * The v2 surface is contract-first: each response DTO is `createZodDto(schema)`
 * and the published OpenAPI is GENERATED from those same schemas. What nothing
 * enforced is the other half — that the hand-written mappers actually PRODUCE
 * what the schema promises. Mappers are typed (`Company`, `ContentVersion`, …)
 * so TypeScript catches a missing or misspelled key, but their input is `any`
 * (Prisma rows, decompiled JSON), so a value-level drift — a null where the
 * schema says string, an enum member the codec never mapped, a stray key spread
 * in from a domain row — compiles clean and ships.
 *
 * So: intercept every v2 response, recover the declared DTO from the route's
 * `@ApiResponse` metadata, and parse the body through the DTO's zod schema.
 * Two failure kinds are reported:
 *
 *   - `schema`  — safeParse rejected (missing required, wrong type, bad enum)
 *   - `extra`   — parse succeeded but the body carried keys the schema does not
 *                 declare. zod STRIPS unknown keys rather than rejecting, so
 *                 these are invisible to safeParse; they are found by diffing
 *                 the raw body against the parsed output. An undocumented field
 *                 is a real defect: clients generated from the spec cannot see
 *                 it, and it silently becomes part of the de-facto contract.
 *
 * Violations are collected rather than thrown: throwing here would surface as a
 * 500 and wreck the spec's own assertions, hiding what actually broke. Each
 * suite asserts its own tally from the global `afterAll` in
 * ../setup-contract-e2e.ts — deliberately NOT from `app.close()`, which a spec
 * can race against a timeout and thereby skip.
 *
 * Set `CONTRACT_CHECK=off` to disable (e.g. to confirm a failure is the check
 * itself and not the code under test).
 */

export type ContractViolation = {
  method: string;
  route: string;
  status: number;
  kind: 'schema' | 'extra';
  detail: string;
};

/** Every (method, route, status) a spec run actually exercised. */
export type ContractCoverage = {
  method: string;
  route: string;
  status: number;
  validated: boolean;
};

const violations: ContractViolation[] = [];
const coverage = new Map<string, ContractCoverage>();

export const contractViolations = (): ContractViolation[] => [...violations];
export const contractCoverage = (): ContractCoverage[] => [...coverage.values()];
export const resetContractState = () => {
  violations.length = 0;
  coverage.clear();
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Keys present in `actual` that `parsed` (the zod output) dropped — i.e. fields
 * the schema does not declare. Undefined-valued keys are ignored: zod removes
 * them from its output and JSON would drop them anyway, so they are not part of
 * the wire contract.
 */
function undeclaredKeys(actual: unknown, parsed: unknown, path = ''): string[] {
  if (Array.isArray(actual) && Array.isArray(parsed)) {
    // Only the first few elements: a 100-item page repeats the same shape, and
    // one report per field beats one per row.
    return actual.slice(0, 3).flatMap((v, i) => undeclaredKeys(v, parsed[i], `${path}[${i}]`));
  }
  if (isPlainObject(actual) && isPlainObject(parsed)) {
    const out: string[] = [];
    for (const [k, v] of Object.entries(actual)) {
      if (v === undefined) continue;
      const at = path ? `${path}.${k}` : k;
      if (!(k in parsed)) out.push(at);
      else out.push(...undeclaredKeys(v, parsed[k], at));
    }
    return out;
  }
  return [];
}

type ZodDtoClass = { isZodDto?: boolean; schema?: ZodType };

/** The DTO declared for this exact status, via `@ApiResponse({ status, type })`. */
function declaredDto(handler: object, status: number): ZodDtoClass | undefined {
  const meta = Reflect.getMetadata(DECORATORS.API_RESPONSE, handler) as
    | Record<string, { type?: unknown }>
    | undefined;
  const type = meta?.[String(status)]?.type as ZodDtoClass | undefined;
  return type?.isZodDto ? type : undefined;
}

/**
 * Routes whose declared response is a stitched oneOf UNION: a class cannot
 * extend a zod union, so the controller documents per-variant DTOs and no
 * single `@ApiResponse` type carries the schema — `declaredDto` comes back
 * empty and the route would silently skip validation. Explicit fallbacks so
 * the union-shaped responses (analytics: the most drift-prone family on the
 * surface) are still checked against their real zod union.
 */
const UNION_FALLBACKS: Array<{ method: string; routeEnd: string; schema: ZodType }> = [
  { method: 'GET', routeEnd: '/analytics', schema: contentAnalytics as unknown as ZodType },
];

@Injectable()
export class ResponseContractInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (process.env.CONTRACT_CHECK === 'off') return next.handle();
    if (ctx.getType() !== 'http') return next.handle();

    const http = ctx.switchToHttp();
    const req = http.getRequest<{ url?: string; method?: string; route?: { path?: string } }>();
    if (!req.url?.startsWith('/v2/')) return next.handle();

    return next.handle().pipe(
      tap((body) => {
        const status: number = http.getResponse().statusCode ?? 200;
        const method = req.method ?? 'GET';
        // Express fills `route.path` with the matched pattern, e.g.
        // /v2/projects/:projectId/content/:id — the OpenAPI path template
        // modulo `{}` vs `:`. Fall back to the raw url if it is ever absent.
        const route = req.route?.path ?? req.url ?? '?';
        const key = `${method} ${route} ${status}`;

        if (status < 200 || status >= 300) return;

        const dto = declaredDto(ctx.getHandler(), status);
        const schema =
          dto?.schema ??
          UNION_FALLBACKS.find((f) => f.method === method && route.endsWith(f.routeEnd))?.schema;
        if (!schema) {
          // 204s legitimately declare no body; anything else means the route
          // documents no schema for the status it actually returned.
          coverage.set(key, { method, route, status, validated: false });
          return;
        }
        coverage.set(key, { method, route, status, validated: true });

        const result = schema.safeParse(body);
        if (!result.success) {
          for (const issue of result.error.issues.slice(0, 5)) {
            const at = issue.path.join('.') || '<root>';
            violations.push({
              method,
              route,
              status,
              kind: 'schema',
              detail: `${at}: ${issue.message}`,
            });
          }
          return;
        }
        for (const k of undeclaredKeys(body, result.data).slice(0, 5)) {
          violations.push({
            method,
            route,
            status,
            kind: 'extra',
            detail: `undeclared field \`${k}\``,
          });
        }
      }),
    );
  }
}

/**
 * Appends this app's coverage rows as JSONL when `CONTRACT_COVERAGE_OUT` names a
 * file. Answers "which of the v2 operations does the e2e suite actually exercise
 * (and validate)?" — jest reuses worker processes, so aggregation has to happen
 * on disk rather than in module state.
 */
export function dumpContractCoverage(): void {
  const out = process.env.CONTRACT_COVERAGE_OUT;
  if (!out || !coverage.size) return;
  appendFileSync(out, `${[...coverage.values()].map((c) => JSON.stringify(c)).join('\n')}\n`);
}

/**
 * Throws if this spec file produced contract violations, then clears the tally
 * so the next spec starts clean (jest reuses the worker, and this module's state
 * with it). Called from the global `afterAll` in test/setup-contract-e2e.ts, so
 * a suite fails on its OWN violations, next to the spec that caused them.
 */
export function assertNoContractViolations(): void {
  const found = violations.length;
  if (!found) {
    resetContractState();
    return;
  }
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const v of violations) {
    const line = `  ${v.method} ${v.route} [${v.status}] ${v.kind}: ${v.detail}`;
    if (seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
  }
  resetContractState();
  throw new Error(
    `v2 response contract: ${found} violation(s) — the response did not match the ` +
      `zod schema the OpenAPI spec is generated from:\n${lines.join('\n')}`,
  );
}

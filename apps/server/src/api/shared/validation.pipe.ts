import type { ArgumentMetadata } from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';

import { ValidationError } from '@/modules/common/errors/errors';

import { zodIssuesToValidationIssues } from './zod-issues';

const ZodPipe = createZodValidationPipe({
  createValidationException: (error: unknown) => {
    // Report EVERY schema issue (with its path), not just the first — so a
    // client fixes the whole request in one round-trip.
    const issues = zodIssuesToValidationIssues(error);
    return issues.length
      ? ValidationError.fromIssues(issues)
      : new ValidationError('Validation error');
  },
});

/**
 * The path of the first own `__proto__` key in a parsed JSON body, if any.
 * JSON.parse keeps it as an own key, but `z.record` drops it before the key
 * rule sees it, so the body would be accepted with that key silently
 * ignored — and no API here has a legitimate use for the name.
 */
const protoKeyPath = (value: unknown, path = ''): string | undefined => {
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

/**
 * v2 request validation pipe. On a zod failure it throws the shared
 * {@link ValidationError} (code E1017) so the OpenAPIExceptionFilter renders the
 * documented error envelope — keeping v2 validation errors code-aligned with v1.
 *
 * The nestjs-zod coupling lives here (in the v2 module), so the shared exception
 * filter stays generic and zod-agnostic.
 */
export class ApiValidationPipe extends ZodPipe {
  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type === 'body') {
      const path = protoKeyPath(value);
      if (path) {
        throw ValidationError.fromIssues([
          { path, message: '"__proto__" is not a valid key', rule: 'schema' },
        ]);
      }
    }
    return super.transform(value, metadata);
  }
}

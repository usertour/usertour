import { createZodValidationPipe } from 'nestjs-zod';

import { ValidationError } from '@/common/errors/errors';

import { zodIssuesToValidationIssues } from './zod-issues';

/**
 * v2 request validation pipe. On a zod failure it throws the shared
 * {@link ValidationError} (code E1017) so the OpenAPIExceptionFilter renders the
 * documented error envelope — keeping v2 validation errors code-aligned with v1.
 *
 * The nestjs-zod coupling lives here (in the v2 module), so the shared exception
 * filter stays generic and zod-agnostic.
 */
export const ApiValidationPipe = createZodValidationPipe({
  createValidationException: (error: unknown) => {
    // Report EVERY schema issue (with its path), not just the first — so a
    // client fixes the whole request in one round-trip.
    const issues = zodIssuesToValidationIssues(error);
    return issues.length
      ? ValidationError.fromIssues(issues)
      : new ValidationError('Validation error');
  },
});

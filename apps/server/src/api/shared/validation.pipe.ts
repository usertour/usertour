import { createZodValidationPipe } from 'nestjs-zod';

import { ValidationError } from '@/common/errors/errors';

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
    const issue = (error as { issues?: { message?: string }[] })?.issues?.[0];
    return new ValidationError(issue?.message ?? 'Validation error');
  },
});

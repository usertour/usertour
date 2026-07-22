import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * The v2 error envelope, exactly as OpenAPIExceptionFilter emits it. Declared
 * once so every endpoint's 400/401/403 (and any error status) shares ONE typed
 * shape in the OpenAPI document — before this, no 4xx except 404/409 was
 * declared at all, so generated clients had no type for the most common
 * failures (validation and auth).
 */
const errorIssue = z.object({
  rule: z
    .string()
    .describe(
      'Which validation layer rejected it: schema | reactive_condition | action_not_allowed | ' +
        'step_shape | reference_target | auto_start.',
    ),
  message: z.string(),
  path: z
    .string()
    .optional()
    .describe('Path into the request body (e.g. `steps[0].triggers[0].when[1]`).'),
});

export const errorResponse = z.object({
  error: z.object({
    code: z
      .string()
      .describe('Stable machine-readable code (e.g. E1017). Match on this, never on `message`.'),
    message: z.string().describe('Human-readable summary. Wording may change between releases.'),
    issues: z
      .array(errorIssue)
      .optional()
      .describe(
        'Validation errors (E1017) may carry one entry per problem so every field can be fixed ' +
          'in a single round-trip. Absent on other errors.',
      ),
    doc_url: z.string().describe('Base URL of the API documentation.'),
  }),
});

export class ErrorResponseDto extends createZodDto(errorResponse) {}

/**
 * Class-level declaration of the error statuses EVERY v2 endpoint can produce:
 * 400 (invalid request), 401 (missing/expired key), 403 (invalid key /
 * insufficient scope / out-of-scope project or environment). Apply once per
 * controller — per-method decorators stay for endpoint-specific statuses
 * (404 / 409 / 422).
 */
export function ApiStandardErrorResponses() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description:
        'Invalid request — E1017 validation (may carry `issues`; an invalid orderBy/limit is ' +
        'also E1017), E1015 invalid scope, E0003 invalid against current domain state.',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Missing or expired API key — E1010, E1020.',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 403,
      description:
        'Refused — E1000 invalid key, E1011 project not in token scope, E1012 insufficient ' +
        'scope, E1029 environment not in token scope, E1032 environment creation needs a ' +
        'full-scope token.',
      type: ErrorResponseDto,
    }),
  );
}

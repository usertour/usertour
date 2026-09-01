import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ApiObjectType } from '../shared/object-type';

/**
 * `GET /v2/me` — token introspection / scope discovery. The one v2 route with
 * no project in the path: integration platforms (Zapier and friends) call it
 * to validate a pasted token and to populate project/environment pickers,
 * so it lists exactly what the token can act on — never more.
 */

const environmentSummary = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.ENVIRONMENT),
  name: z.string(),
});

const projectSummary = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.PROJECT),
  name: z.string(),
  /** Environments of this project the token may act on. */
  environments: z.array(environmentSummary),
});

export const me = z.object({
  object: z.literal(ApiObjectType.ME),
  /** The token's display name, as shown in Settings → API. */
  tokenName: z.string(),
  /** Projects the token may act on, each with its in-scope environments. */
  projects: z.array(projectSummary),
});

export class MeResponseDto extends createZodDto(me) {}

import { Reflector } from '@nestjs/core';
import type { ExplicitAuditMeta } from './audit.types';

/**
 * Explicit audit metadata for write endpoints that don't carry
 * `@RequireCapability` — i.e. the v1 `src/openapi` REST surface (it authenticates
 * with an environment `AccessToken`, not a user `ApiToken`). The AuditInterceptor
 * reads this and records `source='api'` with the access-token as the actor.
 *
 *   @Audit({ action: 'delete', resourceType: 'user' })
 */
export const Audit = Reflector.createDecorator<ExplicitAuditMeta>();

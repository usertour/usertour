import { Reflector } from '@nestjs/core';
import type { ExplicitAuditMeta, WebAuditMeta } from './audit.types';

/**
 * Explicit audit metadata for write endpoints that don't carry
 * `@RequireCapability` — i.e. the v1 `src/openapi` REST surface (it authenticates
 * with an environment `AccessToken`, not a user `ApiToken`). The AuditInterceptor
 * reads this and records `source='api'` with the access-token as the actor.
 *
 *   @Audit({ action: 'delete', resourceType: 'user' })
 */
export const Audit = Reflector.createDecorator<ExplicitAuditMeta>();

/**
 * Explicit audit metadata for web-admin GraphQL mutations. Selective opt-in
 * (only meaningful lifecycle / config mutations carry it); the AuditInterceptor's
 * GraphQL branch records `source='web'` with the logged-in user as the actor.
 *
 *   @AuditWeb({ action: 'delete', resourceType: 'theme' })
 *   @AuditWeb({ action: 'create', resourceType: 'content', resourceId: (_a, r) => (r as { id: string }).id })
 */
export const AuditWeb = Reflector.createDecorator<WebAuditMeta>();

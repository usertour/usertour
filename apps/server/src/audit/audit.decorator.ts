import { Reflector } from '@nestjs/core';
import type { ExplicitAuditMeta, WebAuditMeta } from './audit.types';

/**
 * Explicit audit metadata for REST write endpoints: the v1 `src/openapi` surface
 * (no `@RequireCapability` to derive from; actor = environment `AccessToken`),
 * and v2 routes whose capability derives the wrong descriptor (membership
 * routes) — an explicit `@Audit` always wins over the capability derivation.
 * The AuditInterceptor records `source='api'` with the request's credential
 * (ApiToken or AccessToken) as the actor.
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
 *   @AuditWeb({ action: 'create', resourceType: 'content', resourceId: (_a, r) => String((r as { id?: string })?.id ?? '') })
 */
export const AuditWeb = Reflector.createDecorator<WebAuditMeta>();

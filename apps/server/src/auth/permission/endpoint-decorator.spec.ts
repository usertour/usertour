import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { RESOLVER_TYPE_METADATA } from '@nestjs/graphql';

import { AnalyticsResolver } from '@/analytics/analytics.resolver';
import { AttributesResolver } from '@/attributes/attributes.resolver';
import { AuditResolver } from '@/audit/audit.resolver';
import { BizResolver } from '@/biz/biz.resolver';
import { ContentResolver } from '@/content/content.resolver';
import { EnvironmentsResolver } from '@/environments/environments.resolver';
import { EventsResolver } from '@/events/events.resolver';
import { IntegrationsResolver } from '@/integrations/integrations.resolver';
import { LocalizationsResolver } from '@/domain/localizations/localizations.resolver';
import { ProjectsResolver } from '@/projects/projects.resolver';
import { SsoResolver } from '@/sso/sso.resolver';
import { SubscriptionResolver } from '@/subscription/subscription.resolver';
import { TeamResolver } from '@/team/team.resolver';
import { ThemesResolver } from '@/themes/themes.resolver';
import { WebhooksResolver } from '@/webhooks/webhooks.resolver';

import { ENDPOINT_CAPABILITY } from './endpoint-capability.map';
import { PermissionGuard } from './permission.guard';
import { RequirePermission } from './require-permission.decorator';

/**
 * Closes the loop between the endpoint→capability map and what the resolvers
 * actually declare: each `@RequirePermission` on a resolver method must carry
 * the capability the map assigns it, and there must be no guarded endpoint
 * missing from (or extra to) the map. Combined with the snapshot baseline
 * (capability → role set == old @Roles), this proves every endpoint
 * authorizes exactly the roles it did before the migration.
 */
const RESOLVERS: Record<string, new (...args: any[]) => any> = {
  analytics: AnalyticsResolver,
  attributes: AttributesResolver,
  audit: AuditResolver,
  biz: BizResolver,
  content: ContentResolver,
  environments: EnvironmentsResolver,
  events: EventsResolver,
  integration: IntegrationsResolver,
  localizations: LocalizationsResolver,
  projects: ProjectsResolver,
  sso: SsoResolver,
  subscription: SubscriptionResolver,
  team: TeamResolver,
  themes: ThemesResolver,
  webhooks: WebhooksResolver,
};

/**
 * Query/Mutation endpoints on the resolvers above that deliberately carry no
 * @RequirePermission. Every entry needs a reason: either the endpoint is
 * @Public (pre-login) or it reads instance-wide data that belongs to no
 * project. Anything else on these resolvers without a decorator is a leak —
 * the guard passes undecorated handlers through, and the subscription module
 * shipped that way (any signed-in user could read any project's plan/usage).
 */
const UNSCOPED_ENDPOINTS: Record<string, string> = {
  'sso.getProjectSsoProviders': 'public: login page lists providers before auth',
  'sso.getProjectSsoLogin': 'public: login page resolves the SSO redirect before auth',
  'subscription.getSubscriptionPlans': 'instance-wide plan catalogue, no project',
  'team.getInvite': 'public: invite acceptance looks the invite up by token',
};

const reflector = new Reflector();

const isGraphqlEndpoint = (handler: unknown): boolean => {
  const kind = Reflect.getMetadata(RESOLVER_TYPE_METADATA, handler as object);
  return kind === 'Query' || kind === 'Mutation';
};

describe('endpoint @RequirePermission ↔ capability map', () => {
  it('declares the mapped capability on every mapped endpoint', () => {
    const mismatches: string[] = [];
    for (const [key, capability] of Object.entries(ENDPOINT_CAPABILITY)) {
      const [moduleName, method] = key.split('.');
      const handler = RESOLVERS[moduleName]?.prototype?.[method];
      const required = handler && reflector.get(RequirePermission, handler);
      if (!required) {
        mismatches.push(`${key}: missing @RequirePermission`);
      } else if (required.capability !== capability) {
        mismatches.push(`${key}: map=${capability} but decorator=${required.capability}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('has every @RequirePermission endpoint present in the map (no orphans)', () => {
    const mapped = new Set(Object.keys(ENDPOINT_CAPABILITY));
    const decorated: string[] = [];
    for (const [moduleName, ResolverClass] of Object.entries(RESOLVERS)) {
      for (const method of Object.getOwnPropertyNames(ResolverClass.prototype)) {
        if (method === 'constructor') {
          continue;
        }
        if (reflector.get(RequirePermission, ResolverClass.prototype[method])) {
          decorated.push(`${moduleName}.${method}`);
        }
      }
    }
    // Orphans first — the diff names the culprit; the count alone doesn't.
    expect(decorated.filter((key) => !mapped.has(key))).toEqual([]);
    expect([...mapped].filter((key) => !decorated.includes(key))).toEqual([]);
    expect(decorated.length).toBe(mapped.size);
  });

  it('guards every Query/Mutation on these resolvers, or lists it as unscoped', () => {
    const mapped = new Set(Object.keys(ENDPOINT_CAPABILITY));
    const unguarded: string[] = [];
    for (const [moduleName, ResolverClass] of Object.entries(RESOLVERS)) {
      for (const method of Object.getOwnPropertyNames(ResolverClass.prototype)) {
        const handler = ResolverClass.prototype[method];
        if (method === 'constructor' || !isGraphqlEndpoint(handler)) {
          continue;
        }
        const key = `${moduleName}.${method}`;
        if (!mapped.has(key) && !(key in UNSCOPED_ENDPOINTS)) {
          unguarded.push(key);
        }
      }
    }
    expect(unguarded).toEqual([]);
    // The exemption list must not rot: every entry names a live endpoint that
    // is in fact undecorated.
    const stale = Object.keys(UNSCOPED_ENDPOINTS).filter((key) => {
      const [moduleName, method] = key.split('.');
      const handler = RESOLVERS[moduleName]?.prototype?.[method];
      return !handler || !isGraphqlEndpoint(handler) || reflector.get(RequirePermission, handler);
    });
    expect(stale).toEqual([]);
  });

  it('registers PermissionGuard on every resolver class (a decorator without the guard is inert)', () => {
    // PermissionGuard is not an APP_GUARD: it runs only where a resolver class
    // registers it. The subscription resolver once carried @RequirePermission
    // on every method and no class-level guard, so every check silently passed.
    const unguarded = Object.entries(RESOLVERS)
      .filter(([, ResolverClass]) => {
        const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, ResolverClass) ?? [];
        return !guards.includes(PermissionGuard);
      })
      .map(([moduleName]) => moduleName);
    expect(unguarded).toEqual([]);
  });
});

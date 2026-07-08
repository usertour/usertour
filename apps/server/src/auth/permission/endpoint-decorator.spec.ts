import { Reflector } from '@nestjs/core';

import { AnalyticsResolver } from '@/analytics/analytics.resolver';
import { AttributesResolver } from '@/attributes/attributes.resolver';
import { AuditResolver } from '@/audit/audit.resolver';
import { BizResolver } from '@/biz/biz.resolver';
import { ContentResolver } from '@/content/content.resolver';
import { EnvironmentsResolver } from '@/environments/environments.resolver';
import { EventsResolver } from '@/events/events.resolver';
import { IntegrationResolver } from '@/integration/integration.resolver';
import { LocalizationsResolver } from '@/localizations/localizations.resolver';
import { ProjectsResolver } from '@/projects/projects.resolver';
import { TeamResolver } from '@/team/team.resolver';
import { ThemesResolver } from '@/themes/themes.resolver';

import { ENDPOINT_CAPABILITY } from './endpoint-capability.map';
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
  integration: IntegrationResolver,
  localizations: LocalizationsResolver,
  projects: ProjectsResolver,
  team: TeamResolver,
  themes: ThemesResolver,
};

const reflector = new Reflector();

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
});

import { Reflector } from '@nestjs/core';
import { Capability } from '@usertour/types';

import { ScopeKind } from './scope-resolver.registry';

/**
 * Declares the capability an endpoint requires and how to resolve the
 * owning project (scope). Read by PermissionGuard.
 *
 * Replaces the old `@Roles([...])` enumeration: instead of listing which
 * roles may call the endpoint, declare the single capability it needs and
 * let ROLE_CAPABILITIES decide which roles hold it.
 *
 *   @RequirePermission({ capability: Capability.ContentPublish, scope: ScopeKind.Content })
 */
export interface RequiredPermission {
  capability: Capability;
  scope: ScopeKind;
}

export const RequirePermission = Reflector.createDecorator<RequiredPermission>();

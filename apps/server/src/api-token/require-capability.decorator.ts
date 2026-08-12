import { Reflector } from '@nestjs/core';
import { Capability } from '@usertour/types';

/**
 * Declares the Capability an OpenAPI v2 endpoint requires. Read by
 * {@link ApiTokenGuard}, which authorizes a request iff the capability is in
 * `ROLE_CAPABILITIES[owner's role on the project] ∩ token.scopes`.
 *
 * The owning project is taken from the `:projectId` path param (v2 routes are
 * project-rooted), so — unlike the GraphQL `@RequirePermission` — no scope
 * resolver is needed here.
 *
 *   @RequireCapability(Capability.ContentRead)
 */
export const RequireCapability = Reflector.createDecorator<Capability>();

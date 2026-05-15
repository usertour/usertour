import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { SKIP_2FA_ENROLLMENT_KEY } from '@/common/decorators/skip-2fa-enrollment.decorator';
import { TwoFactorEnrollmentRequiredError } from '@/common/errors';
import { TwoFactorService } from '@/auth/two-factor.service';

/**
 * Server-side enforcement of the instance-level "require 2FA for all users"
 * policy. Without this, a non-browser API client that already held a valid
 * access token at the moment the admin flipped enforcement could keep
 * calling GraphQL until its token expired — the SPA route guard would never
 * see those requests.
 *
 * Runs as APP_GUARD after GqlAuthGuard. Pass-through cases:
 *   - non-GraphQL contexts (REST callbacks, websockets)
 *   - `@Public()` operations (no user to check)
 *   - GraphQL ResolveField calls (the parent operation already passed)
 *   - operations explicitly marked `@SkipTwoFactorEnrollment()` (the minimal
 *     bootstrap surface a non-enrolled user needs to finish enrollment)
 *   - users who are already enrolled
 *   - instances that do not enforce 2FA
 * Everything else → `TwoFactorEnrollmentRequiredError`.
 */
@Injectable()
export class TwoFactorEnrollmentGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType<'graphql'>() !== 'graphql') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const gqlCtx = GqlExecutionContext.create(context);
    const info = gqlCtx.getInfo();
    // Skip ResolveField handlers — enforce only on the top-level
    // Query/Mutation. Otherwise marking `me` exempt forces us to also mark
    // every ResolveField on User (projects, isOAuthUser, ...).
    const parentTypeName = info?.parentType?.name;
    if (parentTypeName !== 'Query' && parentTypeName !== 'Mutation') {
      return true;
    }

    const user = gqlCtx.getContext().req?.user;
    if (!user || user.twoFactorEnabled) {
      return true;
    }

    const exempt = this.reflector.getAllAndOverride<boolean>(SKIP_2FA_ENROLLMENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (exempt) {
      return true;
    }

    if (await this.twoFactorService.isInstanceEnforcing()) {
      throw new TwoFactorEnrollmentRequiredError();
    }
    return true;
  }
}

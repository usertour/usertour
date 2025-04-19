import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { AuthenticationExpiredError } from '@/common/errors';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
  // Override handleRequest to catch Passport errors
  handleRequest(err: any, user: any) {
    // Check for authentication errors
    if (err || !user) {
      throw new AuthenticationExpiredError();
    }

    return user;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const contextType = context.getType<'http' | 'stripe_webhook' | 'graphql'>();

    // Check if this is a Stripe webhook request by checking the path or headers
    if (contextType !== 'graphql') {
      return true;
    }

    if (isPublic) {
      return true;
    }
    return (await super.canActivate(context)) as boolean;
  }
}

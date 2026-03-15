import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import { NoPermissionError } from '@/common/errors';

@Injectable()
export class SystemAdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isSelfHostedMode = this.configService.get('globalConfig.isSelfHostedMode');
    if (!isSelfHostedMode) {
      throw new NoPermissionError();
    }

    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    const user = req.user;

    if (!user?.isSystemAdmin) {
      throw new NoPermissionError();
    }

    return true;
  }
}

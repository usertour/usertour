import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Environment } from '@/environments/models/environment.model';

export const EnvironmentDecorator = createParamDecorator((_, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.environment as Environment;
});

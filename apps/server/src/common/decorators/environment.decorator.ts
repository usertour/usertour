import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Environment } from '@prisma/client';

export const EnvironmentDecorator = createParamDecorator((_, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.environment as Environment;
});

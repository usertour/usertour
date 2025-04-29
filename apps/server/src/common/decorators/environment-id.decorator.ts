import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const EnvironmentId = createParamDecorator((_, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.environment.id;
});

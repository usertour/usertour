import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const UserEntity = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => GqlExecutionContext.create(ctx).getContext().req.user,
);

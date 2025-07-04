import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';

export const WebSocketEnvironment = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const client: Socket = ctx.switchToHttp().getRequest();
    return client.data.environment;
  },
);

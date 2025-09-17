import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SocketClientData } from '@/common/types';

export const WebSocketEnvironment = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const client: Socket = ctx.switchToWs().getClient();
    return client.data.environment;
  },
);

/**
 * Decorator to extract socket client data that was injected by WebSocketClientDataInterceptor
 * This decorator simply returns the pre-fetched data from the client object
 */
export const WebSocketClientData = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SocketClientData | null => {
    const client: Socket = ctx.switchToWs().getClient();
    return client.data.socketClientData || null;
  },
);

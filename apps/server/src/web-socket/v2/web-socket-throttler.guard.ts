import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { Socket } from 'socket.io';

/**
 * Custom WebSocket throttler guard that uses socket ID as the rate limit key.
 * This ensures rate limiting is applied per WebSocket connection rather than per IP.
 *
 * Note: ThrottlerModule must be configured with `setHeaders: false` since
 * WebSocket doesn't have HTTP response headers.
 */
@Injectable()
export class WebSocketThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(WebSocketThrottlerGuard.name);

  /**
   * Override to use socket.id as the rate limit tracker key
   */
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const socket = req as unknown as Socket;

    if (socket?.id) {
      return `ws:${socket.id}`;
    }

    const address = socket?.handshake?.address;
    if (address) {
      this.logger.debug(`Fallback to IP address as tracker: ${address}`);
      return `ws:ip:${address}`;
    }

    this.logger.warn('Unable to determine socket tracker, using generic key');
    return 'ws:unknown';
  }

  /**
   * Override to extract Socket from WebSocket context instead of HTTP request
   */
  protected getRequestResponse(context: ExecutionContext) {
    const client = context.switchToWs().getClient<Socket>();
    return { req: client as unknown as Record<string, unknown>, res: {} };
  }

  /**
   * Override to log when rate limit is exceeded
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const { tracker, totalHits, limit, ttl, timeToExpire } = throttlerLimitDetail;

    this.logger.warn(
      `Rate limit exceeded: tracker=${tracker}, hits=${totalHits}/${limit}, ` +
        `ttl=${ttl}ms, retryAfter=${Math.ceil(timeToExpire / 1000)}s`,
    );

    return super.throwThrottlingException(context, throttlerLimitDetail);
  }
}

import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { Socket } from 'socket.io';

/**
 * The message objects the guard refused, awaiting the handler's `false`. Keyed
 * by the message itself, not by the socket: two messages of one socket may
 * interleave between guard and handler once the counter lives behind real
 * I/O (a Redis storage, say), and a mark on the socket could then be taken
 * by the wrong one.
 */
const refusedMessages = new WeakSet<object>();

/**
 * Custom WebSocket throttler guard that uses socket ID as the rate limit key.
 * This ensures rate limiting is applied per WebSocket connection rather than per IP.
 *
 * A refused message is not answered with an exception: Nest turns a guard's
 * throw into an `exception` event, never into the acknowledgement the SDK
 * waits for, and the SDK then takes the silence for a network failure and
 * resends the message (ADR 0018 §4). The guard marks the message instead
 * and the handler answers it `false`.
 *
 * Note: ThrottlerModule must be configured with `setHeaders: false` since
 * WebSocket doesn't have HTTP response headers.
 */
@Injectable()
export class WebSocketThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(WebSocketThrottlerGuard.name);

  /** Whether the guard refused this message; clears the mark. */
  static consumeRefusal(message: unknown): boolean {
    if (message === null || typeof message !== 'object') {
      return false;
    }
    return refusedMessages.delete(message);
  }

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
   * Override: log, mark the message, and let the handler answer — the base
   * class would throw, which leaves the message without an acknowledgement.
   * A message that is not an object cannot be marked; validation refuses it
   * with the same `false` right after.
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
    const message = context.switchToWs().getData<unknown>();
    if (message !== null && typeof message === 'object') {
      refusedMessages.add(message);
    }
  }
}

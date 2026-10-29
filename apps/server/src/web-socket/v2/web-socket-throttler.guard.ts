import { Injectable, Inject, ExecutionContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerLimitDetail,
  ThrottlerModuleOptions,
  ThrottlerStorageService,
} from '@nestjs/throttler';
import { Socket } from 'socket.io';
import { positiveNumberSetting } from '@/modules/common/utils/positive-number-setting.util';

/**
 * The message objects the guard refused, awaiting the handler's `false`. Keyed
 * by the message itself, not by the socket: two messages of one socket may
 * interleave between guard and handler once the counter lives behind real
 * I/O (a Redis storage, say), and a mark on the socket could then be taken
 * by the wrong one.
 */
const refusedMessages = new WeakSet<object>();

/**
 * The gateway's limits, per socket:
 * - short: 30 messages per second (burst protection)
 * - medium: 300 messages per minute (sustained rate)
 *
 * Built here rather than registered through `ThrottlerModule`: that module is
 * global and keeps one options token for the whole application, so two
 * registrations do not add up — one wins for every guard. The gateway once
 * ran under the v2 REST limiter's 1000 per minute that way. Both guards now
 * build their own options, and nothing registers the module.
 */
const webSocketThrottlerOptions = (config: ConfigService): ThrottlerModuleOptions => ({
  // Disable HTTP response headers since WebSocket doesn't have HTTP response
  // This prevents "Cannot read properties of undefined (reading 'header')" error
  setHeaders: false,
  throttlers: [
    {
      name: 'short',
      ttl: positiveNumberSetting(config.get('WS_THROTTLE_SHORT_TTL'), 1000),
      limit: positiveNumberSetting(config.get('WS_THROTTLE_SHORT_LIMIT'), 30),
    },
    {
      name: 'medium',
      ttl: positiveNumberSetting(config.get('WS_THROTTLE_MEDIUM_TTL'), 60000),
      limit: positiveNumberSetting(config.get('WS_THROTTLE_MEDIUM_LIMIT'), 300),
    },
  ],
});

/**
 * Custom WebSocket throttler guard that uses socket ID as the rate limit key.
 * This ensures rate limiting is applied per WebSocket connection rather than per IP.
 *
 * A refused message is not answered with an exception: Nest turns a guard's
 * throw into an `exception` event, never into the acknowledgement the SDK
 * waits for, and the SDK then takes the silence for a network failure and
 * resends the message (ADR 0018 §4). The guard marks the message instead
 * and the handler answers it `false`.
 */
@Injectable()
export class WebSocketThrottlerGuard extends ThrottlerGuard {
  // The base class declares a protected logger of its own; this one names
  // the guard, so its lines are filed under it.
  protected readonly logger = new Logger(WebSocketThrottlerGuard.name);

  // The base class injects its options and storage by the module's tokens,
  // and a subclass inherits those parameter declarations: each one is named
  // again here so that this constructor's own dependencies are resolved. The
  // storage is the module's own instance (a provider of WebSocketModule), so
  // the counters never share a store with the REST limiter.
  constructor(
    @Inject(ConfigService) config: ConfigService,
    @Inject(ThrottlerStorageService) storage: ThrottlerStorageService,
    reflector: Reflector,
  ) {
    super(webSocketThrottlerOptions(config), storage, reflector);
  }

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

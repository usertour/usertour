import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pLimit from 'p-limit';

/** Thrown to the caller whose unit of work waited longer than it may for a slot. */
export class AdmissionTimeoutError extends Error {
  constructor(label: string, waitedMs: number) {
    super(`${label} waited ${waitedMs}ms for a slot and was refused`);
    this.name = 'AdmissionTimeoutError';
  }
}

const ABANDONED = Symbol('abandoned');

/**
 * Admission control for the websocket work of one replica.
 *
 * Every handshake and every client message is one unit of work, and at most
 * `WS_ADMISSION_CONCURRENCY` of them run at a time; the rest wait here, as a
 * queued promise, which costs nothing. The limit exists for the query engine:
 * its connection pool handles a bounded number of concurrent requests well
 * and a burst of hundreds badly, and a replica restart delivers exactly that
 * burst, every client reconnecting and evaluating at once. Bounded here, the
 * burst becomes queueing delay instead of a saturated engine.
 *
 * A unit that cannot start within its wait is refused with
 * AdmissionTimeoutError and never runs; the caller answers the client, which
 * retries with its own backoff. The waits are shorter than what the client
 * tolerates (its connect timeout, its acknowledgement timeout) on purpose: a
 * refusal the client sees beats a success it has given up on.
 *
 * Handshakes are also paced: `WS_HANDSHAKE_RATE_PER_SECOND` admits that many
 * new connections per second per replica (with the same burst allowance), the
 * excess refused before any work is done. A reconnect storm then arrives over
 * seconds instead of all at once.
 *
 * Either control is off when its variable is 0.
 */
@Injectable()
export class AdmissionService {
  private readonly logger = new Logger(AdmissionService.name);
  private readonly limit: ReturnType<typeof pLimit> | undefined;
  readonly concurrency: number;
  readonly handshakeWaitMs: number;
  readonly messageWaitMs: number;
  readonly handshakeRatePerSecond: number;

  private tokens: number;
  private tokensRefilledAt = Date.now();
  private lastWarnAt = 0;

  constructor(configService: ConfigService) {
    // Number(...) is load-bearing: environment values are strings.
    this.concurrency = Number(configService.get('WS_ADMISSION_CONCURRENCY') ?? 16);
    this.handshakeWaitMs = Number(configService.get('WS_ADMISSION_HANDSHAKE_WAIT_MS') ?? 15_000);
    this.messageWaitMs = Number(configService.get('WS_ADMISSION_MESSAGE_WAIT_MS') ?? 20_000);
    this.handshakeRatePerSecond = Number(configService.get('WS_HANDSHAKE_RATE_PER_SECOND') ?? 50);
    this.limit = this.concurrency > 0 ? pLimit(this.concurrency) : undefined;
    this.tokens = this.handshakeRatePerSecond;
  }

  /** Units running now. */
  get activeCount(): number {
    return this.limit?.activeCount ?? 0;
  }

  /** Units waiting for a slot. */
  get pendingCount(): number {
    return this.limit?.pendingCount ?? 0;
  }

  /**
   * Runs `work` once a slot is free, or refuses it: after `waitMs` without a
   * slot the returned promise rejects with AdmissionTimeoutError and `work`
   * is never called, even when its turn comes later.
   */
  async run<T>(work: () => Promise<T>, waitMs: number, label: string): Promise<T> {
    if (!this.limit) {
      return await work();
    }
    const queuedAt = Date.now();
    let abandoned = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refusal = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        abandoned = true;
        reject(new AdmissionTimeoutError(label, Date.now() - queuedAt));
      }, waitMs);
    });
    const admitted = this.limit(async () => {
      if (abandoned) {
        return ABANDONED;
      }
      this.noteWait(label, Date.now() - queuedAt);
      return await work();
    });
    try {
      const result = await Promise.race([admitted, refusal]);
      return result as T;
    } finally {
      clearTimeout(timer);
      // A refused unit's queued promise still settles (to ABANDONED) when its
      // turn comes; observe it so the refusal never surfaces as unhandled.
      admitted.catch(() => undefined);
    }
  }

  /**
   * Whether one more handshake may proceed now. A token bucket holding one
   * second of handshakes, refilled continuously.
   */
  admitHandshake(): boolean {
    if (this.handshakeRatePerSecond <= 0) {
      return true;
    }
    const now = Date.now();
    const refill = ((now - this.tokensRefilledAt) / 1000) * this.handshakeRatePerSecond;
    this.tokens = Math.min(this.handshakeRatePerSecond, this.tokens + refill);
    this.tokensRefilledAt = now;
    if (this.tokens < 1) {
      return false;
    }
    this.tokens -= 1;
    return true;
  }

  private noteWait(label: string, waitedMs: number): void {
    if (waitedMs < 1000) {
      return;
    }
    const now = Date.now();
    // One line per five seconds at most: under a burst every unit waits.
    if (now - this.lastWarnAt < 5000) {
      return;
    }
    this.lastWarnAt = now;
    this.logger.warn(
      `Admission queue: ${label} waited ${waitedMs}ms (${this.activeCount} running, ${this.pendingCount} waiting)`,
    );
  }
}

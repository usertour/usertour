import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
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

/** The gate reports on its log at most once per window, whatever happens inside it. */
const WARN_WINDOW_MS = 5000;

/** A wait for a slot this long is worth reporting. */
const LONG_WAIT_MS = 1000;

/** A positive number from the environment, or the fallback when unset, blank or not a number. */
const numberSetting = (raw: unknown, fallback: number): number => {
  if (raw === undefined || raw === null || raw === '') {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

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
 * refusal the client sees beats a success it has given up on. Once a unit has
 * started it is never refused, however long it runs: a refusal means "not
 * done", and that must stay true.
 *
 * Handshakes are also paced: `WS_HANDSHAKE_RATE_PER_SECOND` admits that many
 * new connections per second per replica (with the same burst allowance), the
 * excess refused before any work is done. A reconnect storm then arrives over
 * seconds instead of all at once.
 *
 * The concurrency and the rate are off at 0. A wait of 0 or less means a
 * unit is never refused for waiting.
 */
@Injectable()
export class AdmissionService implements OnModuleDestroy {
  private readonly logger = new Logger(AdmissionService.name);
  private readonly limit: ReturnType<typeof pLimit> | undefined;
  readonly concurrency: number;
  readonly handshakeWaitMs: number;
  readonly messageWaitMs: number;
  readonly handshakeRatePerSecond: number;

  private tokens: number;
  private tokensRefilledAt = performance.now();

  // Reporting: events are counted, and every window with any ends in one
  // line, so a burst that is over within the window is still reported in full.
  private refusedHandshakes = 0;
  private refusalWindow: ReturnType<typeof setTimeout> | undefined;
  private longWaits = 0;
  private longestWaitMs = 0;
  private waitWindow: ReturnType<typeof setTimeout> | undefined;

  constructor(configService: ConfigService) {
    this.concurrency = numberSetting(configService.get('WS_ADMISSION_CONCURRENCY'), 16);
    this.handshakeWaitMs = numberSetting(
      configService.get('WS_ADMISSION_HANDSHAKE_WAIT_MS'),
      15_000,
    );
    this.messageWaitMs = numberSetting(configService.get('WS_ADMISSION_MESSAGE_WAIT_MS'), 15_000);
    this.handshakeRatePerSecond = numberSetting(
      configService.get('WS_HANDSHAKE_RATE_PER_SECOND'),
      50,
    );
    this.limit = this.concurrency > 0 ? pLimit(this.concurrency) : undefined;
    this.tokens = this.handshakeRatePerSecond;
  }

  onModuleDestroy(): void {
    clearTimeout(this.refusalWindow);
    clearTimeout(this.waitWindow);
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
   * Runs `work` once a slot is free, holding the slot until the promise it
   * returns settles, or refuses it: after `waitMs` without a slot the
   * returned promise rejects with AdmissionTimeoutError and `work` is never
   * called, even when its turn comes later.
   */
  async run<T>(work: () => Promise<T>, waitMs: number, label: string): Promise<T> {
    if (!this.limit) {
      return await work();
    }
    const queuedAt = Date.now();
    let abandoned = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refusal = new Promise<never>((_, reject) => {
      if (waitMs <= 0) {
        return;
      }
      timer = setTimeout(() => {
        abandoned = true;
        reject(new AdmissionTimeoutError(label, Date.now() - queuedAt));
      }, waitMs);
    });
    const admitted = this.limit(async () => {
      if (abandoned) {
        return ABANDONED;
      }
      // Admitted: from here on the unit runs to its end, whatever the clock says.
      clearTimeout(timer);
      this.noteWait(Date.now() - queuedAt);
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
   * second of handshakes, refilled continuously on a monotonic clock.
   */
  admitHandshake(): boolean {
    if (this.handshakeRatePerSecond <= 0) {
      return true;
    }
    const now = performance.now();
    const refill = ((now - this.tokensRefilledAt) / 1000) * this.handshakeRatePerSecond;
    this.tokens = Math.min(this.handshakeRatePerSecond, this.tokens + refill);
    this.tokensRefilledAt = now;
    if (this.tokens < 1) {
      this.noteRefusal();
      return false;
    }
    this.tokens -= 1;
    return true;
  }

  /** Long waits are counted, and reported once per window in which any happened. */
  private noteWait(waitedMs: number): void {
    if (waitedMs < LONG_WAIT_MS) {
      return;
    }
    this.longWaits += 1;
    this.longestWaitMs = Math.max(this.longestWaitMs, waitedMs);
    if (this.waitWindow) {
      return;
    }
    this.waitWindow = setTimeout(() => {
      this.waitWindow = undefined;
      this.logger.warn(
        `Admission queue: ${this.longWaits} units waited over ${LONG_WAIT_MS}ms in the last ${WARN_WINDOW_MS / 1000}s, the longest ${this.longestWaitMs}ms (${this.activeCount} running, ${this.pendingCount} waiting)`,
      );
      this.longWaits = 0;
      this.longestWaitMs = 0;
    }, WARN_WINDOW_MS);
    this.waitWindow.unref();
  }

  /** Refusals are counted, and the running total reported once per window in which any happened. */
  private noteRefusal(): void {
    this.refusedHandshakes += 1;
    if (this.refusalWindow) {
      return;
    }
    this.refusalWindow = setTimeout(() => {
      this.refusalWindow = undefined;
      this.logger.warn(
        `Handshake pacing: refused ${this.refusedHandshakes} handshakes so far (${this.handshakeRatePerSecond}/s allowed)`,
      );
    }, WARN_WINDOW_MS);
    this.refusalWindow.unref();
  }
}

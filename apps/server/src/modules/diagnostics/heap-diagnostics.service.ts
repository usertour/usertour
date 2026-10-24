import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Session } from 'node:inspector';
import v8 from 'node:v8';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { SamplingHeapProfileNode, summarizeHeapProfile } from './heap-profile-summary';

/** A non-negative number from the environment, or 0 (off) when unset or not a number. */
const numberSetting = (raw: unknown, fallback = 0): number => {
  if (raw === undefined || raw === null || raw === '') {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const megabytes = (bytes: number): number => Math.round(bytes / 1048576);

/** Active libuv resources by type name; typed here because @types/node 18 predates it. */
const activeResourcesInfo = (): string[] =>
  (
    process as NodeJS.Process & { getActiveResourcesInfo?: () => string[] }
  ).getActiveResourcesInfo?.() ?? [];

/** One sampled allocation every 32 KB: a few percent of overhead at most. */
const SAMPLING_INTERVAL_BYTES = 32 * 1024;
const THRESHOLD_CHECK_MS = 30_000;
const REPORT_ROWS = 15;
/** Two reports are enough to compare; each one ends with a full GC that stalls the process. */
const MAX_PROFILES = 2;
/** Above this share of the heap limit the process is already collecting hard: no profile. */
const PROFILE_HEAP_LIMIT_SHARE = 0.75;

type InspectorPost = (
  method: string,
  params: object,
  callback: (error: Error | null, result?: unknown) => void,
) => void;

/**
 * Heap diagnostics for a running replica, off unless configured.
 *
 * `HEAP_REPORT_INTERVAL_SECONDS` logs the process memory every interval, so a
 * replica's heap can be followed in the logs next to the work it was doing.
 *
 * `HEAP_PROFILE_THRESHOLD_MB` profiles the heap from inside the process each
 * time the used heap passes the next multiple of the threshold: a sampling
 * profile runs for `HEAP_PROFILE_SECONDS` (default 480) and the allocations
 * still alive at its end are logged, grouped by the code that made them.
 * Memory that keeps growing shows up there as the sites that own it.
 *
 * Ending a profile forces a full GC, a pause that grows with the live heap
 * (about a second at 1.7 GB). So a process profiles at most twice, and never
 * once its heap is past three quarters of the heap limit, whatever the
 * threshold: there the pause would land on a process close to running out.
 */
@Injectable()
export class HeapDiagnosticsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HeapDiagnosticsService.name);
  private readonly reportIntervalMs: number;
  private readonly profileThresholdMb: number;
  private readonly profileDurationMs: number;
  /** The application's compiled code; frames under it are ours. */
  private readonly applicationPath = path.resolve(__dirname, '..', '..') + path.sep;
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly profileCeilingMb: number;
  private nextProfileAtMb: number;
  private profilesStarted = 0;
  private session: Session | undefined;

  constructor(configService: ConfigService) {
    this.reportIntervalMs = numberSetting(configService.get('HEAP_REPORT_INTERVAL_SECONDS')) * 1000;
    this.profileThresholdMb = numberSetting(configService.get('HEAP_PROFILE_THRESHOLD_MB'));
    this.profileDurationMs = numberSetting(configService.get('HEAP_PROFILE_SECONDS'), 480) * 1000;
    this.nextProfileAtMb = this.profileThresholdMb;
    this.profileCeilingMb = Math.floor(
      megabytes(v8.getHeapStatistics().heap_size_limit) * PROFILE_HEAP_LIMIT_SHARE,
    );
  }

  onModuleInit(): void {
    if (this.reportIntervalMs === 0 && this.profileThresholdMb === 0) {
      return;
    }
    const everyMs = this.reportIntervalMs > 0 ? this.reportIntervalMs : THRESHOLD_CHECK_MS;
    this.timer = setInterval(() => this.check(), everyMs);
    this.timer.unref();
    this.logger.log(
      `Heap diagnostics on: report every ${this.reportIntervalMs / 1000 || '-'}s, profile at every ${this.profileThresholdMb || '-'} MB (at most ${MAX_PROFILES}, none above ${this.profileCeilingMb} MB)`,
    );
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
    this.session?.disconnect();
  }

  private check(): void {
    const usage = process.memoryUsage();
    const usedMb = megabytes(usage.heapUsed);
    if (this.reportIntervalMs > 0) {
      this.logger.log(
        `Heap: used ${usedMb} MB, total ${megabytes(usage.heapTotal)} MB, rss ${megabytes(usage.rss)} MB, external ${megabytes(usage.external)} MB, array buffers ${megabytes(usage.arrayBuffers)} MB, ${this.describeResources()}`,
      );
    }
    if (
      this.profileThresholdMb > 0 &&
      !this.session &&
      this.profilesStarted < MAX_PROFILES &&
      usedMb >= this.nextProfileAtMb
    ) {
      while (this.nextProfileAtMb <= usedMb) {
        this.nextProfileAtMb += this.profileThresholdMb;
      }
      if (usedMb > this.profileCeilingMb) {
        this.profilesStarted = MAX_PROFILES;
        this.logger.warn(
          `Heap profile skipped: ${usedMb} MB used is past ${this.profileCeilingMb} MB, too close to the heap limit`,
        );
        return;
      }
      this.profilesStarted += 1;
      void this.profile(usedMb);
    }
  }

  /** Active libuv resources by type: sockets, timers and the like that never close show here. */
  private describeResources(): string {
    const counts = new Map<string, number>();
    for (const resource of activeResourcesInfo()) {
      counts.set(resource, (counts.get(resource) ?? 0) + 1);
    }
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    const top = [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([resource, count]) => `${resource} ${count}`)
      .join(', ');
    return `active resources ${total} (${top})`;
  }

  private async profile(startedAtMb: number): Promise<void> {
    const session = new Session();
    this.session = session;
    const post = <T>(method: string, params: object = {}): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        (session.post as unknown as InspectorPost)(method, params, (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result as T);
          }
        });
      });
    try {
      session.connect();
      await post('HeapProfiler.enable');
      await post('HeapProfiler.startSampling', { samplingInterval: SAMPLING_INTERVAL_BYTES });
      this.logger.log(
        `Heap profile: started at ${startedAtMb} MB used, sampling for ${this.profileDurationMs / 1000}s`,
      );
      await sleep(this.profileDurationMs, undefined, { ref: false });
      const { profile } = await post<{ profile: { head: SamplingHeapProfileNode } }>(
        'HeapProfiler.stopSampling',
      );
      const endedAtMb = megabytes(process.memoryUsage().heapUsed);
      const summary = summarizeHeapProfile(profile.head, this.applicationPath, REPORT_ROWS);
      const rows = (list: typeof summary.byApplicationFrame) =>
        list
          .map((row) => `${(row.bytes / 1048576).toFixed(2).padStart(9)} MB  ${row.site}`)
          .join('\n');
      this.logger.log(
        [
          `Heap profile: used ${startedAtMb} -> ${endedAtMb} MB over ${this.profileDurationMs / 1000}s; allocated in the window and still alive: ${(summary.totalBytes / 1048576).toFixed(1)} MB`,
          'by nearest application frame:',
          rows(summary.byApplicationFrame),
          'by allocation site:',
          rows(summary.byAllocationSite),
        ].join('\n'),
      );
    } catch (error) {
      this.logger.warn(`Heap profile failed: ${(error as Error)?.message ?? 'unknown error'}`);
    } finally {
      session.disconnect();
      this.session = undefined;
    }
  }
}

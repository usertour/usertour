import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import v8 from 'node:v8';
import { HeapDiagnosticsService } from './heap-diagnostics.service';

const MB = 1048576;

describe('HeapDiagnosticsService profile schedule', () => {
  let used = 0;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    // A 2000 MB heap limit: no profile above 1500 MB.
    jest
      .spyOn(v8, 'getHeapStatistics')
      .mockReturnValue({ heap_size_limit: 2000 * MB } as ReturnType<typeof v8.getHeapStatistics>);
    jest.spyOn(process, 'memoryUsage').mockImplementation(
      () =>
        ({
          heapUsed: used * MB,
          heapTotal: used * MB,
          rss: used * MB,
          external: 0,
          arrayBuffers: 0,
        }) as NodeJS.MemoryUsage,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** Runs the periodic check at each heap size and returns the sizes a profile started at. */
  const profiledAt = (threshold: string, sizes: number[]): number[] => {
    const service = new HeapDiagnosticsService({
      get: (key: string) => (key === 'HEAP_PROFILE_THRESHOLD_MB' ? threshold : undefined),
    } as unknown as ConfigService);
    const started: number[] = [];
    jest
      .spyOn(service as unknown as { profile: (mb: number) => Promise<void> }, 'profile')
      .mockImplementation(async (mb) => {
        started.push(mb);
      });
    for (const size of sizes) {
      used = size;
      (service as unknown as { check: () => void }).check();
    }
    return started;
  };

  it('profiles at the first two multiples of the threshold and stops', () => {
    expect(profiledAt('700', [600, 750, 800, 1450, 1460, 2100])).toEqual([750, 1450]);
  });

  it('profiles at most twice whatever the threshold', () => {
    expect(profiledAt('500', [520, 1100, 1490, 1600])).toEqual([520, 1100]);
  });

  it('never profiles past three quarters of the heap limit', () => {
    expect(profiledAt('700', [1600, 1700])).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('too close to the heap limit');
  });

  it('is off when no threshold is set', () => {
    expect(profiledAt('', [800, 1600])).toEqual([]);
  });
});

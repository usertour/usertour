import { ConfigService } from '@nestjs/config';
import { AdmissionService, AdmissionTimeoutError } from './admission.service';

const tick = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const build = (values: Record<string, string>): AdmissionService =>
  new AdmissionService({ get: (key: string) => values[key] } as unknown as ConfigService);

describe('AdmissionService', () => {
  describe('run', () => {
    it('runs at most the configured number of units at a time, in arrival order', async () => {
      const admission = build({ WS_ADMISSION_CONCURRENCY: '2' });
      const events: string[] = [];
      const unit = (name: string) =>
        admission.run(
          async () => {
            events.push(`${name} start`);
            await tick(40);
            events.push(`${name} end`);
          },
          1000,
          name,
        );
      await Promise.all([unit('a'), unit('b'), unit('c')]);
      expect(events.slice(0, 2)).toEqual(['a start', 'b start']);
      expect(events.indexOf('c start')).toBeGreaterThan(events.indexOf('a end'));
    });

    it('refuses a unit that waits longer than allowed, and never runs it', async () => {
      const admission = build({ WS_ADMISSION_CONCURRENCY: '1' });
      let refusedRan = false;
      const holder = admission.run(() => tick(200), 1000, 'holder');
      const refused = admission.run(
        async () => {
          refusedRan = true;
        },
        50,
        'late',
      );
      await expect(refused).rejects.toBeInstanceOf(AdmissionTimeoutError);
      await holder;
      // Its turn came after the refusal; the work must still be skipped.
      await tick(20);
      expect(refusedRan).toBe(false);
      expect(admission.pendingCount).toBe(0);
      expect(admission.activeCount).toBe(0);
    });

    it('passes through the result and the error of the unit itself', async () => {
      const admission = build({ WS_ADMISSION_CONCURRENCY: '1' });
      await expect(admission.run(async () => 'ok', 100, 'ok')).resolves.toBe('ok');
      await expect(
        admission.run(
          async () => {
            throw new Error('boom');
          },
          100,
          'boom',
        ),
      ).rejects.toThrow('boom');
    });

    it('is off at 0: every unit runs at once', async () => {
      const admission = build({ WS_ADMISSION_CONCURRENCY: '0' });
      let running = 0;
      let peak = 0;
      const unit = async () => {
        running += 1;
        peak = Math.max(peak, running);
        await tick(30);
        running -= 1;
      };
      await Promise.all([1, 2, 3, 4].map(() => admission.run(unit, 10, 'unit')));
      expect(peak).toBe(4);
    });
  });

  describe('admitHandshake', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('admits one second of handshakes at once, then refills at the rate', () => {
      jest.useFakeTimers({ now: 1_000_000 });
      const admission = build({ WS_HANDSHAKE_RATE_PER_SECOND: '2' });
      expect(admission.admitHandshake()).toBe(true);
      expect(admission.admitHandshake()).toBe(true);
      expect(admission.admitHandshake()).toBe(false);
      jest.setSystemTime(1_000_500);
      expect(admission.admitHandshake()).toBe(true);
      expect(admission.admitHandshake()).toBe(false);
      jest.setSystemTime(1_005_000);
      expect(admission.admitHandshake()).toBe(true);
      expect(admission.admitHandshake()).toBe(true);
      expect(admission.admitHandshake()).toBe(false);
    });

    it('is off at 0', () => {
      const admission = build({ WS_HANDSHAKE_RATE_PER_SECOND: '0' });
      for (let count = 0; count < 100; count += 1) {
        expect(admission.admitHandshake()).toBe(true);
      }
    });
  });
});

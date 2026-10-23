import { Logger } from '@nestjs/common';
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

    it('never refuses a unit once it has started, however long it runs', async () => {
      const admission = build({ WS_ADMISSION_CONCURRENCY: '1' });
      // Admitted at once, then runs well past the 50 ms wait allowance.
      await expect(
        admission.run(
          async () => {
            await tick(150);
            return 'done';
          },
          50,
          'long',
        ),
      ).resolves.toBe('done');
    });

    it('holds the slot until the promise the unit returned settles', async () => {
      const admission = build({ WS_ADMISSION_CONCURRENCY: '1' });
      let release: () => void = () => undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const first = admission.run(() => held, 1000, 'first');
      await tick(10);
      let secondStarted = false;
      const second = admission.run(
        async () => {
          secondStarted = true;
        },
        1000,
        'second',
      );
      await tick(50);
      expect(secondStarted).toBe(false);
      release();
      await Promise.all([first, second]);
      expect(secondStarted).toBe(true);
    });

    it('treats a blank or unparsable setting as the default, and a wait of 0 as no refusal', async () => {
      const admission = build({ WS_ADMISSION_CONCURRENCY: '', WS_ADMISSION_MESSAGE_WAIT_MS: 'x' });
      expect(admission.concurrency).toBe(16);
      expect(admission.messageWaitMs).toBe(15_000);
      const single = build({ WS_ADMISSION_CONCURRENCY: '1' });
      const holder = single.run(() => tick(120), 1000, 'holder');
      await expect(single.run(async () => 'waited', 0, 'patient')).resolves.toBe('waited');
      await holder;
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
      jest.useFakeTimers({ now: 1_000_000, doNotFake: [] });
      const admission = build({ WS_HANDSHAKE_RATE_PER_SECOND: '2' });
      expect(admission.admitHandshake()).toBe(true);
      expect(admission.admitHandshake()).toBe(true);
      expect(admission.admitHandshake()).toBe(false);
      jest.advanceTimersByTime(500);
      expect(admission.admitHandshake()).toBe(true);
      expect(admission.admitHandshake()).toBe(false);
      jest.advanceTimersByTime(4500);
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

  describe('reporting', () => {
    let warn: jest.SpyInstance;

    beforeEach(() => {
      jest.useFakeTimers({ now: 1_000_000, doNotFake: [] });
      warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
      warn.mockRestore();
      jest.useRealTimers();
    });

    it('reports the refusals of a burst in one line when the window ends', () => {
      const admission = build({ WS_HANDSHAKE_RATE_PER_SECOND: '1' });
      for (let count = 0; count < 5; count += 1) {
        admission.admitHandshake();
      }
      expect(warn).not.toHaveBeenCalled();
      jest.advanceTimersByTime(5000);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('refused 4 handshakes so far');
      // A quiet window is no line.
      jest.advanceTimersByTime(5000);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('reports the long waits of a window in one line when it ends', async () => {
      const admission = build({ WS_ADMISSION_CONCURRENCY: '1' });
      let release: () => void = () => undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const holder = admission.run(() => held, 0, 'holder');
      // Let the holder take its slot before the clock moves: its own wait is nil.
      await Promise.resolve();
      await Promise.resolve();
      const waiting = ['a', 'b', 'c'].map((name) => admission.run(async () => name, 0, name));
      jest.advanceTimersByTime(1500);
      release();
      await Promise.all([holder, ...waiting]);
      expect(warn).not.toHaveBeenCalled();
      jest.advanceTimersByTime(5000);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('3 units waited over 1000ms');
      expect(warn.mock.calls[0][0]).toContain('the longest 1500ms');
    });
  });
});

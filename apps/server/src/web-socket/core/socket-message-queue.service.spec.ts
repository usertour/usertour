import { ConfigService } from '@nestjs/config';
import { AdmissionService } from './admission.service';
import { SocketMessageQueueService } from './socket-message-queue.service';

const tick = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('SocketMessageQueueService', () => {
  let queue: SocketMessageQueueService;

  beforeEach(() => {
    queue = new SocketMessageQueueService();
  });

  it('runs the tasks of one socket in order', async () => {
    const order: string[] = [];
    const first = queue.executeInOrder('s1', async () => {
      await tick(20);
      order.push('first');
    });
    const second = queue.executeInOrder('s1', async () => {
      order.push('second');
    });
    await Promise.all([first, second]);
    expect(order).toEqual(['first', 'second']);
  });

  it('a failed predecessor does not block the next task', async () => {
    await expect(
      queue.executeInOrder('s1', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await expect(queue.executeInOrder('s1', async () => 'ran')).resolves.toBe('ran');
  });

  it('a task that times out is not run a second time', async () => {
    let runs = 0;
    const slow = queue.executeInOrder(
      's1',
      async () => {
        runs += 1;
        await tick(60);
      },
      10,
    );
    await expect(slow).rejects.toThrow(/timeout/);
    await tick(80);
    expect(runs).toBe(1);
  });

  it('a task that fails is not run a second time', async () => {
    let runs = 0;
    await expect(
      queue.executeInOrder('s1', async () => {
        runs += 1;
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(runs).toBe(1);
  });

  describe('behind the admission gate', () => {
    const gated = (concurrency: string) =>
      new SocketMessageQueueService(
        new AdmissionService({
          get: (key: string) => ({ WS_ADMISSION_CONCURRENCY: concurrency })[key],
        } as unknown as ConfigService),
      );

    it('keeps the slot until the task settles, even after the answer timed out', async () => {
      const gatedQueue = gated('1');
      let slowDone = false;
      const slow = gatedQueue.executeInOrder(
        's1',
        async () => {
          await tick(150);
          slowDone = true;
        },
        40,
      );
      await expect(slow).rejects.toThrow('Task timeout');
      // The answer timed out at 40 ms; the task is still running and still
      // holds the only slot, so another socket's task must wait for it.
      let otherStartedBeforeSlowDone: boolean | undefined;
      await gatedQueue.executeInOrder('s2', async () => {
        otherStartedBeforeSlowDone = !slowDone;
      });
      expect(otherStartedBeforeSlowDone).toBe(false);
    });

    it('a task refused by the gate never runs and does not block the socket', async () => {
      const gatedQueue = gated('1');
      const admission = (gatedQueue as unknown as { admission: AdmissionService }).admission;
      const holder = admission.run(() => tick(300), 5000, 'holder');
      (admission as unknown as { messageWaitMs: number }).messageWaitMs = 50;
      let ran = false;
      await expect(
        gatedQueue.executeInOrder('s1', async () => {
          ran = true;
        }),
      ).rejects.toThrow('waited');
      await holder;
      await tick(20);
      expect(ran).toBe(false);
      await expect(gatedQueue.executeInOrder('s1', async () => 'next')).resolves.toBe('next');
    });
  });
});

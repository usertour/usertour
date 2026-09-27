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
});

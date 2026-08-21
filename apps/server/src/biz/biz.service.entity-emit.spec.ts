import { EventEmitter2 } from '@nestjs/event-emitter';
import { BizService } from './biz.service';
import { BIZ_ENTITY_CHANGED } from '@/webhooks/webhook.types';

/**
 * The emit-scope invariant: changes surface only after the OUTERMOST
 * operation returns ("missed, never premature"). A nested scope must join
 * the outer collection, not open its own — its own would emit while the
 * outer transaction is still uncommitted.
 */
describe('BizService.withEntityChangeEmit', () => {
  let emitter: { emit: jest.Mock };
  let service: BizService;

  beforeEach(() => {
    emitter = { emit: jest.fn() };
    service = new BizService({} as never, {} as never, emitter as never as EventEmitter2);
  });

  const collect = (bizId: string) =>
    (service as never as { collectEntityChange: (change: unknown) => void }).collectEntityChange({
      entity: 'user',
      action: 'updated',
      bizId,
    });

  it('a nested scope throws — nesting would emit early or mislabel the tenant', async () => {
    // A nested scope of its own emits before the outer transaction commits;
    // silently joining inherits the OUTER environmentId and would tag one
    // tenant's changes with another's. Until a real caller needs
    // composition, the honest contract is: fail loudly at the first dev run.
    await expect(
      service.withEntityChangeEmit('env_1', async () => {
        collect('bu_outer');
        await service.withEntityChangeEmit('env_2', async () => collect('bu_inner'));
      }),
    ).rejects.toThrow(/must not nest/);
    // And the failed outer operation emits nothing at all.
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('a top-level scope emits once at its boundary with the collected changes', async () => {
    await service.withEntityChangeEmit('env_1', async () => {
      collect('bu_1');
      expect(emitter.emit).not.toHaveBeenCalled(); // not before the boundary
    });
    expect(emitter.emit).toHaveBeenCalledTimes(1);
    const [event, payload] = emitter.emit.mock.calls[0];
    expect(event).toBe(BIZ_ENTITY_CHANGED);
    expect(payload).toEqual({
      environmentId: 'env_1',
      changes: [{ entity: 'user', action: 'updated', bizId: 'bu_1' }],
    });
  });

  it('a throwing operation emits nothing (all committed or all thrown)', async () => {
    await expect(
      service.withEntityChangeEmit('env_1', async () => {
        collect('bu_1');
        throw new Error('rolled back');
      }),
    ).rejects.toThrow('rolled back');
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('an empty collection emits nothing', async () => {
    await service.withEntityChangeEmit('env_1', async () => undefined);
    expect(emitter.emit).not.toHaveBeenCalled();
  });
});

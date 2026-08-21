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

  it('a nested scope joins the outer one — single emission, at the outer boundary', async () => {
    await service.withEntityChangeEmit('env_1', async () => {
      collect('bu_outer');
      await service.withEntityChangeEmit('env_1', async () => {
        collect('bu_inner');
      });
      // The inner call returned, but nothing may have emitted yet: the outer
      // operation (imagine a transaction) is still in flight.
      expect(emitter.emit).not.toHaveBeenCalled();
    });

    expect(emitter.emit).toHaveBeenCalledTimes(1);
    const [event, payload] = emitter.emit.mock.calls[0];
    expect(event).toBe(BIZ_ENTITY_CHANGED);
    expect(payload.changes.map((change: { bizId: string }) => change.bizId)).toEqual([
      'bu_outer',
      'bu_inner',
    ]);
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

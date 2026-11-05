import { BizEvents, EventAttributes } from '@usertour/types';

import { EventTrackingService } from './event-tracking.service';

/**
 * The step-seen path the SDK's GoToStep lands on: one event name per
 * step-bodied type, picked from the session's content type, and the embed's
 * "already seen" shortcut that only moves the session's current step.
 */
describe('EventTrackingService step seen', () => {
  const environment = { id: 'env-1', projectId: 'project-1' };
  const build = (prisma: unknown) =>
    new EventTrackingService(prisma as never, {} as never, { emit: jest.fn() } as never);

  describe('trackStepSeen', () => {
    const run = async (session: unknown) => {
      const findUnique = jest.fn().mockResolvedValue(session);
      const service = build({ bizSession: { findUnique } });
      const trackEventByType = jest.spyOn(service, 'trackEventByType').mockResolvedValue(true);
      const params = { sessionId: 'session-1', environment, stepId: 'step-1' } as never;
      const result = await service.trackStepSeen(params);
      return { result, findUnique, trackEventByType, params };
    };

    it('reads only the content type of the session to pick the event', async () => {
      const { result, findUnique, trackEventByType, params } = await run({
        content: { type: 'flow' },
      });
      expect(result).toBe(true);
      // This runs on every step of every flow: the handler it dispatches to
      // loads the session it works on, so nothing else is fetched here.
      expect(findUnique).toHaveBeenCalledTimes(1);
      expect(findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        select: { content: { select: { type: true } } },
      });
      expect(trackEventByType).toHaveBeenCalledWith(BizEvents.FLOW_STEP_SEEN, params);
    });

    it('picks the embed event for an embed session', async () => {
      const { trackEventByType, params } = await run({ content: { type: 'embed' } });
      expect(trackEventByType).toHaveBeenCalledWith(BizEvents.EMBED_STEP_SEEN, params);
    });

    it('tracks nothing for a session that does not exist', async () => {
      const { result, trackEventByType } = await run(null);
      expect(result).toBe(false);
      expect(trackEventByType).not.toHaveBeenCalled();
    });
  });

  describe('an embed step that was already seen', () => {
    const session = (overrides: Record<string, unknown> = {}) => ({
      id: 'session-1',
      state: 0,
      environmentId: 'env-1',
      currentStepId: 'step-1',
      content: { type: 'embed' },
      version: { steps: [] },
      bizUser: { externalId: 'user-1' },
      bizEvent: [
        {
          event: { codeName: BizEvents.EMBED_STEP_SEEN },
          data: { [EventAttributes.EMBED_STEP_ID]: 'step-2' },
        },
      ],
      ...overrides,
    });
    const run = async (found: unknown) => {
      const tx = {
        bizSession: { findUnique: jest.fn().mockResolvedValue(found), update: jest.fn() },
      };
      const service = build({});
      const handle = (
        service as unknown as {
          handleEmbedStepSeen: (tx: unknown, params: unknown) => Promise<boolean>;
        }
      ).handleEmbedStepSeen.bind(service);
      const result = await handle(tx, { sessionId: 'session-1', environment, stepId: 'step-2' });
      return { result, update: tx.bizSession.update };
    };

    it('moves the current step of a live session without a second event', async () => {
      const { result, update } = await run(session());
      expect(result).toBe(true);
      expect(update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { currentStepId: 'step-2' },
      });
    });

    it('leaves an ended session alone', async () => {
      const { result, update } = await run(session({ state: 1 }));
      expect(result).toBe(false);
      expect(update).not.toHaveBeenCalled();
    });

    it('leaves a session of another environment alone', async () => {
      const { result, update } = await run(session({ environmentId: 'env-2' }));
      expect(result).toBe(false);
      expect(update).not.toHaveBeenCalled();
    });
  });
});

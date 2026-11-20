import { ContentDataType } from '@usertour/types';
import type { Server, Socket } from 'socket.io';

import { ContentOrchestratorService } from './content-orchestrator.service';

const buildOrchestrator = (socketData: unknown) => {
  const cleanupBatchSession = jest.fn().mockResolvedValue(true);
  const orchestrator = new ContentOrchestratorService(
    {} as never,
    {} as never,
    {} as never,
    { cleanupBatchSession } as never,
    { get: jest.fn().mockResolvedValue(socketData) } as never,
    {} as never,
    {
      memoize: (_key: string, fn: () => unknown) => fn(),
      memoKeys: { socketData: (id: string) => id },
    } as never,
  );
  return { orchestrator, cleanupBatchSession };
};

describe('ContentOrchestratorService batch cancel', () => {
  const server = {} as Server;
  const socket = { id: 'socket-1' } as Socket;
  const embedSession = (id: string | undefined) => ({
    id,
    type: ContentDataType.EMBED,
    content: { id: 'content-1' },
  });

  it('ignores a stale cancel for an older session of the same content', async () => {
    const { orchestrator, cleanupBatchSession } = buildOrchestrator({
      embedSessions: [embedSession('session-new')],
    });
    const result = await orchestrator.runRoomSyncJob(server, socket, {
      kind: 'cancel',
      sessionId: 'session-old',
      contentType: ContentDataType.EMBED,
      contentId: 'content-1',
    });
    expect(result).toBe(false);
    expect(cleanupBatchSession).not.toHaveBeenCalled();
  });

  it('re-evaluates the type for a candidate with no session yet instead of removing it by content', async () => {
    const { orchestrator, cleanupBatchSession } = buildOrchestrator({
      embedSessions: [embedSession(undefined)],
    });
    const toggleContents = jest.spyOn(orchestrator, 'toggleContents').mockResolvedValue(true);
    const result = await orchestrator.runRoomSyncJob(server, socket, {
      kind: 'cancel',
      sessionId: 'session-old',
      contentType: ContentDataType.EMBED,
      contentId: 'content-1',
    });
    expect(result).toBe(true);
    expect(cleanupBatchSession).not.toHaveBeenCalled();
    expect(toggleContents).toHaveBeenCalledWith(expect.objectContaining({ server, socket }), [
      ContentDataType.EMBED,
    ]);
  });

  it('cancels the session the job names', async () => {
    const { orchestrator, cleanupBatchSession } = buildOrchestrator({
      embedSessions: [embedSession('session-new')],
    });
    const result = await orchestrator.runRoomSyncJob(server, socket, {
      kind: 'cancel',
      sessionId: 'session-new',
      contentType: ContentDataType.EMBED,
      contentId: 'content-1',
    });
    expect(result).toBe(true);
    expect(cleanupBatchSession).toHaveBeenCalledTimes(1);
  });
});

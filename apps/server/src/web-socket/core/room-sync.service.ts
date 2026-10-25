import { Injectable, Logger } from '@nestjs/common';
import type { ContentDataType, CustomContentSession, TrackCondition } from '@usertour/types';
import { Namespace, Server, Socket } from 'socket.io';

import { ProjectCacheService } from '@/modules/common/services/project-cache.service';
import { DistributedLockService } from '@/modules/delivery/services/distributed-lock.service';
import { buildSocketLockKey } from '../utils/websocket.util';
import { SocketMessageQueueService } from './socket-message-queue.service';

/** The server-side event that carries a room sync between the servers of a cluster. */
export const ROOM_SYNC_EVENT = 'room-sync';

/** What the sending connection did, for the user's other connections to repeat. */
export type RoomSyncJob =
  | {
      kind: 'activate';
      session: CustomContentSession;
      trackConditions: TrackCondition[];
      forceGoToStep: boolean;
    }
  | {
      kind: 'cancel';
      sessionId: string;
      contentType: ContentDataType;
      contentId?: string;
      setLastDismissedId?: boolean;
      trackConditions?: TrackCondition[];
    };

export interface RoomSyncMessage {
  roomId: string;
  /** The connection that did the work for itself already. */
  excludeSocketId: string;
  job: RoomSyncJob;
}

export type RoomSyncRunner = (server: Server, socket: Socket, job: RoomSyncJob) => Promise<boolean>;

/**
 * Keeps a user's connections in step without making any of them wait for the
 * others. A message handler that activated or cancelled a session on its own
 * connection publishes the job; every other connection in the user's room
 * runs it on its own message queue, serialized with its own client messages,
 * on the server it is connected to. The sender returns at once: a slow
 * connection's acknowledgement, a dead connection's emit timeout, or another
 * server that is late to answer, costs only that connection.
 *
 * Local connections are queued here directly; the servers of the cluster
 * receive the message through the adapter's server-side event and queue
 * theirs. The runner (the orchestrator's job method) is registered by the
 * gateway once the namespace exists, so this service holds no reference to
 * the orchestrator that publishes through it.
 */
@Injectable()
export class RoomSyncService {
  private readonly logger = new Logger(RoomSyncService.name);
  private runner?: RoomSyncRunner;

  constructor(
    private readonly queueService: SocketMessageQueueService,
    private readonly distributedLockService: DistributedLockService,
    private readonly cache: ProjectCacheService,
  ) {}

  /** Registers the job runner and subscribes to the syncs the other servers publish. */
  listen(server: Server, runner: RoomSyncRunner): void {
    this.runner = runner;
    server.on(ROOM_SYNC_EVENT, (message: RoomSyncMessage) => {
      void this.dispatchLocal(server, message);
    });
  }

  /**
   * Publishes a sync for every connection in the room but the sender: queued
   * on each local connection's own queue here, and sent to the other servers
   * for theirs. Returns at once; a failure is logged, never raised to the
   * sender.
   */
  publish(server: Server, message: RoomSyncMessage): void {
    // One wire shape for every connection: the message is serialized once,
    // so a local connection reads the same JSON a remote one receives.
    const wire = JSON.parse(JSON.stringify(message)) as RoomSyncMessage;
    void this.dispatchLocal(server, wire);
    void this.forward(server, wire);
  }

  private async forward(server: Server, message: RoomSyncMessage): Promise<void> {
    try {
      // The gateway hands the `/v2` namespace, typed as the server throughout
      // this module; the namespace carries the adapter instance.
      const namespace = server as unknown as Namespace;
      if ((await namespace.adapter.serverCount()) > 1) {
        namespace.serverSideEmit(ROOM_SYNC_EVENT, message);
      }
    } catch (error) {
      this.logger.error(
        `Failed to forward room sync for ${message.roomId}: ${(error as Error).message}`,
      );
    }
  }

  private async dispatchLocal(server: Server, message: RoomSyncMessage): Promise<void> {
    const runner = this.runner;
    if (!runner) {
      this.logger.warn(`Room sync for ${message.roomId} dropped: no runner registered`);
      return;
    }
    try {
      // The local flag answers from this server's own room membership, so
      // every id is one of this namespace's own connections. The Socket is
      // taken from the namespace's table rather than matched by class: the
      // platform adapter may run a different socket.io copy than this module
      // imports, so instanceof does not identify it.
      const namespace = server as unknown as Namespace;
      const members = await server.in(message.roomId).local.fetchSockets();
      for (const member of members) {
        if (member.id === message.excludeSocketId) {
          continue;
        }
        const socket = namespace.sockets.get(member.id);
        if (!socket) {
          continue;
        }
        void this.queueService
          .executeInOrder(socket.id, () =>
            this.cache.runInScope(() =>
              this.distributedLockService.withRetryLock(
                buildSocketLockKey(socket),
                () => runner(server, socket, message.job),
                5,
                200,
                5000,
              ),
            ),
          )
          .catch((error) => {
            this.logger.error(
              `Room sync ${message.job.kind} failed for socket ${socket.id}: ${(error as Error).message}`,
            );
          });
      }
    } catch (error) {
      this.logger.error(
        `Failed to dispatch room sync for ${message.roomId}: ${(error as Error).message}`,
      );
    }
  }
}

import type { CustomContentSession, TrackCondition } from '@usertour/types';
import type { Server, Socket } from 'socket.io';

import type { SocketData } from '@/modules/delivery/types/socket-data.type';

export interface ActivateSessionParams {
  server: Server;
  socket: Socket;
  session: CustomContentSession;
  forceGoToStep: boolean;
  /**
   * Record the step the flow starts at. Only the connection that started the
   * flow records it; the user's other connections, brought in step through a
   * room sync, show the step but leave the record to the sender, since their
   * sync may run after the user has moved on.
   */
  recordStartStep?: boolean;
  socketData?: SocketData;
  trackConditions?: TrackCondition[];
}

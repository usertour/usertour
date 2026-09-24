import type { CustomContentSession, TrackCondition } from '@usertour/types';
import type { Server, Socket } from 'socket.io';

import type { SocketData } from '@/modules/delivery/types/socket-data.type';

export interface ActivateSessionParams {
  server: Server;
  socket: Socket;
  session: CustomContentSession;
  forceGoToStep: boolean;
  socketData?: SocketData;
  trackConditions?: TrackCondition[];
}

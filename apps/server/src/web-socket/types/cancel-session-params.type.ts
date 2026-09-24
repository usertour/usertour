import type { ContentDataType, TrackCondition } from '@usertour/types';
import type { Server, Socket } from 'socket.io';

import type { SocketData } from '@/modules/delivery/types/socket-data.type';

export interface CancelSessionParams {
  server: Server;
  socket: Socket;
  socketData: SocketData;
  contentType: ContentDataType;
  sessionId: string;
  trackConditions?: TrackCondition[];
  contentId?: string;
  unsetSession?: boolean;
  setLastDismissedId?: boolean;
}

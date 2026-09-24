import type { ContentDataType, StartContentOptions } from '@usertour/types';
import type { Server, Socket } from 'socket.io';

import type { SocketData } from '@/modules/delivery/types/socket-data.type';

export interface ContentStartContext {
  server: Server;
  socket: Socket;
  contentType: ContentDataType;
  socketData: SocketData;
  options?: StartContentOptions;
}

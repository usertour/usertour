import type { Server, Socket } from 'socket.io';

export interface ContentCancelContext {
  server: Server;
  socket: Socket;
  sessionId: string;
  cancelOtherSessions?: boolean;
  unsetCurrentSession?: boolean;
  endReason: string;
}

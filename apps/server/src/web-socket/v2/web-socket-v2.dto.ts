import { IsString, IsObject, IsOptional } from 'class-validator';
import { Server, Socket } from 'socket.io';
import { SocketData } from '@/common/types/content';

// ============================================================================
// Server-Specific Types
// ============================================================================

/**
 * WebSocket context containing server, socket, and client data
 * Used to pass common parameters to message handlers
 * This is server-specific and should not be moved to shared types
 */
export interface WebSocketContext {
  server: Server;
  socket: Socket;
  socketData: SocketData;
}

// ============================================================================
// Message DTO Classes
// ============================================================================

/**
 * Unified client message structure (Client -> Server)
 * All messages are executed in order to maintain Socket.IO's ordering semantics
 */
export class ClientMessageDto {
  @IsString()
  kind: string;

  @IsObject()
  payload: any;

  @IsOptional()
  @IsString()
  requestId?: string;
}

/**
 * Unified server message structure (Server -> Client)
 * Consistent format for all server-to-client messages
 */
export class ServerMessageDto {
  @IsString()
  kind: string;

  @IsObject()
  payload: any;

  @IsOptional()
  @IsString()
  messageId?: string;
}

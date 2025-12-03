import {
  ManagerOptions,
  Socket as SocketIO,
  SocketOptions as SocketIOOptions,
  io,
} from 'socket.io-client';
import { autoBind } from '@/utils';

// Configuration options for Socket connection
interface SocketOptions {
  wsUri: string;
  /**
   * Optional Socket.IO namespace, e.g. '/v2'.
   * If omitted, connects to the root namespace ('/').
   * Note: This is different from Socket.IO 'path' which controls the HTTP handshake path.
   */
  namespace?: string;
  socketConfig?: Partial<ManagerOptions & SocketIOOptions>;
}

/**
 * Core Socket class for low-level WebSocket connection management
 * Handles only connection, disconnection, event listening, and raw message sending
 * Business logic should be implemented in UsertourSocket
 */
export class Socket {
  private readonly socket: SocketIO;
  private readonly options: SocketOptions;

  constructor(options: SocketOptions) {
    autoBind(this);

    // Resolve the WebSocket URI
    const resolvedUrl = new URL(options.wsUri, window.location.origin);
    const baseUri = resolvedUrl.origin;

    // Normalize the base path
    let basePath = resolvedUrl.pathname;
    if (basePath !== '/' && basePath.endsWith('/')) {
      basePath = basePath.slice(0, -1);
    }
    if (basePath === '/') {
      basePath = '';
    }

    // Configure Socket.IO path
    const ioPathSegment = (options.socketConfig?.path || '/socket.io/').replace(/^\/+|\/+$/g, '');

    // Initialize socket configuration
    this.options = {
      ...options,
      socketConfig: {
        withCredentials: false,
        timeout: 5000,
        reconnection: true,
        transports: ['websocket'],
        path: `${basePath}/${ioPathSegment}/`,
        ...options.socketConfig,
      },
    };

    // Normalize namespace to ensure it starts with '/' and has no trailing '/'
    const namespace = (options.namespace ?? '').trim();
    const normalizedNamespace = namespace ? `/${namespace.replace(/^\/+|\/+$/g, '')}` : '';

    // Connect to namespace while keeping the HTTP handshake path configured via 'path'
    this.socket = io(`${baseUri}${normalizedNamespace}`, this.options.socketConfig);
  }

  /**
   * Register a listener for Socket.IO events
   * Direct access to the underlying Socket.IO event system
   */
  on(event: string, handler: (...args: any[]) => void): void {
    this.socket.on(event, handler);
  }

  /**
   * Remove a listener for Socket.IO events
   */
  off(event: string, handler?: (...args: any[]) => void): void {
    this.socket.off(event, handler);
  }

  /**
   * Register a one-time listener for Socket.IO events
   */
  once(event: string, handler: (...args: any[]) => void): void {
    this.socket.once(event, handler);
  }

  /**
   * Emit an event without waiting for acknowledgment (fire-and-forget)
   * @param event - Event name to emit
   * @param data - Data to send with the event
   */
  emit(event: string, data: any): void {
    this.socket.emit(event, data);
  }

  /**
   * Emit an event and wait for acknowledgment
   * @param event - Event name to emit
   * @param data - Data to send with the event
   * @returns Promise with the response
   */
  async emitWithAck<T>(event: string, data: any): Promise<T> {
    return await this.socket.emitWithAck(event, data);
  }

  /**
   * Disconnect the socket connection
   */
  disconnect(): void {
    this.socket.disconnect();
  }

  /**
   * Connect the socket (if disconnected)
   */
  connect(): void {
    this.socket.connect();
  }

  /**
   * Check if socket is currently connected
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean {
    return this.socket.connected;
  }
}

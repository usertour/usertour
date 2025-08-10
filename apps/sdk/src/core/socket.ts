import {
  BizSession,
  ContentSession,
  SDKContent,
  SDKSettingsMode,
  GetProjectSettingsResponse,
} from '@usertour/types';
import { UserTourTypes } from '@usertour/types';
import {
  ManagerOptions,
  Socket as SocketIO,
  SocketOptions as SocketIOOptions,
  io,
} from 'socket.io-client';
import autoBind from '../utils/auto-bind';
import { Evented } from './evented';
import { SDKContentSession } from '../types/sdk';

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
 * Socket class for handling real-time communication
 * Extends Evented to support event-based communication
 */
export class Socket extends Evented {
  private readonly socket: SocketIO;
  private readonly options: SocketOptions;
  private inBatch = false;
  private endBatchTimeout?: number;
  private readonly BATCH_TIMEOUT = 100; // ms

  constructor(options: SocketOptions) {
    super();
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
    this.setupErrorHandling();
    this.setupEventListener();
  }

  /**
   * Setup error handling for socket events
   */
  private setupErrorHandling(): void {
    this.socket.on('connect_error', (error) => {
      this.trigger('error', error);
    });
  }

  /**
   * Setup content changed listener
   */
  private setupEventListener(): void {
    this.socket.on('set-flow-session', (message: SDKContentSession) => {
      this.trigger('set-flow-session', message);
    });
    this.socket.on('set-checklist-session', (message: SDKContentSession) => {
      this.trigger('set-checklist-session', message);
    });
  }

  /**
   * Send message with batch support (similar to userflow implementation)
   * @param event - Event name to emit
   * @param data - Data to send with the event
   * @param options - Batch options
   * @returns Promise with the response
   */
  async send<T>(
    event: string,
    data: any,
    { batch = false, endBatch = false }: { batch?: boolean; endBatch?: boolean } = {},
  ): Promise<T> {
    // Start batch if requested and not already in batch
    if (batch && !this.inBatch) {
      this.inBatch = true;
      await this.emitWithTimeout('begin-batch', {});
    }

    // Handle batch timeout
    if (this.inBatch) {
      // Clear existing timeout
      if (this.endBatchTimeout) {
        window.clearTimeout(this.endBatchTimeout);
      }

      if (endBatch) {
        // End batch immediately
        await this.endBatch();
      } else {
        // Set timeout to auto-end batch
        this.endBatchTimeout = window.setTimeout(() => {
          this.endBatch();
        }, this.BATCH_TIMEOUT);
      }
    }

    // Send the actual message
    return await this.emitWithTimeout<T>(event, data);
  }

  /**
   * End current batch
   */
  async endBatch(): Promise<void> {
    if (this.inBatch) {
      this.inBatch = false;
      if (this.endBatchTimeout) {
        window.clearTimeout(this.endBatchTimeout);
        this.endBatchTimeout = undefined;
      }
      await this.emitWithTimeout('end-batch', {});
    }
  }

  /**
   * Emit an event and wait for acknowledgment (internal method)
   * @param event - Event name to emit
   * @param data - Data to send with the event
   * @returns Promise with the response
   */
  private async emitWithTimeout<T>(event: string, data: any): Promise<T> {
    try {
      return await this.socket.emitWithAck(event, data);
    } catch (error) {
      this.trigger('error', error);
      throw error;
    }
  }

  /**
   * Create or update user information
   * @param params - User parameters including userId, attributes, and token
   * @param options - Batch options
   * @returns Promise with user information
   */
  async upsertUser(
    params: {
      userId: string;
      attributes?: UserTourTypes.Attributes;
      token: string;
    },
    options?: { batch?: boolean; endBatch?: boolean },
  ): Promise<boolean> {
    return await this.send('upsert-user', params, options);
  }

  /**
   * Create or update company information
   * @param token - Authentication token
   * @param userId - User identifier
   * @param companyId - Company identifier
   * @param attributes - Optional company attributes
   * @param membership - Optional membership attributes
   * @param options - Batch options
   * @returns Promise with company information
   */
  async upsertCompany(
    token: string,
    userId: string,
    companyId: string,
    attributes?: UserTourTypes.Attributes,
    membership?: UserTourTypes.Attributes,
    options?: { batch?: boolean; endBatch?: boolean },
  ): Promise<boolean> {
    return await this.send(
      'upsert-company',
      {
        token,
        companyId,
        userId,
        attributes,
        membership,
      },
      options,
    );
  }

  /**
   * List available contents
   * @param params - Parameters for content listing
   * @returns Promise with array of contents
   */
  async listContents(params: {
    token: string;
    mode: SDKSettingsMode;
    userId?: string;
    contentId?: string;
    versionId?: string;
    companyId?: string;
  }): Promise<SDKContent[]> {
    const response = await this.emitWithTimeout('list-contents', params);
    if (!Array.isArray(response)) {
      return [];
    }
    return response as SDKContent[];
  }

  /**
   * Create a new session
   * @param params - Session parameters including userId, token, and contentId
   * @returns Promise with session information
   */
  async createSession(params: {
    userId: string;
    token: string;
    contentId: string;
    companyId?: string;
    reason?: string;
    context?: {
      pageUrl?: string;
      viewportWidth?: number;
      viewportHeight?: number;
    };
  }): Promise<{ session: BizSession; contentSession: ContentSession } | false> {
    return await this.emitWithTimeout('create-session', params);
  }

  /**
   * Track an event
   * @param params - Event tracking parameters
   * @param options - Batch options
   */
  async trackEvent(
    params: {
      userId: string;
      token: string;
      eventName: string;
      sessionId: string;
      eventData: any;
    },
    options?: { batch?: boolean; endBatch?: boolean },
  ): Promise<ContentSession | false> {
    return await this.send('track-event', params, options);
  }

  /**
   * Get project settings
   * @param params - Parameters including authentication token, userId, and companyId
   * @returns Promise with project settings
   */
  async getProjectSettings(params: {
    token: string;
    userId?: string;
    companyId?: string;
  }): Promise<GetProjectSettingsResponse> {
    const response = await this.emitWithTimeout('get-project-settings', params);
    return response as GetProjectSettingsResponse;
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

  /**
   * Check if currently in a batch
   * @returns True if in batch mode, false otherwise
   */
  isInBatch(): boolean {
    return this.inBatch;
  }
}

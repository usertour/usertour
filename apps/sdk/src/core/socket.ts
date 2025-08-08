import {
  BizCompany,
  BizSession,
  BizUserInfo,
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
    this.setupContentChangedListener();
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
  private setupContentChangedListener(): void {
    this.socket.on('content-changed', () => {
      this.trigger('content-changed');
    });
  }

  /**
   * Emit an event and wait for acknowledgment
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
   * @returns Promise with user information
   */
  async upsertUser(params: {
    userId: string;
    attributes?: UserTourTypes.Attributes;
    token: string;
  }): Promise<BizUserInfo | undefined> {
    const response = await this.emitWithTimeout('upsert-user', params);
    return response as BizUserInfo;
  }

  /**
   * Create or update company information
   * @param token - Authentication token
   * @param userId - User identifier
   * @param companyId - Company identifier
   * @param attributes - Optional company attributes
   * @param membership - Optional membership attributes
   * @returns Promise with company information
   */
  async upsertCompany(
    token: string,
    userId: string,
    companyId: string,
    attributes?: UserTourTypes.Attributes,
    membership?: UserTourTypes.Attributes,
  ): Promise<BizCompany | undefined> {
    const response = await this.emitWithTimeout('upsert-company', {
      token,
      companyId,
      userId,
      attributes,
      membership,
    });
    return response as BizCompany;
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
   */
  async trackEvent(params: {
    userId: string;
    token: string;
    eventName: string;
    sessionId: string;
    eventData: any;
  }): Promise<ContentSession | false> {
    return await this.emitWithTimeout('track-event', params);
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
}

import {
  BizCompany,
  BizSession,
  BizUserInfo,
  SDKConfig,
  SDKContent,
  SDKSettingsMode,
  Theme,
} from '@usertour-ui/types';
import { UserTourTypes } from '@usertour-ui/types';
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

    this.socket = io(baseUri, this.options.socketConfig);
    this.setupErrorHandling();
  }

  /**
   * Setup error handling for socket events
   */
  private setupErrorHandling(): void {
    this.socket.on('connect_error', (error) => {
      console.error('[usertour] Socket connection error:', error);
      // this.trigger('error', error);
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
      console.error(`[usertour] Error emitting event ${event}:`, error);
      // this.trigger('error', error);
      // throw error;
      return undefined;
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
   * Get SDK configuration
   * @param token - Authentication token
   * @returns Promise with SDK configuration
   */
  async getConfig(token: string): Promise<SDKConfig> {
    const response = await this.emitWithTimeout('get-config', { token });
    return response as SDKConfig;
  }

  /**
   * List available themes
   * @param params - Parameters including authentication token
   * @returns Promise with array of themes
   */
  async listThemes(params: { token: string }): Promise<Theme[]> {
    const response = await this.emitWithTimeout('list-themes', params);
    if (!Array.isArray(response)) {
      return [];
    }
    return response as Theme[];
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
  }): Promise<BizSession> {
    const response = await this.emitWithTimeout('create-session', params);
    return response as BizSession;
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
  }): Promise<void> {
    await this.emitWithTimeout('track-event', params);
  }
}

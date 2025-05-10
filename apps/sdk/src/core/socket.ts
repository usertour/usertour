import {
  BizCompany,
  BizIntegration,
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

interface SocketOptions {
  wsUri: string;
  socketConfig?: Partial<ManagerOptions & SocketIOOptions>;
}

export class Socket extends Evented {
  private readonly socket: SocketIO;
  private readonly options: SocketOptions;

  constructor(options: SocketOptions) {
    super();
    autoBind(this);

    const resolvedUrl = new URL(options.wsUri, window.location.origin);
    const baseUri = resolvedUrl.origin;

    let basePath = resolvedUrl.pathname;
    if (basePath !== '/' && basePath.endsWith('/')) {
      basePath = basePath.slice(0, -1);
    }
    if (basePath === '/') {
      basePath = '';
    }

    const ioPathSegment = (options.socketConfig?.path || '/socket.io/').replace(/^\/+|\/+$/g, '');

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

  private setupErrorHandling(): void {
    this.socket.on('connect_error', (error) => {
      this.trigger('error', error);
    });
  }

  private async emitWithTimeout<T>(event: string, data: any): Promise<T> {
    try {
      return await this.socket.emitWithAck(event, data);
    } catch (error) {
      this.trigger('error', error);
      throw error;
    }
  }

  async upsertUser(params: {
    userId: string;
    attributes?: UserTourTypes.Attributes;
    token: string;
  }): Promise<BizUserInfo | undefined> {
    const response = await this.emitWithTimeout('upsert-user', params);
    return response as BizUserInfo;
  }

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

  async listContents(params: {
    token: string;
    mode: SDKSettingsMode;
    userId?: string;
    contentId?: string;
    versionId?: string;
  }): Promise<SDKContent[]> {
    const response = await this.emitWithTimeout('list-contents', params);
    if (!Array.isArray(response)) {
      return [];
    }
    return response as SDKContent[];
  }

  async getConfig(token: string): Promise<SDKConfig> {
    const response = await this.emitWithTimeout('get-config', { token });
    return response as SDKConfig;
  }

  async listThemes(params: { token: string }): Promise<Theme[]> {
    const response = await this.emitWithTimeout('list-themes', params);
    if (!Array.isArray(response)) {
      return [];
    }
    return response as Theme[];
  }

  async createSession(params: {
    userId: string;
    token: string;
    contentId: string;
    companyId?: string;
  }): Promise<BizSession> {
    const response = await this.emitWithTimeout('create-session', params);
    return response as BizSession;
  }

  async trackEvent(params: {
    userId: string;
    token: string;
    eventName: string;
    sessionId: string;
    eventData: any;
  }): Promise<any> {
    const response = await this.emitWithTimeout('track-event', params);
    return response as any;
  }

  async listEnabledIntegrations(token: string): Promise<BizIntegration[]> {
    const response = await this.emitWithTimeout('list-enabled-integrations', token);
    return response as BizIntegration[];
  }
}
